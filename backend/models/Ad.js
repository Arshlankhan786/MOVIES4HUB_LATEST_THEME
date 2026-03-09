const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const Ad = {
    async findById(id) {
        const [rows] = await db.query('SELECT * FROM ads WHERE id = ?', [id]);
        return rows[0] || null;
    },

    async findByPlacement(placement) {
        const [rows] = await db.query(
            'SELECT * FROM ads WHERE placement = ? AND isActive = TRUE ORDER BY createdAt DESC',
            [placement]
        );
        return rows;
    },

    async create({ placement, type, code }) {
        const id = uuidv4();
        await db.query(
            'INSERT INTO ads (id, placement, type, code) VALUES (?, ?, ?, ?)',
            [id, placement, type, code]
        );
        return { id, placement, type, code, isActive: true };
    },

    async update(id, data) {
        const fields = [];
        const params = [];
        for (const [key, value] of Object.entries(data)) {
            if (['placement', 'type', 'code', 'isActive'].includes(key)) {
                fields.push(`${key} = ?`);
                params.push(value);
            }
        }
        if (fields.length === 0) return;
        params.push(id);
        await db.query(`UPDATE ads SET ${fields.join(', ')} WHERE id = ?`, params);
    },

    async toggleActive(id) {
        await db.query('UPDATE ads SET isActive = NOT isActive WHERE id = ?', [id]);
    },

    async delete(id) {
        await db.query('DELETE FROM ads WHERE id = ?', [id]);
    },

    async findAll() {
        const [rows] = await db.query('SELECT * FROM ads ORDER BY createdAt DESC');
        return rows;
    },
};

module.exports = Ad;
