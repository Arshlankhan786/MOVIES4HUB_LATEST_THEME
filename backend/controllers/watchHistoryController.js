const asyncHandler = require('express-async-handler');
const watchHistoryService = require('../services/watchHistoryService');

const watchHistoryController = {
    getProgress: asyncHandler(async (req, res) => {
        const result = await watchHistoryService.getProgress(req.user.id, req.params.episodeId);
        res.json({ success: true, data: result });
    }),
    saveProgress: asyncHandler(async (req, res) => {
        const result = await watchHistoryService.saveProgress(req.user.id, req.body);
        res.json({ success: true, data: result });
    }),
    getContinueWatching: asyncHandler(async (req, res) => {
        const result = await watchHistoryService.getContinueWatching(req.user.id);
        res.json({ success: true, data: result });
    }),
    getHistory: asyncHandler(async (req, res) => {
        const result = await watchHistoryService.getHistory(req.user.id, req.query.page, req.query.limit);
        res.json({ success: true, data: result });
    }),
    deleteEntry: asyncHandler(async (req, res) => {
        await watchHistoryService.deleteEntry(req.params.id, req.user.id);
        res.json({ success: true, message: 'Entry deleted' });
    }),
};

module.exports = watchHistoryController;
