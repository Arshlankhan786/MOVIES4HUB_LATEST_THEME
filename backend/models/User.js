const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const User = {
    async findById(id) {
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0] || null;
    },

    async findByEmail(email) {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0] || null;
    },

    async create({ email, password, username, role = 'user' }) {
        const id = uuidv4();
        await db.query(
            'INSERT INTO users (id, email, password, username, role) VALUES (?, ?, ?, ?, ?)',
            [id, email, password, username, role]
        );
        return { id, email, username, role };
    },

    async updatePremium(id, isPremium, premiumExpiry) {
        await db.query(
            'UPDATE users SET isPremium = ?, premiumExpiry = ? WHERE id = ?',
            [isPremium, premiumExpiry, id]
        );
    },

    async updateBan(id, isBanned) {
        await db.query('UPDATE users SET isBanned = ? WHERE id = ?', [isBanned, id]);
    },

    async updateTheme(id, themePreference) {
        await db.query('UPDATE users SET themePreference = ? WHERE id = ?', [themePreference, id]);
    },

    async updateRole(id, role) {
        await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    },

    async findAll({ page = 1, limit = 20, role, search }) {
        let query = 'SELECT id, email, username, role, isPremium, premiumExpiry, isBanned, themePreference, createdAt FROM users WHERE 1=1';
        const params = [];

        if (role) {
            query += ' AND role = ?';
            params.push(role);
        }
        if (search) {
            query += ' AND (email LIKE ? OR username LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        const offset = (page - 1) * limit;
        query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [rows] = await db.query(query, params);

        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM users WHERE 1=1' +
            (role ? ' AND role = ?' : '') +
            (search ? ' AND (email LIKE ? OR username LIKE ?)' : ''),
            role
                ? search ? [role, `%${search}%`, `%${search}%`] : [role]
                : search ? [`%${search}%`, `%${search}%`] : []
        );

        return { users: rows, total: countResult[0].total, page, limit };
    },

    async checkAndExpirePremium(id) {
        const [rows] = await db.query(
            'SELECT isPremium, premiumExpiry FROM users WHERE id = ?', [id]
        );
        const user = rows[0];
        if (user && user.isPremium && user.premiumExpiry && new Date(user.premiumExpiry) < new Date()) {
            await db.query(
                'UPDATE users SET isPremium = FALSE, premiumExpiry = NULL WHERE id = ?', [id]
            );
            return false;
        }
        return user ? user.isPremium : false;
    },

    async delete(id) {
        await db.query('DELETE FROM users WHERE id = ?', [id]);
    },
};

module.exports = User;
