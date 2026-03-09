const Watchlist = require('../models/Watchlist');
const cacheService = require('./cacheService');

const WATCHLIST_CACHE_TTL = 120; // 2 minutes

const watchlistService = {
    async add(userId, contentId, type) {
        const existing = await Watchlist.findOne(userId, contentId, type);
        if (existing) return { action: 'added', ...existing };

        const item = await Watchlist.add(userId, contentId, type);
        await cacheService.delPattern(`watchlist:${userId}*`);
        return { action: 'added', ...item };
    },

    async remove(userId, contentId, type) {
        const existing = await Watchlist.findOne(userId, contentId, type);
        if (existing) {
            await Watchlist.remove(userId, contentId, type);
            await cacheService.delPattern(`watchlist:${userId}*`);
        }
        return { action: 'removed', contentId, type };
    },

    async getAll(userId, page = 1, limit = 20) {
        const cacheKey = `watchlist:${userId}:${page}:${limit}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return cached;

        const offset = (page - 1) * limit;
        const items = await Watchlist.findByUser(userId, limit, offset);
        const total = await Watchlist.countByUser(userId);

        const result = {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };

        await cacheService.set(cacheKey, result, WATCHLIST_CACHE_TTL);
        return result;
    },

    async getStatus(userId, contentId, type) {
        const cacheKey = `watchlist:${userId}:status:${type}:${contentId}`;
        const cached = await cacheService.get(cacheKey);
        if (cached !== null) return cached;

        const item = await Watchlist.findOne(userId, contentId, type);
        const status = { inWatchlist: !!item };

        await cacheService.set(cacheKey, status, WATCHLIST_CACHE_TTL);
        return status;
    },
};

module.exports = watchlistService;
