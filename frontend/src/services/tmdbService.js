/**
 * TMDB Service — Frontend client for TMDB backend proxy.
 */
import api from './api';

const tmdbService = {
    async getTrending(type = 'all', time = 'week', page = 1) {
        try {
            const res = await api.get(`/tmdb/trending?type=${type}&time=${time}&page=${page}`);
            return res.data?.data || { results: [] };
        } catch (error) {
            return Promise.reject(error);
        }
    },

    async getPopular(type = 'movie', page = 1) {
        try {
            const res = await api.get(`/tmdb/popular?type=${type}&page=${page}`);
            return res.data?.data || { results: [] };
        } catch (error) {
            return Promise.reject(error);
        }
    },

    async getTopRated(type = 'movie', page = 1) {
        try {
            const res = await api.get(`/tmdb/top-rated?type=${type}&page=${page}`);
            return res.data?.data || { results: [] };
        } catch (error) {
            return Promise.reject(error);
        }
    },

    async search(query, page = 1) {
        try {
            const res = await api.get(`/tmdb/search?q=${encodeURIComponent(query)}&page=${page}`);
            return res.data?.data || { results: [] };
        } catch (error) {
            return Promise.reject(error);
        }
    },

    async getDetails(type, id) {
        try {
            const res = await api.get(`/tmdb/details/${type}/${id}`);
            return res.data?.data || null;
        } catch (error) {
            return Promise.reject(error);
        }
    },

    async getSeasonEpisodes(tvId, seasonNumber) {
        try {
            const res = await api.get(`/tmdb/tv/${tvId}/season/${seasonNumber}`);
            return res.data?.data || { episodes: [] };
        } catch (error) {
            return Promise.reject(error);
        }
    },
    async getImages(type, tmdbId) {
        try {
            const res = await api.get(`/tmdb/images/${type}/${tmdbId}`);
            return res.data?.data || { backdrops: [], stills: [], posters: [] };
        } catch (error) {
            return Promise.reject(error);
        }
    },
};

export default tmdbService;
