const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

router.get('/dashboard', analyticsController.getDashboardStats);
router.get('/timeseries', analyticsController.getTimeSeries);
router.get('/peak-hours', analyticsController.getPeakHours);
router.get('/caller-insights', analyticsController.getCallerInsights);
router.get('/intent-analysis', analyticsController.getIntentAnalysis);
router.get('/export', analyticsController.exportAnalytics);
router.post('/generate-daily', analyticsController.generateDailyMetrics);

module.exports = router;
