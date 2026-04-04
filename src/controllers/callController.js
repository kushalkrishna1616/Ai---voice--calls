const Call = require('../models/Call');
const Transcript = require('../models/Transcript');
const twilioService = require('../services/twilioService');
const speechToTextService = require('../services/speechToTextService');
const aiService = require('../services/aiService');
const logger = require('../config/logger');
const { getRedisClient } = require('../config/redis');

// In-memory fallback for Development
const memorySessions = new Map();

class CallController {
  /**
   * Handle incoming call webhook - ULTRA STABLE
   */
  async handleIncomingCall(req, res) {
    try {
      const { CallSid, From, To } = req.body;
      logger.info(`🚨 CALL RECEIVED (Phase 1): ${CallSid}`);

      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const baseUrl = `${protocol}://${host}`;
      
      // ANSWER TWILIO IMMEDIATELY
      const twiml = twilioService.generateWelcomeResponse(baseUrl);
      res.type('text/xml');
      res.send(twiml);

      // Background Logging & Session Init
      const callData = {
        callSid: CallSid,
        callerNumber: From,
        recipientNumber: To,
        conversation: [],
        status: 'in-progress',
        createdAt: new Date()
      };

      // Store in memory for immediate dev use
      memorySessions.set(CallSid, callData);
      
      try {
        const savedCall = await Call.create(callData);
        callData.callId = savedCall._id;
        memorySessions.set(CallSid, callData);
        logger.info(`✅ Call saved to DB: ${savedCall._id}`);
      } catch (dbError) {
        logger.error(`❌ Database save failed: ${dbError.message}`);
      }

    } catch (error) {
      res.type('text/xml');
      res.send('<Response><Say>AI Link Active.</Say><Record action="/api/v1/calls/process-recording"/></Response>');
    }
  }

  /**
   * Process recording - ZERO FILE FETCH VERSION
   * Instead of generating an MP3 and asking Twilio to download it,
   * we just send the text and let Twilio speak it natively.
   */
  async processRecording(req, res) {
    try {
      const { CallSid, RecordingUrl } = req.body;
      const audioUrl = RecordingUrl + '.mp3';

      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const baseUrl = `${protocol}://${host}`;

      // 1. Convert Audio to Text
      const transcription = await speechToTextService.transcribeAudioFromUrl(audioUrl);
      
      // 2. Generate AI Text Response
      let callContext = memorySessions.get(CallSid);

      if (!callContext) {
        const redisClient = getRedisClient();
        if (redisClient) {
            const cached = await redisClient.get(`call:${CallSid}`);
            if (cached) callContext = JSON.parse(cached);
        }
      }
      
      if (!callContext) {
          const call = await Call.findOne({ callSid: CallSid });
          if (call) callContext = { callId: call._id, conversation: call.conversation || [] };
      }

      if (!callContext) {
        logger.warn(`Session ${CallSid} not found in memory/DB. Initializing new fallback.`);
        callContext = { conversation: [] };
      }

      const aiResponse = await aiService.generateResponse(callContext.conversation, transcription.text);
      const shouldContinue = !aiService.shouldEndConversation(aiResponse.message);

      // 3. MASTER FIX: SEND TEXT NATIVELY (Instant, no file download required)
      const twiml = twilioService.generateGatherResponse(aiResponse.message, shouldContinue, baseUrl);
      
      res.type('text/xml');
      res.send(twiml);

      // 4. Background History Save
      const userMsg = { role: 'user', content: transcription.text, timestamp: new Date() };
      const aiMsg = { role: 'assistant', content: aiResponse.message, timestamp: new Date() };
      callContext.conversation.push(userMsg, aiMsg);
      
      // Save back to memory map
      memorySessions.set(CallSid, callContext);

      if (callContext.callId) {
        Call.findByIdAndUpdate(callContext.callId, { conversation: callContext.conversation }).catch(() => {});
      }

    } catch (error) {
      logger.error('Stable Response Fallback:', error);
      res.type('text/xml');
      res.send(`<Response><Say>I didn't quite catch that. Can you repeat?</Say><Record action="/api/v1/calls/process-recording"/></Response>`);
    }
  }

  /**
   * Process speech results from <Gather> - LOW LATENCY VERSION
   */
  async processSpeech(req, res) {
    try {
      const { CallSid, SpeechResult, Confidence } = req.body;
      logger.info(`🚨 SPEECH RECEIVED: "${SpeechResult}" (${Confidence})`);

      if (!SpeechResult) {
        // No speech detected, prompt again
        const twiml = twilioService.generateGatherResponse("I'm sorry, I didn't hear anything. Could you please repeat that?", true, this._getBaseUrl(req));
        res.type('text/xml');
        return res.send(twiml);
      }

      const baseUrl = this._getBaseUrl(req);
      
      // 1. Context Lookup
      let callContext = memorySessions.get(CallSid);

      if (!callContext) {
        const redisClient = getRedisClient();
        if (redisClient) {
            const cached = await redisClient.get(`call:${CallSid}`);
            if (cached) callContext = JSON.parse(cached);
        }
      }
      
      if (!callContext) {
          const call = await Call.findOne({ callSid: CallSid });
          if (call) callContext = { callId: call._id, conversation: call.conversation || [] };
      }

      if (!callContext) {
        logger.warn(`Session ${CallSid} not found in processSpeech. Initializing fallback.`);
        callContext = { conversation: [] };
      }

      // 2. Generate AI Response
      const aiResponse = await aiService.generateResponse(callContext.conversation, SpeechResult);
      const shouldContinue = !aiService.shouldEndConversation(aiResponse.message);

      // 3. Send back Gather TwiML
      const twiml = twilioService.generateGatherResponse(aiResponse.message, shouldContinue, baseUrl);
      res.type('text/xml');
      res.send(twiml);

      // 4. Background History Save
      const userMsg = { role: 'user', content: SpeechResult, timestamp: new Date() };
      const aiMsg = { role: 'assistant', content: aiResponse.message, timestamp: new Date() };
      callContext.conversation.push(userMsg, aiMsg);
      
      // Save back to memory map
      memorySessions.set(CallSid, callContext);

      if (callContext.callId) {
        Call.findByIdAndUpdate(callContext.callId, { conversation: callContext.conversation }).catch(() => {});
      }

    } catch (error) {
      logger.error('Process Speech Error:', error);
      res.type('text/xml');
      res.send(`<Response><Say>Connection glitch. One moment.</Say><Gather input="speech" action="/api/v1/calls/process-speech"><Say>Please try again.</Say></Gather></Response>`);
    }
  }

  _getBaseUrl(req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${protocol}://${host}`;
  }

  async handleCallStatus(req, res) { res.sendStatus(200); }
  async getCall(req, res) {
    try {
      const call = await Call.findById(req.params.id);
      if (!call) return res.status(404).json({ success: false, message: 'Call not found' });
      res.json({ success: true, data: call });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async deleteCall(req, res) {
    try {
      await Call.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: 'Call deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getCalls(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const calls = await Call.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
      const total = await Call.countDocuments();

      res.json({ 
        success: true, 
        data: calls,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new CallController();
