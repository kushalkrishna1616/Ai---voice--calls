const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');

const simulationController = require('../controllers/simulationController');
const webCallController = require('../controllers/webCallController');

// Twilio webhook endpoints
router.post('/webhook', callController.handleIncomingCall.bind(callController));
router.post('/process-recording', callController.processRecording.bind(callController));
router.post('/status', callController.handleCallStatus.bind(callController));

// Simulation endpoint
router.post('/simulate', simulationController.simulateCall);

// Web Call endpoints (Browser-based)
router.post('/web/start', webCallController.startCall.bind(webCallController));
router.post('/web/message', webCallController.sendMessage.bind(webCallController));
router.post('/web/end', webCallController.endCall.bind(webCallController));

// REST API endpoints
router.get('/', callController.getCalls.bind(callController));
router.get('/:id', callController.getCall.bind(callController));
router.delete('/:id', callController.deleteCall.bind(callController));

module.exports = router;
