const express = require('express');
const router = express.Router();
const transcriptController = require('../controllers/transcriptController');

router.get('/', transcriptController.getTranscripts.bind(transcriptController));
router.get('/search', transcriptController.searchTranscripts.bind(transcriptController));
router.get('/:id', transcriptController.getTranscript.bind(transcriptController));
router.get('/:id/export', transcriptController.exportTranscript.bind(transcriptController));
router.get('/call/:callId', transcriptController.getTranscriptByCallId.bind(transcriptController));
router.put('/:id', transcriptController.updateTranscript.bind(transcriptController));
router.delete('/:id', transcriptController.deleteTranscript.bind(transcriptController));

module.exports = router;
