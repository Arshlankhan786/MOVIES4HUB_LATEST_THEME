const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// Super Admin only
router.get('/', requireAuth, requireRole('super_admin', 'support_admin'), userController.getAll);
router.get('/:id', requireAuth, requireRole('super_admin', 'support_admin'), userController.getById);
router.patch('/:id/role', requireAuth, requireRole('super_admin'), userController.updateRole);
router.patch('/:id/ban', requireAuth, requireRole('super_admin', 'support_admin'), userController.banUser);
router.patch('/:id/unban', requireAuth, requireRole('super_admin', 'support_admin'), userController.unbanUser);
router.delete('/:id', requireAuth, requireRole('super_admin'), userController.deleteUser);

module.exports = router;
