const pool = require('../config/db');

const AdSettings = {
    async get() {
        const [rows] = await pool.execute(
            `SELECT * FROM ad_settings WHERE id = 1`
        );
        if (rows.length === 0) {
            // Create default settings
            await pool.execute(
                `INSERT INTO ad_settings (id, global_ads_enabled, enable_preroll, enable_midroll, enable_banner, midroll_interval) 
                 VALUES (1, TRUE, TRUE, FALSE, TRUE, 300)
                 ON DUPLICATE KEY UPDATE id = id`
            );
            return {
                id: 1,
                global_ads_enabled: true,
                enable_preroll: true,
                enable_midroll: false,
                enable_banner: true,
                midroll_interval: 300,
            };
        }
        return rows[0];
    },

    async update(data) {
        const fields = [];
        const values = [];

        if (data.global_ads_enabled !== undefined) {
            fields.push('global_ads_enabled = ?');
            values.push(data.global_ads_enabled ? 1 : 0);
        }
        if (data.enable_preroll !== undefined) {
            fields.push('enable_preroll = ?');
            values.push(data.enable_preroll ? 1 : 0);
        }
        if (data.enable_midroll !== undefined) {
            fields.push('enable_midroll = ?');
            values.push(data.enable_midroll ? 1 : 0);
        }
        if (data.enable_banner !== undefined) {
            fields.push('enable_banner = ?');
            values.push(data.enable_banner ? 1 : 0);
        }
        if (data.midroll_interval !== undefined) {
            fields.push('midroll_interval = ?');
            values.push(parseInt(data.midroll_interval, 10));
        }

        if (fields.length === 0) return this.get();

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(1); // WHERE id = 1

        await pool.execute(
            `UPDATE ad_settings SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        return this.get();
    },
};

module.exports = AdSettings;
