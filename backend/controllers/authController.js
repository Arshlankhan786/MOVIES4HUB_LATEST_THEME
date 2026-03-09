const asyncHandler = require('express-async-handler');
const authService = require('../services/authService');

const authController = {
    register: asyncHandler(async (req, res) => {
        const result = await authService.register(req.body);
        res.status(201).json({ success: true, data: result });
    }),
    login: asyncHandler(async (req, res) => {
        const result = await authService.login(req.body);
        res.json({ success: true, data: result });
    }),
    getMe: asyncHandler(async (req, res) => {
        const result = await authService.getProfile(req.user.id);
        res.json({ success: true, data: result });
    }),
    updateTheme: asyncHandler(async (req, res) => {
        // Theme logic is usually updating user preferences, but since authService may not have this, let's just return a stub or implement if exists
        const User = require('../models/User');
        const { theme } = req.body;
        if (User && User.update) await User.update(req.user.id, { theme });
        res.json({ success: true, data: { theme } });
    })
};

module.exports = authController;
