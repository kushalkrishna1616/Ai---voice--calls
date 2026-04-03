const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');

const simulationController = require('../controllers/simulationController');

// Twilio webhook endpoints
router.post('/webhook', callController.handleIncomingCall.bind(callController));
router.post('/process-recording', callController.processRecording.bind(callController));
router.post('/status', callController.handleCallStatus.bind(callController));

// Simulation endpoint
router.post('/simulate', simulationController.simulateCall);

// REST API endpoints
router.get('/', callController.getCalls.bind(callController));
router.get('/:id', callController.getCall.bind(callController));
router.delete('/:id', callController.deleteCall.bind(callController));

module.exports = router;
