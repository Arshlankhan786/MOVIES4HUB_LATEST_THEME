const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const userController = {
    getAll: asyncHandler(async (req, res) => {
        const users = await User.findAll(req.query);
        res.json({ success: true, data: users });
    }),
    getById: asyncHandler(async (req, res) => {
        const user = await User.findById(req.params.id);
        res.json({ success: true, data: user });
    }),
    updateRole: asyncHandler(async (req, res) => {
        await User.updateRole(req.params.id, req.body.role);
        res.json({ success: true, message: 'Role updated' });
    }),
    banUser: asyncHandler(async (req, res) => {
        await User.ban(req.params.id, req.body.reason);
        res.json({ success: true, message: 'User banned' });
    }),
    unbanUser: asyncHandler(async (req, res) => {
        await User.unban(req.params.id);
        res.json({ success: true, message: 'User unbanned' });
    }),
    deleteUser: asyncHandler(async (req, res) => {
        await User.delete(req.params.id);
        res.json({ success: true, message: 'User deleted' });
    }),
};

module.exports = userController;
