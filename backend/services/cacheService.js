const redis = require('../config/redis');
const { isAvailable } = require('../config/redis');

const DEFAULT_TTL = 300; // 5 minutes

const cacheService = {
    async get(key) {
        if (!isAvailable()) return null;
        try {
            const data = await redis.get(key);
            if (!data) return null;
            const parsed = JSON.parse(data);
            return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
        } catch {
            return null;
        }
    },

    async set(key, data, ttl = DEFAULT_TTL) {
        if (!isAvailable()) return;
        try {
            await redis.setex(key, ttl, JSON.stringify(data));
        } catch {
            // Ignore cache write failures
        }
    },

    async del(key) {
        if (!isAvailable()) return;
        try {
            await redis.del(key);
        } catch {
            // Ignore
        }
    },

    async delPattern(pattern) {
        if (!isAvailable()) return;
        try {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } catch {
            // Ignore
        }
    },
};

module.exports = cacheService;
