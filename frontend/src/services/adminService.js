/**
 * Admin Service — ad settings management.
 */
import api from './api';

const adminService = {
    async getAdSettings() {
        try {
            const res = await api.get('/admin/ads/settings');
            return res.data?.data || null;
        } catch (err) {
            return null;
        }
    },

    async updateAdSettings(settings) {
        try {
            const res = await api.post('/admin/ads/settings', settings);
            return res.data?.data || null;
        } catch (err) {
            return { error: err.response?.data?.message || err.message };
        }
    },
};

export default adminService;
