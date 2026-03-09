const asyncHandler = require('express-async-handler');
const watchlistService = require('../services/watchlistService');

const watchlistController = {
    add: asyncHandler(async (req, res) => {
        const result = await watchlistService.add(req.user.id, req.body.contentId, req.body.type);
        res.json({ success: true, data: result });
    }),
    remove: asyncHandler(async (req, res) => {
        const result = await watchlistService.remove(req.user.id, req.params.contentId, req.params.type);
        res.json({ success: true, data: result });
    }),
    getAll: asyncHandler(async (req, res) => {
        const result = await watchlistService.getAll(req.user.id, req.query.page, req.query.limit);
        res.json({ success: true, data: result });
    }),
    getStatus: asyncHandler(async (req, res) => {
        const result = await watchlistService.getStatus(req.user.id, req.params.contentId, req.params.type);
        res.json({ success: true, data: result });
    }),
};

module.exports = watchlistController;
