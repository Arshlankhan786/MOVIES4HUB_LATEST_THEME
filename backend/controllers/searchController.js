const asyncHandler = require('express-async-handler');
const searchService = require('../services/searchService');

const searchController = {
    search: asyncHandler(async (req, res) => {
        const result = await searchService.multiSearch(req.query.q, req.query.page);
        res.json({ success: true, data: result });
    }),
    trending: asyncHandler(async (req, res) => {
        const result = await searchService.getTrendingSearches();
        res.json({ success: true, data: result });
    }),
    getSuggestions: asyncHandler(async (req, res) => {
        const result = await searchService.getSuggestions(req.query.q);
        res.json({ success: true, data: result });
    })
};

module.exports = searchController;
