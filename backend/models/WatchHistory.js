const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const WatchHistory = {
    async findByUserAndEpisode(userId, episodeId) {
        const [rows] = await db.query(
            'SELECT * FROM watch_history WHERE user_id = ? AND episode_id = ? LIMIT 1',
            [userId, episodeId]
        );
        return rows[0] || null;
    },

    async upsert(data) {
        const { userId, contentId, episodeId, progress, duration, completed } = data;
        const existing = await this.findByUserAndEpisode(userId, episodeId);

        if (existing) {
            await db.query(
                `UPDATE watch_history SET progress = ?, duration = ?, completed = ?, updated_at = NOW() WHERE id = ?`,
                [progress, duration, completed ? 1 : 0, existing.id]
            );
            return { ...existing, progress, duration, completed };
        }

        const id = uuidv4();
        await db.query(
            `INSERT INTO watch_history (id, user_id, content_id, episode_id, progress, duration, completed) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, userId, contentId, episodeId, progress, duration, completed ? 1 : 0]
        );
        return { id, ...data };
    },

    async getContinueWatching(userId, limit = 20) {
        const [rows] = await db.query(
            `SELECT * FROM watch_history WHERE user_id = ? AND completed = FALSE ORDER BY updated_at DESC LIMIT ?`,
            [userId, limit]
        );
        return rows;
    },

    async getHistory(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const [rows] = await db.query(
            `SELECT * FROM watch_history WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM watch_history WHERE user_id = ?',
            [userId]
        );
        return { items: rows, total: countResult[0].total };
    },

    async deleteEntry(id, userId) {
        await db.query('DELETE FROM watch_history WHERE id = ? AND user_id = ?', [id, userId]);
    },
};

module.exports = WatchHistory;
