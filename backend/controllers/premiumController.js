const asyncHandler = require('express-async-handler');
const premiumService = require('../services/premiumService');

const premiumController = {
    grant: asyncHandler(async (req, res) => {
        const result = await premiumService.grantPremium(req.body.userId, req.body.durationDays);
        res.json({ success: true, data: result });
    }),
    revoke: asyncHandler(async (req, res) => {
        const result = await premiumService.revokePremium(req.body.userId);
        res.json({ success: true, data: result });
    }),
    checkStatus: asyncHandler(async (req, res) => {
        const result = await premiumService.checkStatus(req.user.id);
        res.json({ success: true, data: result });
    }),
};

module.exports = premiumController;
