# Deployment Guide

This guide covers deploying the AI Voice Call Automation System to production.

## Prerequisites

- Server with Docker and Docker Compose installed
- Domain name pointed to your server
- SSL certificate (Let's Encrypt recommended)
- All required API keys (Twilio, OpenAI, ElevenLabs)

## Deployment Options

### Option 1: Docker Compose (Recommended)

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Add user to docker group
sudo usermod -aG docker $USER
```

#### 2. Clone and Configure

```bash
# Clone repository
git clone <your-repo-url>
cd ai-voice-call-system

# Configure environment
cp .env.example .env
nano .env  # Edit with your production values

# Important: Set these in production
NODE_ENV=production
MONGODB_URI=mongodb://mongodb:27017/ai-voice-calls
REDIS_HOST=redis
TWILIO_WEBHOOK_URL=https://yourdomain.com/api/v1/calls/webhook
CORS_ORIGIN=https://yourdomain.com
```

#### 3. Build and Deploy

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

#### 4. Set Up Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx -y

# Create configuration
sudo nano /etc/nginx/sites-available/ai-call-system
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration (will be added by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket for Socket.IO
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Recordings
    location /recordings {
        proxy_pass http://localhost:5000;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/ai-call-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

### Option 2: Manual Deployment (Without Docker)

#### 1. Install Dependencies

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Redis
sudo apt install redis-server -y
sudo systemctl start redis
sudo systemctl enable redis
```

#### 2. Deploy Application

```bash
# Clone repository
git clone <your-repo-url>
cd ai-voice-call-system

# Install backend dependencies
npm install --production

# Install frontend dependencies and build
cd client
npm install
npm run build
cd ..

# Configure environment
cp .env.example .env
nano .env  # Edit with production values
```

#### 3. Set Up PM2 Process Manager

```bash
# Install PM2
sudo npm install -g pm2

# Start application
pm2 start server.js --name ai-call-backend

# Configure PM2 to start on boot
pm2 startup
pm2 save

# Monitor
pm2 monit
pm2 logs
```

## Post-Deployment Configuration

### 1. Configure Twilio Webhook

1. Go to Twilio Console
2. Select your phone number
3. Update Voice Configuration:
   - Webhook URL: `https://yourdomain.com/api/v1/calls/webhook`
   - HTTP Method: POST

### 2. Set Up Monitoring

```bash
# Install monitoring tools
npm install -g pm2-logrotate

# Configure log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 3. Configure Backup

```bash
# Create backup script
cat > /home/ubuntu/backup-mongodb.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --out=$BACKUP_DIR/mongo_$DATE

# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
EOF

chmod +x /home/ubuntu/backup-mongodb.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-mongodb.sh
```

### 4. Set Up Firewall

```bash
# Configure UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Environment Variables for Production

```env
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/ai-voice-calls

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Twilio
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WEBHOOK_URL=https://yourdomain.com/api/v1/calls/webhook

# OpenAI
OPENAI_API_KEY=sk-xxxxx
OPENAI_MODEL=gpt-4-turbo-preview

# ElevenLabs
ELEVENLABS_API_KEY=your_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Security
JWT_SECRET=your_super_secret_production_key_change_this

# CORS
CORS_ORIGIN=https://yourdomain.com

# Logging
LOG_LEVEL=info
```

## Health Checks

```bash
# Check backend
curl http://localhost:5000/health

# Check frontend
curl http://localhost:3000

# Check MongoDB
mongosh --eval "db.adminCommand('ping')"

# Check Redis
redis-cli ping
```

## Scaling Considerations

### Horizontal Scaling

1. **Multiple Backend Instances**
```bash
# Using PM2
pm2 start server.js -i 4  # 4 instances
```

2. **Load Balancer Configuration**
```nginx
upstream backend {
    least_conn;
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
    server 127.0.0.1:5003;
}
```

### Database Scaling

1. **MongoDB Replica Set**
```bash
# Initialize replica set
mongosh
rs.initiate()
rs.add("mongodb2.example.com:27017")
rs.add("mongodb3.example.com:27017")
```

2. **Redis Sentinel/Cluster**
```bash
# Configure Redis for high availability
# See Redis documentation for clustering
```

## Maintenance

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild Docker images
docker-compose build

# Restart services with zero downtime
docker-compose up -d --no-deps --build backend
docker-compose up -d --no-deps --build frontend
```

### View Logs

```bash
# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend

# PM2 logs
pm2 logs ai-call-backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Backup and Restore

```bash
# Backup MongoDB
mongodump --out=/backup/$(date +%Y%m%d)

# Restore MongoDB
mongorestore /backup/20240101

# Backup recordings
tar -czf recordings-$(date +%Y%m%d).tar.gz recordings/
```

## Troubleshooting Production Issues

### High CPU Usage
```bash
# Check running processes
top
htop

# Check PM2 processes
pm2 monit

# Scale down if needed
pm2 scale ai-call-backend 2
```

### Memory Issues
```bash
# Check memory usage
free -h

# Restart services
docker-compose restart backend

# Or with PM2
pm2 restart ai-call-backend
```

### Database Performance
```bash
# Check slow queries
mongosh
db.setProfilingLevel(2)
db.system.profile.find().limit(5).sort( { ts : -1 } ).pretty()

# Add indexes
db.calls.createIndex({ createdAt: -1 })
```

## Security Checklist

- [ ] SSL/TLS certificate installed
- [ ] Environment variables secured
- [ ] Firewall configured
- [ ] API rate limiting enabled
- [ ] Database authentication enabled
- [ ] Regular backups configured
- [ ] Monitoring and alerts set up
- [ ] Logs rotation configured
- [ ] Security headers added in Nginx
- [ ] CORS properly configured

## Support

For production issues:
1. Check logs first
2. Review monitoring dashboards
3. Consult troubleshooting guide
4. Contact support if needed
