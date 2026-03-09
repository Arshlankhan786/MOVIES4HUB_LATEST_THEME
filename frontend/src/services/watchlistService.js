/**
 * Watchlist Service — toggle, list, status.
 */
import api from './api';

const watchlistService = {
    async add(contentId, type) {
        try {
            const res = await api.post('/watchlist/add', { content_id: contentId, type });
            return res.data?.data || res.data;
        } catch (err) {
            return { success: false, error: err.response?.data?.message || err.message };
        }
    },

    async remove(contentId, type) {
        try {
            const res = await api.delete('/watchlist/remove', { data: { content_id: contentId, type } });
            return res.data?.data || res.data;
        } catch (err) {
            return { success: false, error: err.response?.data?.message || err.message };
        }
    },

    async getAll(page = 1, limit = 20) {
        try {
            const res = await api.get(`/watchlist?page=${page}&limit=${limit}`);
            return res.data;
        } catch (err) {
            return { success: false, data: [], pagination: {} };
        }
    },

    async getStatus(type, id) {
        try {
            const res = await api.get(`/watchlist/status/${type}/${id}`);
            return res.data?.data || { inWatchlist: false };
        } catch {
            return { inWatchlist: false };
        }
    },
};

export default watchlistService;
