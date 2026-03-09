const asyncHandler = require('express-async-handler');
const contentService = require('../services/contentService');

const contentController = {
    getAll: asyncHandler(async (req, res) => {
        const result = await contentService.getAll(req.query);
        res.json({ success: true, data: result });
    }),
    getFeatured: asyncHandler(async (req, res) => {
        const result = await contentService.getFeatured(req.query.limit || 5);
        res.json({ success: true, data: result });
    }),
    getRelated: asyncHandler(async (req, res) => {
        const result = await contentService.getRelated(req.params.id, req.query.limit || 12);
        res.json({ success: true, data: result });
    }),
    getById: asyncHandler(async (req, res) => {
        const result = await contentService.getById(req.params.id);
        res.json({ success: true, data: result });
    }),
    create: asyncHandler(async (req, res) => {
        const result = await contentService.create(req.body, req.user.id);
        res.status(201).json({ success: true, data: result });
    }),
    update: asyncHandler(async (req, res) => {
        const result = await contentService.update(req.params.id, req.body);
        res.json({ success: true, data: result });
    }),
    delete: asyncHandler(async (req, res) => {
        await contentService.delete(req.params.id);
        res.json({ success: true, message: 'Content deleted successfully' });
    }),
};

module.exports = contentController;
