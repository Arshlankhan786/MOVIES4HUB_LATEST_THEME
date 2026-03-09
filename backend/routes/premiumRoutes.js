const express = require('express');
const router = express.Router();
const premiumController = require('../controllers/premiumController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.post('/grant', requireAuth, requireRole('super_admin', 'support_admin'), premiumController.grant);
router.post('/revoke', requireAuth, requireRole('super_admin', 'support_admin'), premiumController.revoke);
router.get('/status', requireAuth, premiumController.checkStatus);

module.exports = router;
