const WatchHistory = require('../models/WatchHistory');
const cacheService = require('./cacheService');

const CACHE_TTL = 120;

const watchHistoryService = {
    async getProgress(userId, episodeId) {
        const cacheKey = `wh:${userId}:${episodeId}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return cached;

        const entry = await WatchHistory.findByUserAndEpisode(userId, episodeId);
        if (entry) await cacheService.set(cacheKey, entry, CACHE_TTL);
        return entry;
    },

    async saveProgress(userId, data) {
        const { contentId, episodeId, progress, duration } = data;
        const completed = duration > 0 && (progress / duration) > 0.9;

        const entry = await WatchHistory.upsert({
            userId,
            contentId,
            episodeId,
            progress: Math.floor(progress),
            duration: Math.floor(duration),
            completed,
        });

        await cacheService.del(`wh:${userId}:${episodeId}`);
        await cacheService.del(`wh:continue:${userId}`);
        return entry;
    },

    async getContinueWatching(userId) {
        const cacheKey = `wh:continue:${userId}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return cached;

        const items = await WatchHistory.getContinueWatching(userId, 20);
        await cacheService.set(cacheKey, items, CACHE_TTL);
        return items;
    },

    async getHistory(userId, page, limit) {
        return WatchHistory.getHistory(userId, page, limit);
    },

    async deleteEntry(id, userId) {
        await WatchHistory.deleteEntry(id, userId);
        await cacheService.del(`wh:continue:${userId}`);
    },
};

module.exports = watchHistoryService;
