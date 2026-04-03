const mongoose = require('mongoose');

const transcriptSegmentSchema = new mongoose.Schema({
  speaker: {
    type: String,
    enum: ['caller', 'ai-agent'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  duration: {
    type: Number // in seconds
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  audioUrl: {
    type: String
  }
});

const transcriptSchema = new mongoose.Schema({
  callId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Call',
    required: true,
    index: true
  },
  callSid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  segments: [transcriptSegmentSchema],
  fullTranscript: {
    type: String,
    text: true // Enable text search
  },
  summary: {
    type: String
  },
  keyPoints: [{
    type: String
  }],
  actionItems: [{
    item: String,
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending'
    }
  }],
  categories: [{
    type: String
  }],
  transcriptLanguage: {
    type: String,
    default: 'en-US'
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingError: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
transcriptSchema.index({ createdAt: -1 });
transcriptSchema.index({ callId: 1 });
transcriptSchema.index({ fullTranscript: 'text' });

// Pre-save hook to generate full transcript
transcriptSchema.pre('save', function(next) {
  if (this.segments && this.segments.length > 0) {
    this.fullTranscript = this.segments
      .map(seg => `${seg.speaker.toUpperCase()}: ${seg.text}`)
      .join('\n');
  }
  next();
});

// Static method to search transcripts
transcriptSchema.statics.searchTranscripts = async function(query, options = {}) {
  const { limit = 10, skip = 0 } = options;
  
  return this.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
  .sort({ score: { $meta: 'textScore' } })
  .limit(limit)
  .skip(skip)
  .populate('callId');
};

module.exports = mongoose.model('Transcript', transcriptSchema);
