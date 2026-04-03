const mongoose = require('mongoose');

const dailyMetricsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
    index: true
  },
  totalCalls: {
    type: Number,
    default: 0
  },
  completedCalls: {
    type: Number,
    default: 0
  },
  failedCalls: {
    type: Number,
    default: 0
  },
  averageDuration: {
    type: Number,
    default: 0
  },
  totalDuration: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  uniqueCallers: {
    type: Number,
    default: 0
  },
  intentBreakdown: {
    type: Map,
    of: Number,
    default: {}
  },
  sentimentBreakdown: {
    positive: { type: Number, default: 0 },
    neutral: { type: Number, default: 0 },
    negative: { type: Number, default: 0 }
  },
  peakHours: [{
    hour: Number,
    count: Number
  }],
  averageMessagesPerCall: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
dailyMetricsSchema.index({ date: -1 });

// Static method to aggregate daily metrics
dailyMetricsSchema.statics.aggregateDailyMetrics = async function(date) {
  const Call = mongoose.model('Call');
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const calls = await Call.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });

  if (calls.length === 0) {
    return null;
  }

  const metrics = {
    date: startOfDay,
    totalCalls: calls.length,
    completedCalls: calls.filter(c => c.status === 'completed').length,
    failedCalls: calls.filter(c => c.status === 'failed').length,
    totalDuration: calls.reduce((sum, c) => sum + (c.duration || 0), 0),
    totalCost: calls.reduce((sum, c) => sum + (c.cost || 0), 0),
    uniqueCallers: new Set(calls.map(c => c.callerNumber)).size,
    intentBreakdown: {},
    sentimentBreakdown: {
      positive: 0,
      neutral: 0,
      negative: 0
    },
    peakHours: [],
    averageMessagesPerCall: 0
  };

  metrics.averageDuration = metrics.totalDuration / calls.length;

  // Intent breakdown
  calls.forEach(call => {
    if (call.detectedIntent) {
      metrics.intentBreakdown[call.detectedIntent] = 
        (metrics.intentBreakdown[call.detectedIntent] || 0) + 1;
    }
    
    // Sentiment breakdown
    if (call.sentiment) {
      metrics.sentimentBreakdown[call.sentiment]++;
    }
  });

  // Peak hours
  const hourCounts = {};
  calls.forEach(call => {
    const hour = new Date(call.startTime).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  metrics.peakHours = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Average messages per call
  const totalMessages = calls.reduce((sum, c) => sum + (c.conversation?.length || 0), 0);
  metrics.averageMessagesPerCall = totalMessages / calls.length;

  return this.findOneAndUpdate(
    { date: startOfDay },
    metrics,
    { upsert: true, new: true }
  );
};

// Static method to get metrics for date range
dailyMetricsSchema.statics.getMetricsRange = async function(startDate, endDate) {
  return this.find({
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: -1 });
};

module.exports = mongoose.model('DailyMetrics', dailyMetricsSchema);
