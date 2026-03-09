const express = require('express');
const router = express.Router();
const watchlistController = require('../controllers/watchlistController');
const { requireAuth } = require('../middleware/auth');

router.post('/add', requireAuth, watchlistController.add);
router.delete('/remove', requireAuth, watchlistController.remove);
router.get('/', requireAuth, watchlistController.getAll);
router.get('/status/:type/:id', requireAuth, watchlistController.getStatus);

module.exports = router;
