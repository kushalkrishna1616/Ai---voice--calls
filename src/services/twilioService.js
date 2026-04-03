const twilio = require('twilio');
const logger = require('../config/logger');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

let client;
try {
  if (accountSid && accountSid.startsWith('AC')) {
    client = twilio(accountSid, authToken);
  } else {
    logger.warn('Twilio Account SID is missing or invalid (must start with AC). Twilio services will be limited.');
  }
} catch (error) {
  logger.error('Failed to initialize Twilio client:', error.message);
}

const VoiceResponse = twilio.twiml.VoiceResponse;

class TwilioService {
  /**
   * Generate TwiML response for incoming call
   */
  static generateWelcomeResponse() {
    const twiml = new VoiceResponse();
    
    twiml.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, 'Hello! Thank you for calling. How can I assist you today?');
    
    // Record the caller's response
    twiml.record({
      timeout: 5,
      transcribe: false,
      maxLength: 30,
      playBeep: true,
      action: '/api/v1/calls/process-recording',
      method: 'POST'
    });

    return twiml.toString();
  }

  /**
   * Generate TwiML response with AI-generated speech
   */
  static generateAIResponse(audioUrl, continueConversation = true) {
    const twiml = new VoiceResponse();
    
    // Play the AI-generated audio
    twiml.play(audioUrl);
    
    if (continueConversation) {
      // Record next user input
      twiml.record({
        timeout: 5,
        transcribe: false,
        maxLength: 30,
        playBeep: false,
        action: '/api/v1/calls/process-recording',
        method: 'POST'
      });
    } else {
      // End the call
      twiml.say({
        voice: 'Polly.Joanna'
      }, 'Thank you for calling. Goodbye!');
      twiml.hangup();
    }

    return twiml.toString();
  }

  /**
   * Generate TwiML to gather user input (alternative to recording)
   */
  static generateGatherResponse(message, continueConversation = true) {
    const twiml = new VoiceResponse();
    
    const gather = twiml.gather({
      input: 'speech',
      timeout: 5,
      action: '/api/v1/calls/process-speech',
      method: 'POST',
      speechTimeout: 'auto'
    });

    gather.say({
      voice: 'Polly.Joanna'
    }, message);

    if (!continueConversation) {
      twiml.hangup();
    }

    return twiml.toString();
  }

  /**
   * Initiate an outbound call
   */
  static async makeOutboundCall(toNumber, callbackUrl) {
    try {
      const call = await client.calls.create({
        to: toNumber,
        from: twilioNumber,
        url: callbackUrl,
        statusCallback: `${callbackUrl}/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        record: true
      });

      logger.info(`Outbound call initiated: ${call.sid}`);
      return call;
    } catch (error) {
      logger.error('Error making outbound call:', error);
      throw error;
    }
  }

  /**
   * Get call details
   */
  static async getCallDetails(callSid) {
    try {
      const call = await client.calls(callSid).fetch();
      return call;
    } catch (error) {
      logger.error(`Error fetching call details for ${callSid}:`, error);
      throw error;
    }
  }

  /**
   * Get call recording
   */
  static async getRecording(recordingSid) {
    try {
      const recording = await client.recordings(recordingSid).fetch();
      return recording;
    } catch (error) {
      logger.error(`Error fetching recording ${recordingSid}:`, error);
      throw error;
    }
  }

  /**
   * Download recording
   */
  static async downloadRecording(recordingSid) {
    try {
      const recording = await this.getRecording(recordingSid);
      const recordingUrl = `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
      return recordingUrl;
    } catch (error) {
      logger.error(`Error downloading recording ${recordingSid}:`, error);
      throw error;
    }
  }

  /**
   * End a call
   */
  static async endCall(callSid) {
    try {
      const call = await client.calls(callSid).update({
        status: 'completed'
      });
      logger.info(`Call ${callSid} ended`);
      return call;
    } catch (error) {
      logger.error(`Error ending call ${callSid}:`, error);
      throw error;
    }
  }

  /**
   * Validate Twilio request signature
   */
  static validateRequest(req) {
    const twilioSignature = req.headers['x-twilio-signature'];
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    
    return twilio.validateRequest(
      authToken,
      twilioSignature,
      url,
      req.body
    );
  }
}

module.exports = TwilioService;
