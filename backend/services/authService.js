const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const config = require('../config/env');

const SALT_ROUNDS = 12;

const authService = {
    async register({ email, password, username }) {
        const existing = await User.findByEmail(email);
        if (existing) {
            throw ApiError.conflict('Email already registered');
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await User.create({
            email,
            password: hashedPassword,
            username,
        });

        const token = jwt.sign(
            { id: user.id, role: user.role },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        return { user, token };
    },

    async login({ email, password }) {
        const user = await User.findByEmail(email);
        if (!user) {
            throw ApiError.unauthorized('Invalid email or password');
        }

        if (user.isBanned) {
            throw ApiError.forbidden('Your account has been suspended');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw ApiError.unauthorized('Invalid email or password');
        }

        // Auto-expire premium
        await User.checkAndExpirePremium(user.id);

        const token = jwt.sign(
            { id: user.id, role: user.role },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

      const safeUser = {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    isPremium: user.isPremium,
    premiumExpiry: user.premiumExpiry
};

return { user: safeUser, token };
    },

    async getProfile(userId) {
        const user = await User.findById(userId);
        if (!user) throw ApiError.notFound('User not found');
        const { password: _, ...safeUser } = user;
        return safeUser;
    },
};

module.exports = authService;
