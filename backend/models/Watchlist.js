const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const Watchlist = {
    async findByUser(userId, limit = 50, offset = 0) {
        const [rows] = await pool.execute(
            `SELECT * FROM watchlist WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [userId, String(limit), String(offset)]
        );
        return rows;
    },

    async countByUser(userId) {
        const [rows] = await pool.execute(
            `SELECT COUNT(*) as total FROM watchlist WHERE user_id = ?`,
            [userId]
        );
        return rows[0].total;
    },

    async findOne(userId, contentId, type) {
        const [rows] = await pool.execute(
            `SELECT * FROM watchlist WHERE user_id = ? AND content_id = ? AND type = ?`,
            [userId, contentId, type]
        );
        return rows[0] || null;
    },

    async add(userId, contentId, type) {
        const id = uuidv4();
        await pool.execute(
            `INSERT INTO watchlist (id, user_id, content_id, type) VALUES (?, ?, ?, ?)`,
            [id, userId, contentId, type]
        );
        return { id, user_id: userId, content_id: contentId, type };
    },

    async remove(userId, contentId, type) {
        const [result] = await pool.execute(
            `DELETE FROM watchlist WHERE user_id = ? AND content_id = ? AND type = ?`,
            [userId, contentId, type]
        );
        return result.affectedRows > 0;
    },
};

module.exports = Watchlist;
