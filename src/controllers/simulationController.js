const AIService = require('../services/aiService');
const Call = require('../models/Call');
const logger = require('../config/logger');

/**
 * Handle simulated call from the dashboard
 */
exports.simulateCall = async (req, res, next) => {
  try {
    const { message, conversationHistory } = req.body;
    
    // 1. Get response from Grok
    const aiResponse = await AIService.generateResponse(conversationHistory, message);
    
    // 2. Detect intent
    const intent = await AIService.detectIntent(message);
    
    // 3. (Optional) Create a mock call record in DB if it's the first message
    try {
      if (!conversationHistory || conversationHistory.length === 0) {
        await Call.create({
          callSid: 'SIM_' + Date.now(),
          callerNumber: '+16812756393',
          status: 'in-progress',
          direction: 'inbound',
          startTime: new Date()
        });
      }
    } catch (dbError) {
      logger.warn('Could not create mock call record (MongoDB probably disconnected)');
    }

    res.status(200).json({
      success: true,
      data: {
        message: aiResponse.message,
        intent: intent
      }
    });
  } catch (error) {
    logger.error('Simulation error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
