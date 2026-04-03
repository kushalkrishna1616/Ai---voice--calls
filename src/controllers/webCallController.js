const Call = require('../models/Call');
const Transcript = require('../models/Transcript');
const AIService = require('../services/aiService');
const logger = require('../config/logger');

/**
 * Controller for managing Web Browser based AI Calls (No Phone needed)
 */
class WebCallController {
  /**
   * Initialize a new Web Call session
   */
  async startCall(req, res) {
    try {
      const callSid = 'WEB_' + Math.random().toString(36).substr(2, 9).toUpperCase();
      let callId = 'MOCK_ID_' + Date.now();

      // Attempt to save to DB, but don't block the caller if MongoDB is failing
      try {
        const newCall = await Call.create({
          callSid: callSid,
          type: 'web',
          status: 'in-progress',
          direction: 'inbound',
          startTime: new Date(),
          callerNumber: 'WEB_VISITOR',
          recipientNumber: 'AI_AGENT',
          aiModelUsed: 'llama-3.1-8b-instant',
          ttsProvider: 'browser-speech-synthesis'
        });
        callId = newCall._id;

        await Transcript.create({
          callId: callId,
          callSid: callSid,
          segments: [],
          processingStatus: 'processing'
        });
      } catch (dbError) {
        logger.warn('Could not save web call to MongoDB, continuing as transient session:', dbError.message);
      }

      // Emit real-time update via Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.emit('call:new', {
          callId,
          callSid,
          from: 'WEB_VISITOR',
          timestamp: new Date()
        });
      }

      res.status(201).json({
        success: true,
        data: {
          callId,
          callSid
        }
      });
    } catch (error) {
      logger.error('Failed to start web call:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async sendMessage(req, res) {
    try {
      const { callSid, message, history = [] } = req.body;

      if (!callSid || !message) {
        return res.status(400).json({ success: false, message: 'Missing callSid or message' });
      }

      // 1. Get AI response (High Priority)
      const aiResponse = await AIService.generateResponse(history, message);
      
      // 2. Attempt DB updates (Non-blocking)
      try {
        const [call, transcript] = await Promise.all([
           Call.findOne({ callSid }),
           Transcript.findOne({ callSid })
        ]);

        if (call && transcript) {
          call.conversation.push({ role: 'user', content: message });
          call.conversation.push({ role: 'assistant', content: aiResponse.message });
          transcript.segments.push({ speaker: 'caller', text: message });
          transcript.segments.push({ speaker: 'ai-agent', text: aiResponse.message });

          if (call.conversation.length <= 4) {
             const intent = await AIService.detectIntent(message);
             call.detectedIntent = intent;
          }

          await Promise.all([call.save(), transcript.save()]);
        }
      } catch (dbError) {
        logger.warn('Failed to update DB for web message:', dbError.message);
      }

      // Emit real-time update
      const io = req.app.get('io');
      if (io) {
        io.emit('call:message', {
          callSid: callSid,
          message: {
            user: message,
            assistant: aiResponse.message
          }
        });
      }

      res.status(200).json({
        success: true,
        data: {
          message: aiResponse.message
        }
      });
    } catch (error) {
      logger.error('Error processing web call message:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async endCall(req, res) {
    try {
      const { callSid } = req.body;
      
      try {
        const call = await Call.findOne({ callSid });
        const transcript = await Transcript.findOne({ callSid });

        if (call) {
          call.status = 'completed';
          call.endTime = new Date();
          await call.save();
        }

        if (transcript) {
          transcript.processingStatus = 'completed';
          await transcript.save();
        }
      } catch (dbError) {
        logger.warn('Failed to end call in DB:', dbError.message);
      }

      res.status(200).json({ success: true, message: 'Call ended successfully' });
    } catch (error) {
       logger.error('Error ending web call:', error);
       res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new WebCallController();
