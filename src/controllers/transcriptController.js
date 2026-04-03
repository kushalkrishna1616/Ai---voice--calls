const Transcript = require('../models/Transcript');
const Call = require('../models/Call');
const logger = require('../config/logger');

class TranscriptController {
  /**
   * Get all transcripts with pagination
   */
  async getTranscripts(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        startDate,
        endDate
      } = req.query;

      let query = {};

      // Text search
      if (search) {
        query = { $text: { $search: search } };
      }

      // Date range filter
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const transcripts = await Transcript.find(query)
        .populate('callId', 'callerNumber status duration')
        .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

      const total = await Transcript.countDocuments(query);

      res.json({
        success: true,
        data: transcripts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });

    } catch (error) {
      logger.error('Error fetching transcripts:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching transcripts'
      });
    }
  }

  /**
   * Get single transcript
   */
  async getTranscript(req, res) {
    try {
      const { id } = req.params;

      const transcript = await Transcript.findById(id)
        .populate('callId');

      if (!transcript) {
        return res.status(404).json({
          success: false,
          message: 'Transcript not found'
        });
      }

      res.json({
        success: true,
        data: transcript
      });

    } catch (error) {
      logger.error('Error fetching transcript:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching transcript'
      });
    }
  }

  /**
   * Get transcript by call ID
   */
  async getTranscriptByCallId(req, res) {
    try {
      const { callId } = req.params;

      const transcript = await Transcript.findOne({ callId })
        .populate('callId');

      if (!transcript) {
        return res.status(404).json({
          success: false,
          message: 'Transcript not found'
        });
      }

      res.json({
        success: true,
        data: transcript
      });

    } catch (error) {
      logger.error('Error fetching transcript:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching transcript'
      });
    }
  }

  /**
   * Search transcripts
   */
  async searchTranscripts(req, res) {
    try {
      const { query, limit = 10, skip = 0 } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const results = await Transcript.searchTranscripts(query, {
        limit: parseInt(limit),
        skip: parseInt(skip)
      });

      res.json({
        success: true,
        data: results,
        count: results.length
      });

    } catch (error) {
      logger.error('Error searching transcripts:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching transcripts'
      });
    }
  }

  /**
   * Update transcript (e.g., mark action items as completed)
   */
  async updateTranscript(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const transcript = await Transcript.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      );

      if (!transcript) {
        return res.status(404).json({
          success: false,
          message: 'Transcript not found'
        });
      }

      res.json({
        success: true,
        data: transcript
      });

    } catch (error) {
      logger.error('Error updating transcript:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating transcript'
      });
    }
  }

  /**
   * Delete transcript
   */
  async deleteTranscript(req, res) {
    try {
      const { id } = req.params;

      const transcript = await Transcript.findByIdAndDelete(id);

      if (!transcript) {
        return res.status(404).json({
          success: false,
          message: 'Transcript not found'
        });
      }

      res.json({
        success: true,
        message: 'Transcript deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting transcript:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting transcript'
      });
    }
  }

  /**
   * Export transcript as text file
   */
  async exportTranscript(req, res) {
    try {
      const { id } = req.params;

      const transcript = await Transcript.findById(id)
        .populate('callId');

      if (!transcript) {
        return res.status(404).json({
          success: false,
          message: 'Transcript not found'
        });
      }

      // Format transcript
      let exportText = `Call Transcript\n`;
      exportText += `================\n\n`;
      exportText += `Call ID: ${transcript.callSid}\n`;
      exportText += `Caller: ${transcript.callId?.callerNumber || 'Unknown'}\n`;
      exportText += `Date: ${transcript.createdAt.toLocaleString()}\n`;
      exportText += `Duration: ${transcript.callId?.formattedDuration || 'Unknown'}\n\n`;
      
      if (transcript.summary) {
        exportText += `Summary:\n${transcript.summary}\n\n`;
      }

      exportText += `Conversation:\n`;
      exportText += `=============\n\n`;
      exportText += transcript.fullTranscript;

      if (transcript.actionItems && transcript.actionItems.length > 0) {
        exportText += `\n\nAction Items:\n`;
        exportText += `=============\n`;
        transcript.actionItems.forEach((item, index) => {
          exportText += `${index + 1}. [${item.status.toUpperCase()}] ${item.item}\n`;
        });
      }

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="transcript_${transcript.callSid}.txt"`);
      res.send(exportText);

    } catch (error) {
      logger.error('Error exporting transcript:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting transcript'
      });
    }
  }
}

module.exports = new TranscriptController();
