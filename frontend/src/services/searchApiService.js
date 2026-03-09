/**
 * Search Service — unified search + trending.
 */
import api from './api';

const searchApiService = {
    async search(query, filters = {}) {
        try {
            const params = new URLSearchParams({ q: query });
            if (filters.type) params.set('type', filters.type);
            if (filters.genre) params.set('genre', filters.genre);
            if (filters.year) params.set('year', filters.year);
            if (filters.page) params.set('page', filters.page);

            const res = await api.get(`/search?${params.toString()}`);
            return res.data?.data || { results: [], total: 0 };
        } catch (err) {
            return { results: [], total: 0, error: err.message };
        }
    },

    async getTrending() {
        try {
            const res = await api.get('/search/trending');
            return res.data?.data || [];
        } catch {
            return [];
        }
    },
};

export default searchApiService;
