const Redis = require('ioredis');
const config = require('./env');

let redis = null;
let redisAvailable = false;

function createRedisClient() {
    // If no Redis URL configured, skip entirely
    if (!config.redis?.url) {
        console.log('⚠️  Redis URL not configured — running without cache');
        return null;
    }

    const client = new Redis(config.redis.url, {
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
            if (times > 3) {
                console.log('⚠️  Redis unreachable after 3 retries — running without cache');
                return null; // Stop retrying
            }
            return Math.min(times * 500, 2000);
        },
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 5000,
    });

    client.on('connect', () => {
        redisAvailable = true;
        console.log('✅ Redis connected successfully');
    });

    client.on('error', () => {
        // Single error already logged via retryStrategy — suppress repeated logs
    });

    client.on('close', () => {
        redisAvailable = false;
    });

    client.connect().catch(() => {
        console.log('⚠️  Redis not available — caching disabled');
        redisAvailable = false;
    });

    return client;
}

redis = createRedisClient();

// Safe cache helpers that never throw
const cache = {
    async get(key) {
        if (!redis || !redisAvailable) return null;
        try {
            const data = await redis.get(key);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    },

    async set(key, value, ttlSeconds = 300) {
        if (!redis || !redisAvailable) return;
        try {
            await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        } catch {
            // Ignore cache write failures
        }
    },

    async del(key) {
        if (!redis || !redisAvailable) return;
        try {
            await redis.del(key);
        } catch {
            // Ignore
        }
    },

    isAvailable() {
        return redisAvailable;
    },
};

module.exports = redis;
module.exports.cache = cache;
module.exports.isAvailable = () => redisAvailable;
