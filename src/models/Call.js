const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  audioUrl: {
    type: String
  },
  duration: {
    type: Number // in seconds
  }
});

const callSchema = new mongoose.Schema({
  callSid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  callerNumber: {
    type: String,
    required: true,
    index: true
  },
  recipientNumber: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['initiated', 'in-progress', 'completed', 'failed', 'no-answer', 'busy'],
    default: 'initiated',
    index: true
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    default: 'inbound'
  },
  startTime: {
    type: Date,
    default: Date.now,
    index: true
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  recordingUrl: {
    type: String
  },
  recordingSid: {
    type: String
  },
  recordingDuration: {
    type: Number // in seconds
  },
  conversation: [messageSchema],
  detectedIntent: {
    type: String,
    index: true
  },
  intentConfidence: {
    type: Number,
    min: 0,
    max: 1
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative']
  },
  metadata: {
    type: Map,
    of: String
  },
  errorMessage: {
    type: String
  },
  cost: {
    type: Number, // in USD
    default: 0
  },
  aiModelUsed: {
    type: String,
    default: 'gpt-4'
  },
  ttsProvider: {
    type: String,
    default: 'elevenlabs'
  },
  sttProvider: {
    type: String,
    default: 'openai-whisper'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
callSchema.index({ createdAt: -1 });
callSchema.index({ callerNumber: 1, createdAt: -1 });
callSchema.index({ status: 1, createdAt: -1 });
callSchema.index({ detectedIntent: 1 });

// Virtual for formatted duration
callSchema.virtual('formattedDuration').get(function() {
  if (!this.duration) return '0:00';
  const minutes = Math.floor(this.duration / 60);
  const seconds = this.duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Calculate duration before saving
callSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  }
  next();
});

// Static method to get call statistics
callSchema.statics.getStatistics = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: 1 },
        completedCalls: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        failedCalls: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        averageDuration: { $avg: '$duration' },
        totalDuration: { $sum: '$duration' },
        totalCost: { $sum: '$cost' }
      }
    }
  ]);
};

module.exports = mongoose.model('Call', callSchema);
