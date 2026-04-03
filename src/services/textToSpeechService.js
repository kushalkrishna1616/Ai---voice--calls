const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

class TextToSpeechService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Default Rachel voice
    this.baseURL = 'https://api.elevenlabs.io/v1';
  }

  /**
   * Convert text to speech using ElevenLabs
   */
  async textToSpeech(text, options = {}) {
    try {
      const {
        voiceId = this.voiceId,
        modelId = 'eleven_monolingual_v1',
        stability = 0.5,
        similarityBoost = 0.75,
        style = 0.0,
        speakerBoost = true
      } = options;

      const response = await axios.post(
        `${this.baseURL}/text-to-speech/${voiceId}`,
        {
          text: text,
          model_id: modelId,
          voice_settings: {
            stability: stability,
            similarity_boost: similarityBoost,
            style: style,
            use_speaker_boost: speakerBoost
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      // Save audio file
      const recordingsDir = process.env.RECORDINGS_PATH || './recordings';
      if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true });
      }

      const fileName = `tts_${Date.now()}.mp3`;
      const filePath = path.join(recordingsDir, fileName);
      
      fs.writeFileSync(filePath, response.data);

      logger.info(`TTS audio generated: ${fileName}`);

      return {
        filePath: filePath,
        fileName: fileName,
        url: `/recordings/${fileName}`,
        size: response.data.length
      };

    } catch (error) {
      logger.error('Error generating TTS audio:', error.response?.data || error.message);
      throw new Error('Failed to generate TTS audio: ' + (error.response?.data?.detail?.message || error.message));
    }
  }

  /**
   * Get available voices
   */
  async getVoices() {
    try {
      const response = await axios.get(
        `${this.baseURL}/voices`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      return response.data.voices;

    } catch (error) {
      logger.error('Error fetching voices:', error.message);
      throw error;
    }
  }

  /**
   * Get voice details
   */
  async getVoiceDetails(voiceId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/voices/${voiceId}`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      return response.data;

    } catch (error) {
      logger.error('Error fetching voice details:', error.message);
      throw error;
    }
  }

  /**
   * Stream audio directly (for real-time playback)
   */
  async streamTextToSpeech(text, options = {}) {
    try {
      const {
        voiceId = this.voiceId,
        modelId = 'eleven_monolingual_v1',
        stability = 0.5,
        similarityBoost = 0.75
      } = options;

      const response = await axios.post(
        `${this.baseURL}/text-to-speech/${voiceId}/stream`,
        {
          text: text,
          model_id: modelId,
          voice_settings: {
            stability: stability,
            similarity_boost: similarityBoost
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          responseType: 'stream'
        }
      );

      return response.data;

    } catch (error) {
      logger.error('Error streaming TTS audio:', error.message);
      throw error;
    }
  }

  /**
   * Estimate character usage
   */
  estimateCharacterUsage(text) {
    // ElevenLabs charges per character
    return text.length;
  }

  /**
   * Clean up old audio files
   */
  async cleanupOldFiles(daysOld = 7) {
    try {
      const recordingsDir = process.env.RECORDINGS_PATH || './recordings';
      
      if (!fs.existsSync(recordingsDir)) {
        return;
      }

      const files = fs.readdirSync(recordingsDir);
      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;

      let deletedCount = 0;

      files.forEach(file => {
        const filePath = path.join(recordingsDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      });

      logger.info(`Cleaned up ${deletedCount} old audio files`);

    } catch (error) {
      logger.error('Error cleaning up old files:', error.message);
    }
  }
}

module.exports = new TextToSpeechService();
