require('dotenv').config();
const mongoose = require('mongoose');
const Call = require('../src/models/Call');
const Transcript = require('../src/models/Transcript');
const Analytics = require('../src/models/Analytics');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-voice-calls';

const speakers = ['Customer', 'AI Agent'];
const intents = ['billing_inquiry', 'technical_support', 'account_management', 'product_inquiry', 'complaint', 'general_inquiry', 'appointment'];
const sentiments = ['positive', 'neutral', 'negative'];

const transcripts = [
  "Hello, I'm calling because I see an extra charge on my bill. Can you explain why my monthly rate went up by $10?",
  "Hi, I'm having trouble connecting my device to the Wi-Fi. Every time I try, it says 'Incorrect Password' even though I'm sure it's correct.",
  "I'd like to schedule an appointment for maintenance on my heating system. It's making a strange rattling noise.",
  "Your service has been terrible lately! This is the third time this week my internet has gone down. I want to cancel my subscription.",
  "What's the difference between your Basic plan and the Premium plan? I'm thinking about upgrading my account.",
  "I need to change the email address associated with my account. Can you help me with that?",
  "Thank you so much for fixing my issue earlier today. The technician was very professional and helpful."
];

async function seedData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB.');

    // Clear existing data
    console.log('Cleaning up existing data...');
    await Call.deleteMany({});
    await Transcript.deleteMany({});
    await Analytics.deleteMany({});

    const calls = [];
    const now = new Date();

    for (let i = 0; i < 20; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - Math.floor(Math.random() * 7)); // Recent 7 days
      date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

      const duration = Math.floor(Math.random() * 180) + 30; // 30s to 210s
      const intent = intents[Math.floor(Math.random() * intents.length)];
      const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
      const callerNumber = `+1${Math.floor(Math.random() * 900) + 100}${Math.floor(Math.random() * 9000000) + 1000000}`;

      const call = new Call({
        callSid: `CA${Math.random().toString(36).substring(7).toUpperCase()}`,
        callerNumber,
        recipientNumber: process.env.TWILIO_PHONE_NUMBER || '+15550001234',
        status: 'completed',
        duration,
        detectedIntent: intent,
        sentiment,
        createdAt: date,
        endTime: new Date(date.getTime() + duration * 1000)
      });

      const conversation = [];
      const userMsg = transcripts[Math.floor(Math.random() * transcripts.length)];
      
      conversation.push({ role: 'user', content: userMsg, timestamp: date });
      conversation.push({ 
        role: 'assistant', 
        content: "I understand your concern. I can certainly help you with that. Let me look up your account details.", 
        timestamp: new Date(date.getTime() + 2000) 
      });

      call.conversation = conversation;
      const savedCall = await call.save();
      calls.push(savedCall);

      // Create transcript
      const transcript = new Transcript({
        callId: savedCall._id,
        callSid: savedCall.callSid,
        fullTranscript: `User: ${userMsg}\nAssistant: I understand your concern. I can certainly help you with that. Let me look up your account details.`,
        summary: `The customer called regarding a ${intent.replace('_', ' ')}. Sentiment was ${sentiment}.`,
        createdAt: date
      });
      await transcript.save();
    }

    console.log(`Successfully seeded ${calls.length} calls and transcripts.`);

    // Seed some analytics
    for (let i = 0; i < 7; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0,0,0,0);

        const dailyCalls = Math.floor(Math.random() * 10) + 5;
        
        const analytics = new Analytics({
            date: date,
            totalCalls: dailyCalls,
            completedCalls: dailyCalls,
            failedCalls: 0,
            averageDuration: Math.floor(Math.random() * 100) + 50,
            intentBreakdown: {
                billing: Math.floor(Math.random() * 5),
                support: Math.floor(Math.random() * 5)
            }
        });
        await analytics.save();
    }

    console.log('Successfully seeded analytics.');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
