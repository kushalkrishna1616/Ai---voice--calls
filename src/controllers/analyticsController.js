const { startOfDay, endOfDay, subDays } = require('date-fns');
const Call = require('../models/Call');
const Analytics = require('../models/Analytics');

// Mock Data Helpers
const getMockStats = () => ({
  overview: {
    totalCalls: 20,
    completedCalls: 18,
    failedCalls: 2,
    averageDuration: 125,
    totalDuration: 2500,
    totalCost: 1.50
  },
  callsByStatus: { completed: 18, failed: 2 }
});

// GET /api/v1/analytics/dashboard
exports.getDashboardStats = async (req, res, next) => {
  try {
    const stats = await Call.getStatistics(startOfDay(subDays(new Date(), 7)), endOfDay(new Date()));
    const recentCalls = await Call.find().sort({ createdAt: -1 }).limit(5);
    
    const data = {
      overview: stats[0] || {
        totalCalls: 0,
        completedCalls: 0,
        failedCalls: 0,
        averageDuration: 0,
        totalDuration: 0,
        totalCost: 0
      },
      recentCalls
    };

    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

// GET /api/v1/analytics/timeseries
exports.getTimeSeries = async (req, res, next) => {
  try {
    const trends = await Call.aggregate([
      {
        $match: {
          createdAt: { $gte: subDays(new Date(), 7) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalCalls: { $sum: 1 },
          completedCalls: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: "$_id",
          totalCalls: 1,
          completedCalls: 1,
          _id: 0
        }
      }
    ]);
    res.status(200).json({ success: true, data: trends });
  } catch (error) { next(error); }
};

// GET /api/v1/analytics/peak-hours
exports.getPeakHours = async (req, res, next) => {
  res.status(200).json({ success: true, data: [
    { hour: 9, count: 5 }, { hour: 10, count: 8 }, { hour: 14, count: 12 }
  ]});
};

// GET /api/v1/analytics/caller-insights
exports.getCallerInsights = async (req, res, next) => {
  res.status(200).json({ success: true, data: {
    returningCallers: 15,
    newCallers: 5,
    topCallers: []
  }});
};

// GET /api/v1/analytics/intent-analysis
exports.getIntentAnalysis = async (req, res, next) => {
  res.status(200).json({ success: true, data: {
    billing: 45, support: 25, sales: 15, other: 15
  }});
};

// GET /api/v1/analytics/export
exports.exportAnalytics = async (req, res, next) => {
  res.status(200).json({ success: true, message: 'Export started' });
};

// POST /api/v1/analytics/generate-daily
exports.generateDailyMetrics = async (req, res, next) => {
  res.status(200).json({ success: true, message: 'Metrics generated' });
};
