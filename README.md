# AI Voice Call Automation System

A production-ready AI-powered voice call automation system built with the MERN stack. This system automatically answers incoming phone calls, understands callers using speech recognition, generates intelligent responses using AI, and replies with natural voice.

## 🚀 Features

### Core Functionality
- **Automated Call Handling**: Automatically answers incoming calls via Twilio
- **Speech-to-Text**: Converts caller's voice to text using OpenAI Whisper
- **AI Response Generation**: Generates intelligent responses using GPT-4
- **Text-to-Speech**: Converts AI responses to natural voice using ElevenLabs
- **Conversation Flow**: Maintains continuous conversation until call ends
- **Real-time Updates**: Live dashboard updates using Socket.IO

### Data & Analytics
- **Call Logging**: Stores all call data in MongoDB
- **Transcript Storage**: Full conversation transcripts with timestamps
- **Intent Detection**: Automatically detects caller intent
- **Sentiment Analysis**: Analyzes conversation sentiment
- **Analytics Dashboard**: Comprehensive analytics and visualizations
- **Search & Filter**: Search transcripts and filter calls

### Admin Dashboard
- View call history and details
- Read full transcripts
- Analytics and insights (calls per day, average duration, peak hours)
- Caller insights and behavior patterns
- Export data and transcripts

## 🏗️ System Architecture

```
Caller
  ↓
Twilio Voice API
  ↓
Express.js Backend (Webhook)
  ↓
Speech-to-Text (OpenAI Whisper)
  ↓
AI Model (GPT-4)
  ↓
Text-to-Speech (ElevenLabs)
  ↓
Audio Response to Caller
  ↓
MongoDB Storage
  ↓
React Admin Dashboard (Real-time via Socket.IO)
```

## 📦 Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Cache/Queue**: Redis with Bull
- **Real-time**: Socket.IO
- **Logging**: Winston

### APIs & Services
- **Telephony**: Twilio Voice API
- **Speech-to-Text**: OpenAI Whisper API
- **AI/LLM**: OpenAI GPT-4
- **Text-to-Speech**: ElevenLabs API

### Frontend
- **Framework**: React 18
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: React Icons
- **HTTP Client**: Axios

### DevOps
- **Containerization**: Docker & Docker Compose
- **Process Management**: PM2 (optional)
- **Reverse Proxy**: Nginx

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB 7.0+
- Redis 7+
- Docker & Docker Compose (for containerized deployment)
- Twilio Account with Voice API enabled
- OpenAI API Key
- ElevenLabs API Key

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ai-voice-call-system
```

### 2. Backend Setup

```bash
# Install backend dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env and add your API keys and configuration
nano .env
```

### 3. Frontend Setup

```bash
# Navigate to client directory
cd client

# Install frontend dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env if needed
nano .env
```

### 4. Environment Variables

Edit the `.env` file in the root directory:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/ai-voice-calls

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Twilio (Get from https://console.twilio.com)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WEBHOOK_URL=https://your-domain.com/api/v1/calls/webhook

# OpenAI (Get from https://platform.openai.com)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

# ElevenLabs (Get from https://elevenlabs.io)
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Security
JWT_SECRET=your_super_secret_key_here

# CORS
CORS_ORIGIN=http://localhost:3000
```

## 🚀 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```

The backend will run on `http://localhost:5000` and the frontend on `http://localhost:3000`.

### Production Mode with Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

Services will be available at:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- MongoDB: `localhost:27017`
- Redis: `localhost:6379`

## 🔧 Twilio Configuration

### 1. Set Up Twilio Phone Number

1. Go to [Twilio Console](https://console.twilio.com)
2. Purchase a phone number with Voice capabilities
3. Configure the phone number:
   - Voice & Fax → Configure
   - A Call Comes In: **Webhook** `https://your-domain.com/api/v1/calls/webhook`
   - HTTP Method: **POST**

### 2. Webhook URL

For local development, use [ngrok](https://ngrok.com):

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok tunnel
ngrok http 5000

# Use the https URL in Twilio webhook configuration
# Example: https://abc123.ngrok.io/api/v1/calls/webhook
```

## 📁 Project Structure

```
ai-voice-call-system/
├── server.js                 # Main server entry point
├── package.json              # Backend dependencies
├── .env                      # Environment variables
├── Dockerfile               # Backend Docker configuration
├── docker-compose.yml       # Multi-container orchestration
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.js      # MongoDB connection
│   │   ├── redis.js         # Redis connection
│   │   └── logger.js        # Winston logger
│   ├── models/              # Mongoose schemas
│   │   ├── Call.js          # Call model
│   │   ├── Transcript.js    # Transcript model
│   │   └── Analytics.js     # Analytics model
│   ├── controllers/         # Route controllers
│   │   ├── callController.js
│   │   ├── transcriptController.js
│   │   └── analyticsController.js
│   ├── services/            # Business logic
│   │   ├── twilioService.js       # Twilio integration
│   │   ├── speechToTextService.js # OpenAI Whisper
│   │   ├── aiService.js           # GPT-4 integration
│   │   └── textToSpeechService.js # ElevenLabs
│   ├── routes/              # API routes
│   │   ├── callRoutes.js
│   │   ├── transcriptRoutes.js
│   │   └── analyticsRoutes.js
│   ├── middleware/          # Express middleware
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   └── utils/               # Utility functions
├── client/                  # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/      # React components
│   │   │   └── Layout.js
│   │   ├── pages/           # Page components
│   │   │   ├── Dashboard.js
│   │   │   ├── CallList.js
│   │   │   ├── CallDetail.js
│   │   │   ├── Transcripts.js
│   │   │   ├── TranscriptDetail.js
│   │   │   └── Analytics.js
│   │   ├── services/        # API services
│   │   │   └── api.js
│   │   ├── context/         # React context
│   │   │   └── SocketContext.js
│   │   ├── App.js           # Main app component
│   │   └── index.js         # Entry point
│   ├── package.json         # Frontend dependencies
│   └── Dockerfile          # Frontend Docker config
├── logs/                    # Application logs
└── recordings/              # Audio recordings

```

## 🔌 API Endpoints

### Calls
- `POST /api/v1/calls/webhook` - Twilio incoming call webhook
- `POST /api/v1/calls/process-recording` - Process audio recording
- `POST /api/v1/calls/status` - Call status updates
- `GET /api/v1/calls` - Get all calls (with pagination)
- `GET /api/v1/calls/:id` - Get call details
- `DELETE /api/v1/calls/:id` - Delete call

### Transcripts
- `GET /api/v1/transcripts` - Get all transcripts
- `GET /api/v1/transcripts/search?query=` - Search transcripts
- `GET /api/v1/transcripts/:id` - Get transcript details
- `GET /api/v1/transcripts/:id/export` - Export transcript as text
- `GET /api/v1/transcripts/call/:callId` - Get transcript by call ID
- `PUT /api/v1/transcripts/:id` - Update transcript
- `DELETE /api/v1/transcripts/:id` - Delete transcript

### Analytics
- `GET /api/v1/analytics/dashboard?period=7` - Dashboard statistics
- `GET /api/v1/analytics/timeseries?period=30` - Time series data
- `GET /api/v1/analytics/peak-hours?days=30` - Peak hours analysis
- `GET /api/v1/analytics/caller-insights?days=30` - Caller insights
- `GET /api/v1/analytics/intent-analysis?days=30` - Intent analysis
- `GET /api/v1/analytics/export` - Export analytics data
- `POST /api/v1/analytics/generate-daily` - Generate daily metrics

## 📊 Database Schema

### Call Collection
```javascript
{
  callSid: String,
  callerNumber: String,
  recipientNumber: String,
  status: String,
  duration: Number,
  conversation: [{
    role: String,
    content: String,
    timestamp: Date,
    audioUrl: String
  }],
  detectedIntent: String,
  sentiment: String,
  recordingUrl: String,
  createdAt: Date,
  endTime: Date
}
```

### Transcript Collection
```javascript
{
  callId: ObjectId,
  callSid: String,
  segments: [{
    speaker: String,
    text: String,
    timestamp: Date,
    audioUrl: String
  }],
  summary: String,
  actionItems: [{
    item: String,
    status: String
  }],
  fullTranscript: String
}
```

### Analytics Collection
```javascript
{
  date: Date,
  totalCalls: Number,
  completedCalls: Number,
  failedCalls: Number,
  averageDuration: Number,
  intentBreakdown: Map,
  sentimentBreakdown: Object,
  peakHours: Array
}
```

## 🔐 Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **API Keys**: Rotate API keys regularly
3. **Rate Limiting**: Implemented on all API endpoints
4. **Input Validation**: All inputs are validated
5. **Error Handling**: Comprehensive error handling without exposing internals
6. **HTTPS**: Use HTTPS in production
7. **CORS**: Configure appropriate CORS origins

## 📈 Scalability Considerations

### Horizontal Scaling
- Deploy multiple backend instances behind a load balancer
- Use session affinity for WebSocket connections
- MongoDB replica sets for database redundancy

### Queue System (Bull + Redis)
- Process long-running tasks asynchronously
- Handle speech processing in background workers
- Implement job retries and failure handling

### Caching Strategy
- Cache frequently accessed data in Redis
- Implement cache invalidation strategy
- Use CDN for static assets

### Load Balancing
```nginx
upstream backend {
    server backend1:5000;
    server backend2:5000;
    server backend3:5000;
}

server {
    location /api {
        proxy_pass http://backend;
    }
}
```

### Database Optimization
- Create appropriate indexes
- Use aggregation pipelines for analytics
- Implement data archival strategy

## 🧪 Testing

```bash
# Run backend tests
npm test

# Run frontend tests
cd client && npm test
```

## 📝 Logging

Logs are stored in the `logs/` directory:
- `combined.log` - All logs
- `error.log` - Error logs only

Log levels: `error`, `warn`, `info`, `http`, `debug`

## 🐛 Troubleshooting

### Common Issues

**1. Twilio Webhook Not Receiving Calls**
- Ensure webhook URL is publicly accessible
- Check Twilio phone number configuration
- Verify webhook URL is correct (include /api/v1/calls/webhook)

**2. Speech Recognition Failing**
- Check OpenAI API key is valid
- Ensure audio file format is supported
- Verify network connectivity to OpenAI

**3. MongoDB Connection Issues**
- Ensure MongoDB is running
- Check connection string in .env
- Verify network access to MongoDB

**4. Redis Connection Issues**
- Ensure Redis is running
- Check Redis host and port
- Application will continue without Redis (caching disabled)

## 🚀 Deployment

### Deploy to Production

1. **Prepare Environment**
```bash
# Set NODE_ENV to production
export NODE_ENV=production

# Update all API keys and secrets
```

2. **Build Docker Images**
```bash
docker-compose -f docker-compose.yml build
```

3. **Start Services**
```bash
docker-compose up -d
```

4. **Configure Reverse Proxy (Nginx)**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
    }

    location /api {
        proxy_pass http://localhost:5000;
    }
}
```

5. **Set Up SSL (Let's Encrypt)**
```bash
certbot --nginx -d yourdomain.com
```

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📧 Support

For issues and questions:
- Create an issue on GitHub
- Email: support@example.com

## 🙏 Acknowledgments

- Twilio for Voice API
- OpenAI for Whisper and GPT-4
- ElevenLabs for Text-to-Speech
- MongoDB, Redis, and the MERN stack community

---

Built with ❤️ for automated customer service
