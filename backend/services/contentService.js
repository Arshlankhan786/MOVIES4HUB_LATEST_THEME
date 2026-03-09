const Content = require('../models/Content');
const ApiError = require('../utils/ApiError');
const cacheService = require('./cacheService');

const CONTENT_CACHE_TTL = 180; // 3 minutes

const contentService = {
    async getAll(filters) {
        const cacheKey = `content:list:${JSON.stringify(filters)}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return cached;

        const items = await Content.findAll(filters);
        const total = await Content.count(filters);
        const result = {
            items,
            pagination: {
                page: filters.page || 1,
                limit: filters.limit || 20,
                total,
                totalPages: Math.ceil(total / (filters.limit || 20)),
            },
        };

        await cacheService.set(cacheKey, result, CONTENT_CACHE_TTL);
        return result;
    },

    async getById(id) {
        const cacheKey = `content:item:${id}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return cached;

        const item = await Content.findById(id);
        if (!item) throw ApiError.notFound('Content not found');

        await cacheService.set(cacheKey, item, CONTENT_CACHE_TTL);
        return item;
    },

    async getFeatured(limit) {
        const cacheKey = `content:featured:${limit}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return cached;

        const items = await Content.getFeatured(limit);
        await cacheService.set(cacheKey, items, CONTENT_CACHE_TTL);
        return items;
    },

    async getRelated(id, limit) {
        const cacheKey = `content:related:${id}:${limit}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return cached;

        const item = await Content.findById(id);
        if (!item) return [];

        const items = await Content.getRelated(id, item.type, limit);
        await cacheService.set(cacheKey, items, CONTENT_CACHE_TTL);
        return items;
    },

    async create(data, userId) {
        data.createdBy = userId;
        const item = await Content.create(data);
        await cacheService.delPattern('content:*');
        return item;
    },

    async update(id, data) {
        const existing = await Content.findById(id);
        if (!existing) throw ApiError.notFound('Content not found');

        await Content.update(id, data);
        await cacheService.delPattern('content:*');
        return { id, ...data };
    },

    async delete(id) {
        const existing = await Content.findById(id);
        if (!existing) throw ApiError.notFound('Content not found');

        await Content.delete(id);
        await cacheService.delPattern('content:*');
    },
};

module.exports = contentService;
