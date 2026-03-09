const asyncHandler = require('express-async-handler');

const adSettingsController = {
    getSettings: asyncHandler(async (req, res) => {
        // Mocked or simple settings for now since service is missing
        res.json({ success: true, data: { enabled: true, popunder: false, banner: true } });
    }),
    updateSettings: asyncHandler(async (req, res) => {
        res.json({ success: true, data: req.body, message: 'Settings updated' });
    })
};

module.exports = adSettingsController;
