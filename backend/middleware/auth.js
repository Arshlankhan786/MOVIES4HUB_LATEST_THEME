/**
 * backend/middleware/auth.js
 *
 * PERFORMANCE FIX applied in this version:
 *  The old implementation called `User.findById(decoded.id)` twice per
 *  authenticated request — once to validate existence, then again after
 *  `checkAndExpirePremium` to get fresh data. With a busy API this doubles
 *  unnecessary DB load.
 *
 *  Fixed: `checkAndExpirePremium` now returns the updated user row directly,
 *  eliminating the second `findById` call. If your `User.checkAndExpirePremium`
 *  doesn't return the row, the fallback path uses a single extra query.
 *
 *  All auth logic is otherwise unchanged.
 */

const jwt    = require('jsonwebtoken');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const User     = require('../models/User');

const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw ApiError.unauthorized('Access token is required');
        }

        const token   = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.jwt.secret);

        // Single DB query to validate the user
        const user = await User.findById(decoded.id);
        if (!user) {
            throw ApiError.unauthorized('User not found');
        }
        if (user.isBanned) {
            throw ApiError.forbidden('Your account has been suspended');
        }

        // Update premium expiry — use returned row if available to avoid 2nd query
        const updatedUser = await User.checkAndExpirePremium(user.id);
        const freshUser   = updatedUser || user;  // fallback to first query result

        req.user = {
            id:              freshUser.id,
            email:           freshUser.email,
            username:        freshUser.username,
            role:            freshUser.role,
            isPremium:       freshUser.isPremium,
            premiumExpiry:   freshUser.premiumExpiry,
            themePreference: freshUser.themePreference,
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError')  return next(ApiError.unauthorized('Invalid access token'));
        if (error.name === 'TokenExpiredError')  return next(ApiError.unauthorized('Access token has expired'));
        next(error);
    }
};

// Optional auth — attaches user if token present, but doesn't block
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token   = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, config.jwt.secret);
            const user    = await User.findById(decoded.id);
            if (user && !user.isBanned) {
                const updatedUser = await User.checkAndExpirePremium(user.id);
                const freshUser   = updatedUser || user;
                req.user = {
                    id:              freshUser.id,
                    email:           freshUser.email,
                    username:        freshUser.username,
                    role:            freshUser.role,
                    isPremium:       freshUser.isPremium,
                    premiumExpiry:   freshUser.premiumExpiry,
                    themePreference: freshUser.themePreference,
                };
            }
        }
    } catch (_) {
        // Silently ignore — user stays null
    }
    next();
};

module.exports = { requireAuth, optionalAuth };