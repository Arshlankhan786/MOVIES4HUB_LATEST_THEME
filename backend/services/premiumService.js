const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const premiumService = {
    async grantPremium(userId, durationDays) {
        const user = await User.findById(userId);
        if (!user) throw ApiError.notFound('User not found');

        const now = new Date();
        let expiry;

        if (user.isPremium && user.premiumExpiry && new Date(user.premiumExpiry) > now) {
            // Extend existing premium
            expiry = new Date(user.premiumExpiry);
            expiry.setDate(expiry.getDate() + durationDays);
        } else {
            // New premium
            expiry = new Date();
            expiry.setDate(expiry.getDate() + durationDays);
        }

        await User.updatePremium(user.id, true, expiry);
        return { userId: user.id, isPremium: true, premiumExpiry: expiry };
    },

    async revokePremium(userId) {
        const user = await User.findById(userId);
        if (!user) throw ApiError.notFound('User not found');

        await User.updatePremium(user.id, false, null);
        return { userId: user.id, isPremium: false, premiumExpiry: null };
    },

    async checkStatus(userId) {
        const user = await User.findById(userId);
        if (!user) throw ApiError.notFound('User not found');

        const isPremium = await User.checkAndExpirePremium(userId);
        const freshUser = await User.findById(userId);

        return {
            userId: freshUser.id,
            isPremium: freshUser.isPremium,
            premiumExpiry: freshUser.premiumExpiry,
        };
    },
};

module.exports = premiumService;
