const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const Content = {
    async findById(id) {
        const [rows] = await db.query('SELECT * FROM content WHERE id = ?', [id]);
        return rows[0] || null;
    },

    async create(data) {
        const id = uuidv4();
        const { type, sourceType = 'manual', title, description, poster, backdrop, streamUrl, quality = '1080p', subtitles, isFeatured = false, createdBy } = data;
        await db.query(
            `INSERT INTO content (id, type, sourceType, title, description, poster, backdrop, streamUrl, quality, subtitles, isFeatured, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, type, sourceType, title, description, poster, backdrop, streamUrl, quality, subtitles ? JSON.stringify(subtitles) : null, isFeatured, createdBy]
        );
        return { id, ...data };
    },

    async update(id, data) {
        const allowed = ['type', 'sourceType', 'title', 'description', 'poster', 'backdrop', 'streamUrl', 'quality', 'subtitles', 'isFeatured'];
        const fields = [];
        const params = [];
        for (const [key, value] of Object.entries(data)) {
            if (allowed.includes(key)) {
                fields.push(`${key} = ?`);
                params.push(key === 'subtitles' ? JSON.stringify(value) : value);
            }
        }
        if (fields.length === 0) return;
        params.push(id);
        await db.query(`UPDATE content SET ${fields.join(', ')} WHERE id = ?`, params);
    },

    async delete(id) {
        await db.query('DELETE FROM content WHERE id = ?', [id]);
    },

    async findAll({ page = 1, limit = 20, type, featured, search, sourceType }) {
        let query = 'SELECT * FROM content WHERE 1=1';
        const params = [];

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }
        if (featured !== undefined) {
            query += ' AND isFeatured = ?';
            params.push(featured ? 1 : 0);
        }
        if (sourceType) {
            query += ' AND sourceType = ?';
            params.push(sourceType);
        }
        if (search) {
            query += ' AND MATCH(title, description) AGAINST(? IN BOOLEAN MODE)';
            params.push(search);
        }

        const offset = (page - 1) * limit;
        query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [rows] = await db.query(query, params);
        return rows;
    },

    async getFeatured(limit = 5) {
        const [rows] = await db.query(
            'SELECT * FROM content WHERE isFeatured = TRUE ORDER BY createdAt DESC LIMIT ?',
            [limit]
        );
        return rows;
    },

    async getRelated(excludeId, type, limit = 10) {
        const [rows] = await db.query(
            'SELECT * FROM content WHERE type = ? AND id != ? ORDER BY createdAt DESC LIMIT ?',
            [type, excludeId, limit]
        );
        return rows;
    },

    async count(filters = {}) {
        let query = 'SELECT COUNT(*) as total FROM content WHERE 1=1';
        const params = [];
        if (filters.type) { query += ' AND type = ?'; params.push(filters.type); }
        if (filters.sourceType) { query += ' AND sourceType = ?'; params.push(filters.sourceType); }
        const [rows] = await db.query(query, params);
        return rows[0].total;
    },
};

module.exports = Content;
