const Ad = require('../models/Ad');
const ApiError = require('../utils/ApiError');
const cacheService = require('./cacheService');

const ADS_CACHE_TTL = 120; // 2 minutes

const adsService = {
    async getAdsByPlacement(placement, isPremium = false) {
        // Premium users get NO ads
        if (isPremium) return [];

        const cacheKey = `ads:placement:${placement}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return cached;

        const ads = await Ad.findByPlacement(placement);
        await cacheService.set(cacheKey, ads, ADS_CACHE_TTL);
        return ads;
    },

    async createAd(data) {
        const ad = await Ad.create(data);
        await cacheService.delPattern('ads:*');
        return ad;
    },

    async updateAd(id, data) {
        const existing = await Ad.findById(id);
        if (!existing) throw ApiError.notFound('Ad not found');

        await Ad.update(id, data);
        await cacheService.delPattern('ads:*');
        return { id, ...data };
    },

    async deleteAd(id) {
        const existing = await Ad.findById(id);
        if (!existing) throw ApiError.notFound('Ad not found');

        await Ad.delete(id);
        await cacheService.delPattern('ads:*');
    },

    async toggleAd(id) {
        const existing = await Ad.findById(id);
        if (!existing) throw ApiError.notFound('Ad not found');

        await Ad.toggleActive(id);
        await cacheService.delPattern('ads:*');
        return { id, isActive: !existing.isActive };
    },

    async getAllAds() {
        return Ad.findAll();
    },
};

module.exports = adsService;
