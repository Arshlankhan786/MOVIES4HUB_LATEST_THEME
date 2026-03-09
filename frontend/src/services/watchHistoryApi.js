import api from './api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const watchHistoryApi = {
    async getProgress(episodeId) {
        try {
            const res = await api.get(`/watch-history/${episodeId}`);
            return res.data?.data || null;
        } catch {
            return null;
        }
    },

    async saveProgress({ contentId, episodeId, progress, duration }) {
        try {
            await api.post('/watch-history', { contentId, episodeId, progress, duration });
        } catch {
        }
    },

    async getContinueWatching() {
        try {
            const res = await api.get('/watch-history/continue');
            return res.data?.data || [];
        } catch {
            return [];
        }
    },

    async getHistory(page = 1) {
        try {
            const res = await api.get(`/watch-history?page=${page}`);
            return res.data || { data: [], pagination: {} };
        } catch {
            return { data: [], pagination: {} };
        }
    },
};

export default watchHistoryApi;
