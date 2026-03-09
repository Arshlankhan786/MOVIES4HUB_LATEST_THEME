const express = require('express');
const router = express.Router();
const watchHistoryController = require('../controllers/watchHistoryController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/continue', watchHistoryController.getContinueWatching);
router.get('/:episodeId', watchHistoryController.getProgress);
router.post('/', watchHistoryController.saveProgress);
router.get('/', watchHistoryController.getHistory);
router.delete('/:id', watchHistoryController.deleteEntry);

module.exports = router;
