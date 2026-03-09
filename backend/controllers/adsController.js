const asyncHandler = require('express-async-handler');
const adsService = require('../services/adsService');

const adsController = {
    getByPlacement: asyncHandler(async (req, res) => {
        const isPremium = req.user?.role === 'premium';
        const result = await adsService.getAdsByPlacement(req.query.placement || req.params.placement, isPremium);
        res.json({ success: true, data: result });
    }),
    create: asyncHandler(async (req, res) => {
        const result = await adsService.createAd(req.body);
        res.json({ success: true, data: result });
    }),
    update: asyncHandler(async (req, res) => {
        const result = await adsService.updateAd(req.params.id, req.body);
        res.json({ success: true, data: result });
    }),
    delete: asyncHandler(async (req, res) => {
        await adsService.deleteAd(req.params.id);
        res.json({ success: true, message: 'Ad deleted' });
    }),
    toggle: asyncHandler(async (req, res) => {
        const result = await adsService.toggleAd(req.params.id);
        res.json({ success: true, data: result });
    }),
    getAll: asyncHandler(async (req, res) => {
        const result = await adsService.getAllAds();
        res.json({ success: true, data: result });
    }),
};

module.exports = adsController;
