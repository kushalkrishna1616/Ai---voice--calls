# Scalability Architecture

This document outlines strategies for scaling the AI Voice Call Automation System to handle thousands of concurrent calls.

## Current Architecture

```
┌─────────────┐
│   Clients   │
└──────┬──────┘
       │
┌──────▼──────┐
│    Nginx    │  (Reverse Proxy)
└──────┬──────┘
       │
┌──────▼──────┐
│   Express   │  (Single Instance)
└──────┬──────┘
       │
┌──────▼──────────┬─────────┐
│    MongoDB      │  Redis  │
└─────────────────┴─────────┘
```

## Scalable Architecture

```
                    ┌─────────────┐
                    │   Clients   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │     CDN     │  (Static Assets)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │Load Balancer│  (HAProxy/Nginx)
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │Express 1│       │Express 2│       │Express 3│
   └────┬────┘       └────┬────┘       └────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │ Worker 1│       │ Worker 2│       │ Worker 3│  (Bull Queue Workers)
   └────┬────┘       └────┬────┘       └────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │MongoDB  │       │  Redis  │       │   S3    │  (Recordings)
   │Replica  │       │ Cluster │       └─────────┘
   │  Set    │       └─────────┘
   └─────────┘
```

## Scaling Strategies

### 1. Horizontal Scaling - Application Servers

#### Multiple Node.js Instances

**Using PM2:**
```bash
# Start with cluster mode
pm2 start server.js -i max

# Or specific number of instances
pm2 start server.js -i 4
```

**Using Docker Swarm:**
```yaml
version: '3.8'
services:
  backend:
    image: ai-call-backend
    deploy:
      replicas: 5
      update_config:
        parallelism: 2
        delay: 10s
      restart_policy:
        condition: on-failure
```

**Using Kubernetes:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-call-backend
spec:
  replicas: 5
  selector:
    matchLabels:
      app: ai-call-backend
  template:
    metadata:
      labels:
        app: ai-call-backend
    spec:
      containers:
      - name: backend
        image: ai-call-backend:latest
        ports:
        - containerPort: 5000
        resources:
          limits:
            memory: "1Gi"
            cpu: "1000m"
          requests:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  selector:
    app: ai-call-backend
  ports:
  - port: 5000
    targetPort: 5000
  type: LoadBalancer
```

### 2. Load Balancing

#### HAProxy Configuration

```
global
    maxconn 4096
    
defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend http-in
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/domain.pem
    default_backend backend-servers

backend backend-servers
    balance leastconn
    option httpchk GET /health
    server backend1 10.0.1.1:5000 check
    server backend2 10.0.1.2:5000 check
    server backend3 10.0.1.3:5000 check
    server backend4 10.0.1.4:5000 check
```

#### Nginx Load Balancer

```nginx
upstream backend {
    least_conn;
    
    server backend1.example.com:5000 max_fails=3 fail_timeout=30s;
    server backend2.example.com:5000 max_fails=3 fail_timeout=30s;
    server backend3.example.com:5000 max_fails=3 fail_timeout=30s;
    
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 3. Queue System for Asynchronous Processing

#### Bull Queue Implementation

**Create Queue Service:**
```javascript
// src/queues/callProcessingQueue.js
const Queue = require('bull');
const logger = require('../config/logger');

const callProcessingQueue = new Queue('call-processing', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

// Process jobs
callProcessingQueue.process(5, async (job) => {
  const { callId, audioUrl } = job.data;
  
  try {
    // Transcribe audio
    const transcription = await speechToTextService.transcribeAudioFromUrl(audioUrl);
    
    // Generate AI response
    const aiResponse = await aiService.generateResponse([], transcription.text);
    
    // Generate TTS
    const ttsAudio = await textToSpeechService.textToSpeech(aiResponse.message);
    
    // Update database
    await Call.findByIdAndUpdate(callId, {
      $push: {
        conversation: [
          { role: 'user', content: transcription.text },
          { role: 'assistant', content: aiResponse.message }
        ]
      }
    });
    
    return { success: true };
  } catch (error) {
    logger.error('Queue processing error:', error);
    throw error;
  }
});

// Job events
callProcessingQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed`);
});

callProcessingQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err);
});

module.exports = callProcessingQueue;
```

**Add Jobs to Queue:**
```javascript
// In controller
const callProcessingQueue = require('../queues/callProcessingQueue');

async function processRecording(req, res) {
  const { CallSid, RecordingUrl } = req.body;
  
  // Add to queue instead of processing immediately
  await callProcessingQueue.add({
    callId: call._id,
    audioUrl: RecordingUrl
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  });
  
  res.status(202).json({ message: 'Processing queued' });
}
```

**Worker Service:**
```javascript
// worker.js
const callProcessingQueue = require('./src/queues/callProcessingQueue');
const logger = require('./src/config/logger');

logger.info('Worker started');

// Graceful shutdown
process.on('SIGTERM', async () => {
  await callProcessingQueue.close();
  process.exit(0);
});
```

### 4. Database Scaling

#### MongoDB Replica Set

```javascript
// Update connection string
const MONGODB_URI = 'mongodb://mongo1:27017,mongo2:27017,mongo3:27017/ai-voice-calls?replicaSet=rs0';

// Connection with read preference
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  readPreference: 'secondaryPreferred' // Read from secondaries when possible
});
```

#### MongoDB Sharding (For Very Large Scale)

```javascript
// Shard key on callSid for even distribution
sh.shardCollection("ai-voice-calls.calls", { callSid: "hashed" });
```

#### Database Indexing Strategy

```javascript
// Optimize queries with proper indexes
callSchema.index({ callSid: 1 }, { unique: true });
callSchema.index({ callerNumber: 1, createdAt: -1 });
callSchema.index({ status: 1, createdAt: -1 });
callSchema.index({ detectedIntent: 1 });
callSchema.index({ createdAt: -1 });

// Text index for search
transcriptSchema.index({ fullTranscript: 'text' });

// Compound indexes for analytics
callSchema.index({ createdAt: 1, status: 1, detectedIntent: 1 });
```

### 5. Caching Strategy

#### Redis Caching Implementation

```javascript
// src/middleware/cache.js
const { getRedisClient } = require('../config/redis');

const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    const redis = getRedisClient();
    
    if (!redis) return next();
    
    try {
      const cached = await redis.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      // Store original res.json
      const originalJson = res.json.bind(res);
      
      // Override res.json
      res.json = (data) => {
        redis.setEx(key, duration, JSON.stringify(data));
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      next();
    }
  };
};

// Use in routes
router.get('/analytics/dashboard', cacheMiddleware(60), analyticsController.getDashboardStats);
```

#### Cache Invalidation

```javascript
// Invalidate on updates
async function updateCall(callId, data) {
  await Call.findByIdAndUpdate(callId, data);
  
  // Invalidate related caches
  const redis = getRedisClient();
  if (redis) {
    await redis.del('cache:/api/v1/analytics/dashboard');
    await redis.del(`cache:/api/v1/calls/${callId}`);
  }
}
```

### 6. CDN for Static Assets

```javascript
// Store recordings on S3 instead of local filesystem
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

async function uploadToS3(filePath, fileName) {
  const fileContent = fs.readFileSync(filePath);
  
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: `recordings/${fileName}`,
    Body: fileContent,
    ContentType: 'audio/mpeg',
    ACL: 'public-read'
  };
  
  const result = await s3.upload(params).promise();
  return result.Location; // CDN URL
}
```

### 7. WebSocket Scaling

#### Socket.IO with Redis Adapter

```javascript
const io = require('socket.io')(server);
const redisAdapter = require('socket.io-redis');

io.adapter(redisAdapter({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
}));

// Now Socket.IO works across multiple instances
```

### 8. Monitoring and Auto-Scaling

#### Prometheus Metrics

```javascript
// src/middleware/metrics.js
const promClient = require('prom-client');

const register = new promClient.Registry();

// Metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const callsProcessed = new promClient.Counter({
  name: 'calls_processed_total',
  help: 'Total number of calls processed',
  labelNames: ['status'],
  registers: [register]
});

module.exports = { register, httpRequestDuration, callsProcessed };
```

#### Auto-Scaling with Kubernetes

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-call-backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Performance Benchmarks

### Target Metrics

- **Concurrent Calls**: 1,000+
- **Response Time**: < 2 seconds
- **Availability**: 99.9%
- **Database Query Time**: < 100ms (p95)
- **Queue Processing Time**: < 5 seconds

### Capacity Planning

| Component | Small (100 calls/day) | Medium (1,000 calls/day) | Large (10,000+ calls/day) |
|-----------|----------------------|--------------------------|---------------------------|
| App Servers | 1 instance | 3-5 instances | 10-20 instances |
| MongoDB | Single | 3-node replica | Sharded cluster |
| Redis | Single | Sentinel (3 nodes) | Cluster (6+ nodes) |
| Workers | 2 | 5-10 | 20-50 |
| Storage | Local | S3 | S3 + CloudFront |

## Cost Optimization

1. **Auto-scaling**: Scale down during off-peak hours
2. **Spot Instances**: Use for worker nodes
3. **Reserved Instances**: For baseline capacity
4. **API Cost Management**: Cache API responses, batch requests
5. **Storage Tiering**: Move old recordings to cheaper storage

## Disaster Recovery

1. **Database Backups**: Automated daily backups
2. **Multi-Region Deployment**: Active-passive setup
3. **Health Checks**: Automated failover
4. **Data Replication**: Real-time replication to backup region

## Implementation Roadmap

### Phase 1: Foundation (Current)
- Single instance deployment
- Basic monitoring

### Phase 2: Horizontal Scaling
- Multiple app instances
- Load balancer
- Redis caching

### Phase 3: Queue System
- Bull queue implementation
- Worker processes
- Async processing

### Phase 4: Database Scaling
- MongoDB replica set
- Read/write splitting
- Advanced indexing

### Phase 5: Advanced Features
- Auto-scaling
- Multi-region
- CDN integration
- Advanced monitoring

## Conclusion

This architecture can scale from handling dozens to thousands of concurrent calls by progressively implementing these strategies based on actual load requirements.
