const Call = require('../models/Call');
const Transcript = require('../models/Transcript');
const twilioService = require('../services/twilioService');
const speechToTextService = require('../services/speechToTextService');
const aiService = require('../services/aiService');
const textToSpeechService = require('../services/textToSpeechService');
const logger = require('../config/logger');
const { getRedisClient } = require('../config/redis');

class CallController {
  /**
   * Handle incoming call webhook
   */
  async handleIncomingCall(req, res) {
    try {
      const { CallSid, From, To, CallStatus } = req.body;

      logger.info(`Incoming call: ${CallSid} from ${From}`);

      // Create call record
      const call = await Call.create({
        callSid: CallSid,
        callerNumber: From,
        recipientNumber: To,
        status: 'in-progress',
        direction: 'inbound'
      });

      // Create transcript record
      await Transcript.create({
        callId: call._id,
        callSid: CallSid,
        processingStatus: 'pending'
      });

      // Store call context in Redis for quick access
      try {
        const redisClient = getRedisClient();
        if (redisClient) {
          await redisClient.setEx(
            `call:${CallSid}`,
            3600, // 1 hour TTL
            JSON.stringify({ callId: call._id, conversation: [] })
          );
        }
      } catch (error) {
        logger.warn('Redis unavailable, continuing without cache');
      }

      // Emit real-time update via Socket.IO
      const io = req.app.get('io');
      io.emit('call:new', {
        callId: call._id,
        callSid: CallSid,
        from: From,
        timestamp: new Date()
      });

      // Generate welcome TwiML response
      const twiml = twilioService.generateWelcomeResponse();
      
      res.type('text/xml');
      res.send(twiml);

    } catch (error) {
      logger.error('Error handling incoming call:', error);
      res.status(500).send('Error processing call');
    }
  }

  /**
   * Process recorded audio from caller
   */
  async processRecording(req, res) {
    try {
      const { CallSid, RecordingUrl, RecordingDuration } = req.body;

      logger.info(`Processing recording for call: ${CallSid}`);

      // Get call context from Redis or database
      let callContext;
      try {
        const redisClient = getRedisClient();
        if (redisClient) {
          const cached = await redisClient.get(`call:${CallSid}`);
          if (cached) {
            callContext = JSON.parse(cached);
          }
        }
      } catch (error) {
        logger.warn('Failed to get from Redis, fetching from DB');
      }

      if (!callContext) {
        const call = await Call.findOne({ callSid: CallSid });
        if (!call) {
          throw new Error('Call not found');
        }
        callContext = {
          callId: call._id,
          conversation: call.conversation || []
        };
      }

      // Download and transcribe audio
      const audioUrl = RecordingUrl + '.mp3';
      const transcription = await speechToTextService.transcribeAudioFromUrl(audioUrl);

      // Add user message to conversation
      const userMessage = {
        role: 'user',
        content: transcription.text,
        timestamp: new Date(),
        audioUrl: audioUrl,
        duration: parseInt(RecordingDuration)
      };

      callContext.conversation.push(userMessage);

      // Generate AI response
      const aiResponse = await aiService.generateResponse(
        callContext.conversation,
        transcription.text
      );

      // Convert AI response to speech
      const ttsAudio = await textToSpeechService.textToSpeech(aiResponse.message);

      // Add AI message to conversation
      const assistantMessage = {
        role: 'assistant',
        content: aiResponse.message,
        timestamp: new Date(),
        audioUrl: ttsAudio.url
      };

      callContext.conversation.push(assistantMessage);

      // Update call in database
      await Call.findByIdAndUpdate(callContext.callId, {
        conversation: callContext.conversation,
        $set: { 'metadata.lastActivity': new Date() }
      });

      // Update transcript
      await Transcript.findOneAndUpdate(
        { callSid: CallSid },
        {
          $push: {
            segments: [
              {
                speaker: 'caller',
                text: transcription.text,
                timestamp: userMessage.timestamp,
                duration: userMessage.duration,
                audioUrl: audioUrl
              },
              {
                speaker: 'ai-agent',
                text: aiResponse.message,
                timestamp: assistantMessage.timestamp,
                audioUrl: ttsAudio.url
              }
            ]
          }
        }
      );

      // Update Redis cache
      try {
        const redisClient = getRedisClient();
        if (redisClient) {
          await redisClient.setEx(
            `call:${CallSid}`,
            3600,
            JSON.stringify(callContext)
          );
        }
      } catch (error) {
        logger.warn('Failed to update Redis cache');
      }

      // Emit real-time update
      const io = req.app.get('io');
      io.emit('call:message', {
        callId: callContext.callId,
        callSid: CallSid,
        message: {
          user: transcription.text,
          assistant: aiResponse.message
        }
      });

      // Determine if conversation should continue
      const shouldContinue = !aiService.shouldEndConversation(aiResponse.message);

      // Generate TwiML response with AI audio
      const fullAudioUrl = `${req.protocol}://${req.get('host')}${ttsAudio.url}`;
      const twiml = twilioService.generateAIResponse(fullAudioUrl, shouldContinue);

      res.type('text/xml');
      res.send(twiml);

    } catch (error) {
      logger.error('Error processing recording:', error);
      
      // Send error response to caller
      const twiml = twilioService.generateGatherResponse(
        'I apologize, but I encountered an error. Please try again.',
        false
      );
      
      res.type('text/xml');
      res.send(twiml);
    }
  }

  /**
   * Handle call status updates
   */
  async handleCallStatus(req, res) {
    try {
      const { CallSid, CallStatus, CallDuration, RecordingUrl, RecordingSid } = req.body;

      logger.info(`Call status update: ${CallSid} - ${CallStatus}`);

      const updateData = {
        status: CallStatus
      };

      if (CallStatus === 'completed') {
        updateData.endTime = new Date();
        updateData.duration = parseInt(CallDuration) || 0;
        
        if (RecordingUrl) {
          updateData.recordingUrl = RecordingUrl;
          updateData.recordingSid = RecordingSid;
        }
      }

      const call = await Call.findOneAndUpdate(
        { callSid: CallSid },
        updateData,
        { new: true }
      );

      if (call && CallStatus === 'completed') {
        // Perform post-call analysis
        this.performPostCallAnalysis(call._id, CallSid);
      }

      // Emit real-time update
      const io = req.app.get('io');
      io.emit('call:status', {
        callId: call?._id,
        callSid: CallSid,
        status: CallStatus
      });

      res.sendStatus(200);

    } catch (error) {
      logger.error('Error handling call status:', error);
      res.sendStatus(500);
    }
  }

  /**
   * Perform post-call analysis (async)
   */
  async performPostCallAnalysis(callId, callSid) {
    try {
      const call = await Call.findById(callId);
      
      if (!call || !call.conversation || call.conversation.length === 0) {
        return;
      }

      // Detect intent
      const userMessages = call.conversation
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
        .join(' ');

      const intent = await aiService.detectIntent(userMessages, call.conversation);

      // Analyze sentiment
      const sentiment = await aiService.analyzeSentiment(call.conversation);

      // Generate summary
      const summary = await aiService.generateSummary(call.conversation);

      // Extract action items
      const actionItems = await aiService.extractActionItems(call.conversation);

      // Update call
      await Call.findByIdAndUpdate(callId, {
        detectedIntent: intent,
        sentiment: sentiment
      });

      // Update transcript
      await Transcript.findOneAndUpdate(
        { callSid: callSid },
        {
          summary: summary,
          actionItems: actionItems.map(item => ({ item, status: 'pending' })),
          processingStatus: 'completed'
        }
      );

      logger.info(`Post-call analysis completed for ${callSid}`);

    } catch (error) {
      logger.error('Error in post-call analysis:', error);
    }
  }

  /**
   * Get all calls with pagination
   */
  async getCalls(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        callerNumber,
        startDate,
        endDate,
        intent
      } = req.query;

      const query = {};

      if (status) query.status = status;
      if (callerNumber) query.callerNumber = callerNumber;
      if (intent) query.detectedIntent = intent;
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const calls = await Call.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

      const total = await Call.countDocuments(query);

      res.json({
        success: true,
        data: calls,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });

    } catch (error) {
      logger.error('Error fetching calls:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching calls'
      });
    }
  }

  /**
   * Get single call details
   */
  async getCall(req, res) {
    try {
      const { id } = req.params;

      const call = await Call.findById(id);

      if (!call) {
        return res.status(404).json({
          success: false,
          message: 'Call not found'
        });
      }

      res.json({
        success: true,
        data: call
      });

    } catch (error) {
      logger.error('Error fetching call:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching call details'
      });
    }
  }

  /**
   * Delete call
   */
  async deleteCall(req, res) {
    try {
      const { id } = req.params;

      const call = await Call.findByIdAndDelete(id);

      if (!call) {
        return res.status(404).json({
          success: false,
          message: 'Call not found'
        });
      }

      // Delete associated transcript
      await Transcript.deleteOne({ callSid: call.callSid });

      res.json({
        success: true,
        message: 'Call deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting call:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting call'
      });
    }
  }
}

module.exports = new CallController();
