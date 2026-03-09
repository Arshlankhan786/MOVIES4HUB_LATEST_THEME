const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// Public
router.get('/', contentController.getAll);
router.get('/featured', contentController.getFeatured);
router.get('/:id/related', contentController.getRelated);
router.get('/:id', contentController.getById);

// Admin only (content_admin, super_admin)
router.post('/', requireAuth, requireRole('super_admin', 'content_admin'), contentController.create);
router.put('/:id', requireAuth, requireRole('super_admin', 'content_admin'), contentController.update);
router.delete('/:id', requireAuth, requireRole('super_admin', 'content_admin'), contentController.delete);

module.exports = router;
