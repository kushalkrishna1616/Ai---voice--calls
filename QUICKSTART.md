# Quick Start Guide

Get the AI Voice Call Automation System up and running in 10 minutes!

## Prerequisites

- Node.js 18+ installed
- MongoDB installed and running
- Redis installed and running (optional but recommended)
- Twilio account
- OpenAI API key
- ElevenLabs API key

## Step 1: Install Dependencies

```bash
# Clone or extract the project
cd ai-voice-call-system

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

## Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
nano .env
```

**Minimum required configuration:**
```env
# Twilio
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI
OPENAI_API_KEY=sk-your_key_here

# ElevenLabs
ELEVENLABS_API_KEY=your_key_here
```

## Step 3: Start MongoDB and Redis

```bash
# Start MongoDB
sudo systemctl start mongod

# Start Redis (optional)
sudo systemctl start redis
```

Or using Docker:
```bash
docker run -d -p 27017:27017 --name mongodb mongo:7.0
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

## Step 4: Run the Application

**Option A: Development Mode (Two terminals)**

Terminal 1 - Backend:
```bash
npm run dev
```

Terminal 2 - Frontend:
```bash
cd client
npm start
```

**Option B: Docker (One command)**

```bash
docker-compose up
```

## Step 5: Access the Dashboard

Open your browser and go to:
```
http://localhost:3000
```

You should see the AI Call System Dashboard!

## Step 6: Configure Twilio Webhook (for testing)

For local development, use ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok tunnel
ngrok http 5000

# Copy the https URL (e.g., https://abc123.ngrok.io)
```

Then in Twilio Console:
1. Go to Phone Numbers → Manage → Active numbers
2. Click your number
3. Under "Voice Configuration":
   - A Call Comes In: **Webhook**
   - URL: `https://abc123.ngrok.io/api/v1/calls/webhook`
   - HTTP: **POST**
4. Save

## Step 7: Test a Call

1. Call your Twilio number
2. The AI agent will answer and greet you
3. Speak your message
4. The AI will respond
5. Check the dashboard for the call logs!

## Troubleshooting

**Backend won't start?**
- Check MongoDB is running: `mongosh --eval "db.adminCommand('ping')"`
- Check .env file has all required variables
- Check logs in `logs/` directory

**Frontend shows errors?**
- Make sure backend is running on port 5000
- Check browser console for errors
- Clear browser cache and refresh

**Calls not connecting?**
- Verify Twilio webhook URL is correct
- Check ngrok is running (for local dev)
- View Twilio debugger for webhook errors

**No audio/transcription?**
- Verify OpenAI API key is valid
- Verify ElevenLabs API key is valid
- Check API credit balances

## Next Steps

- Read [README.md](README.md) for full documentation
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
- Check [SCALABILITY.md](SCALABILITY.md) for scaling strategies

## Common Commands

```bash
# View backend logs
npm run dev

# Build frontend for production
cd client && npm run build

# Run with Docker
docker-compose up -d

# View Docker logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Need Help?

- Check the logs in `logs/combined.log`
- Review error messages in the console
- Consult the full README for detailed info
- Check API service status pages

Enjoy your AI Call Automation System! 🎉
