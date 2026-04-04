const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Groq = require('groq-sdk');
const logger = require('../config/logger');

class SpeechToTextService {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }

  /**
   * Transcribe audio file using Groq Whisper (Ultra Low Latency)
   */
  async transcribeAudio(audioFilePath, options = {}) {
    try {
      const {
        language = 'en',
        prompt = '',
        temperature = 0
      } = options;

      // Check if file exists
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Audio file not found: ${audioFilePath}`);
      }

      logger.info(`Starting Groq transcription for: ${path.basename(audioFilePath)}`);

      // Call Groq Whisper API
      const transcription = await this.groq.audio.transcriptions.create({
        file: fs.createReadStream(audioFilePath),
        model: 'whisper-large-v3-turbo', // Optimized for speed + quality
        language: language,
        prompt: prompt,
        temperature: temperature,
        response_format: 'json'
      });

      logger.info('Groq Audio transcription successful');
      
      return {
        text: transcription.text,
        language: language,
        duration: null // Groq standard JSON doesn't always provide duration unless verbose_json
      };

    } catch (error) {
      logger.error('Error transcribing audio with Groq:', error.message);
      throw new Error('Failed to transcribe audio: ' + error.message);
    }
  }

  /**
   * Transcribe audio from URL
   */
  async transcribeAudioFromUrl(audioUrl, options = {}) {
    try {
      // Download audio file with Twilio basic auth
      const response = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        auth: {
          username: process.env.TWILIO_ACCOUNT_SID,
          password: process.env.TWILIO_AUTH_TOKEN
        }
      });

      // Save to temporary file
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFileName = `audio_${Date.now()}.mp3`;
      const tempFilePath = path.join(tempDir, tempFileName);
      
      fs.writeFileSync(tempFilePath, response.data);

      // Transcribe
      const transcription = await this.transcribeAudio(tempFilePath, options);

      // Clean up temp file
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        logger.warn('Failed to clean up temp audio file:', err.message);
      }

      return transcription;

    } catch (error) {
      logger.error('Error transcribing audio from URL:', error.message);
      throw error;
    }
  }

  /**
   * Detect language from audio
   */
  async detectLanguage(audioFilePath) {
    try {
      const result = await this.transcribeAudio(audioFilePath);
      return result.language;
    } catch (error) {
      logger.error('Error detecting language:', error.message);
      return 'en'; // Default to English
    }
  }
}

module.exports = new SpeechToTextService();
