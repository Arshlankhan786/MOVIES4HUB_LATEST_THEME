const express = require('express');
const router = express.Router();
const adsController = require('../controllers/adsController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// Public (with optional auth for premium check)
router.get('/', optionalAuth, adsController.getByPlacement);

// Admin only
router.get('/all', requireAuth, requireRole('super_admin'), adsController.getAll);
router.post('/', requireAuth, requireRole('super_admin'), adsController.create);
router.put('/:id', requireAuth, requireRole('super_admin'), adsController.update);
router.delete('/:id', requireAuth, requireRole('super_admin'), adsController.delete);
router.patch('/:id/toggle', requireAuth, requireRole('super_admin'), adsController.toggle);

module.exports = router;
