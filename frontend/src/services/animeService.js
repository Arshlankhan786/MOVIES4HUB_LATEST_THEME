import api from './api';

const animeService = {
    async getHome() {
        try {
            const res = await api.get('/proxy/anime/home');
            return res.data || { success: false };
        } catch {
            return { success: false, error: 'Failed to fetch anime home' };
        }
    },

    async search(query) {
        try {
            const res = await api.get(`/proxy/anime/search?q=${encodeURIComponent(query)}`);
            return res.data || { success: false };
        } catch {
            return { success: false, error: 'Search failed' };
        }
    },

    async suggest(query) {
        try {
            const res = await api.get(`/proxy/anime/search?suggestion=${encodeURIComponent(query)}`);
            return res.data || { success: false };
        } catch {
            return { success: false, error: 'Suggestion failed' };
        }
    },

    async getCategory(type, page = 1) {
        try {
            const res = await api.get(`/proxy/anime/category/${type}?page=${page}`);
            return res.data || { success: false };
        } catch {
            return { success: false, error: 'Category fetch failed' };
        }
    },

    async getLetter(letter, page = 1) {
        try {
            const res = await api.get(`/proxy/anime/letter/${letter}?page=${page}`);
            return res.data || { success: false };
        } catch {
            return { success: false, error: 'Letter fetch failed' };
        }
    },

    async getInfo(id) {
        try {
            const res = await api.get(`/proxy/anime/info/${id}`);
            return res.data || { success: false };
        } catch {
            return { success: false, error: 'Info fetch failed' };
        }
    },

    async getEpisodes(id, season) {
        try {
            const res = await api.get(`/proxy/anime/episodes/${id}/${season}`);
            return res.data || { success: false };
        } catch {
            return { success: false, error: 'Episodes fetch failed' };
        }
    },

    async getEmbed(episodeId) {
        try {
            const res = await api.get(`/proxy/anime/embed/${episodeId}`);
            return res.data || { success: false };
        } catch {
            return { success: false, error: 'Embed fetch failed' };
        }
    },
};

export default animeService;
