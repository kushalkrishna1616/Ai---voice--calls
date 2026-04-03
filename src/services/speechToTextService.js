const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

class SpeechToTextService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';
  }

  /**
   * Transcribe audio file using OpenAI Whisper
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

      // Create form data
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioFilePath));
      formData.append('model', 'whisper-1');
      
      if (language) {
        formData.append('language', language);
      }
      
      if (prompt) {
        formData.append('prompt', prompt);
      }
      
      formData.append('temperature', temperature);

      // Make API request
      const response = await axios.post(
        `${this.baseURL}/audio/transcriptions`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            ...formData.getHeaders()
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      logger.info('Audio transcription successful');
      
      return {
        text: response.data.text,
        language: response.data.language || language,
        duration: response.data.duration
      };

    } catch (error) {
      logger.error('Error transcribing audio:', error.response?.data || error.message);
      throw new Error('Failed to transcribe audio: ' + (error.response?.data?.error?.message || error.message));
    }
  }

  /**
   * Transcribe audio from URL
   */
  async transcribeAudioFromUrl(audioUrl, options = {}) {
    try {
      // Download audio file
      const response = await axios.get(audioUrl, {
        responseType: 'arraybuffer'
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
      fs.unlinkSync(tempFilePath);

      return transcription;

    } catch (error) {
      logger.error('Error transcribing audio from URL:', error.message);
      throw error;
    }
  }

  /**
   * Transcribe with timestamps (for detailed analysis)
   */
  async transcribeWithTimestamps(audioFilePath, options = {}) {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioFilePath));
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities', 'segment');

      const response = await axios.post(
        `${this.baseURL}/audio/transcriptions`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            ...formData.getHeaders()
          }
        }
      );

      return {
        text: response.data.text,
        segments: response.data.segments,
        language: response.data.language,
        duration: response.data.duration
      };

    } catch (error) {
      logger.error('Error transcribing with timestamps:', error.message);
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
