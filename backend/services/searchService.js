/**
 * Unified Search Service — merges anime + movie/series results.
 * Returns unified format: { results: [{ type, id, title, poster, ... }] }
 */
const config = require('../config/env');
const tmdbService = require('./tmdbService');
const cacheService = require('./cacheService');

const SEARCH_CACHE_TTL = 120;     // 2 min
const TRENDING_CACHE_TTL = 300;   // 5 min
const TRENDING_MAX = 10;

const TMDB_IMG = 'https://image.tmdb.org/t/p';

const searchService = {
    /**
     * Unified search across anime + movies/series.
     * Returns { results: [{ type, id, title, poster }], total }
     */
    async search(query, filters = {}) {
        const { type, genre, year, page = 1, limit = 20 } = filters;
        const cacheKey = `search:${query}:${type || 'all'}:${genre || ''}:${year || ''}:${page}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return cached;

        const results = [];

        // Search movies/series from TMDB
        if (!type || type === 'movie' || type === 'series' || type === 'tv') {
            try {
                const tmdbResults = await tmdbService.search(query, parseInt(page, 10));
                const items = tmdbResults?.results || [];
                items.forEach(item => {
                    results.push({
                        type: item.type || item.contentType || 'movie',
                        id: item.tmdbId || item.id,
                        tmdbId: item.tmdbId || item.id,
                        title: item.title || item.name || '',
                        poster: item.poster || item.image || null,
                        backdrop: item.backdrop || null,
                        rating: item.rating || 0,
                        year: item.year || '',
                        contentType: item.contentType || item.type || 'movie',
                    });
                });
            } catch {
                // TMDB search failed — continue
            }
        }

        // Search anime from AnimeVerse API
        if (!type || type === 'anime') {
            try {
                const animeUrl = `${config.externalApis.animeApi}/api/search?q=${encodeURIComponent(query)}`;
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 8000);
                const res = await fetch(animeUrl, {
                    signal: controller.signal,
                    headers: { 'Accept': 'application/json' },
                });
                clearTimeout(timer);

                if (res.ok) {
                    const data = await res.json();
                    const animeResults = data?.results || data?.animes || data?.data || [];
                    const animeArr = Array.isArray(animeResults) ? animeResults : [];
                    animeArr.forEach(item => {
                        results.push({
                            type: 'anime',
                            id: item.id,
                            title: item.title || item.name || '',
                            poster: item.image || item.poster || null,
                            rating: item.rating || item.score || 0,
                            year: item.year || '',
                            contentType: 'anime',
                        });
                    });
                }
            } catch {
                // Anime search failed — continue
            }
        }

        const response = {
            results,
            total: results.length,
        };

        await cacheService.set(cacheKey, response, SEARCH_CACHE_TTL);

        // Track trending search
        this._trackTrending(query).catch(() => { });

        return response;
    },

    /**
     * Get trending searches.
     */
    async getTrending() {
        const cacheKey = 'search:trending';
        const cached = await cacheService.get(cacheKey);
        if (cached) return cached;

        const sorted = [...trendingMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, TRENDING_MAX)
            .map(([query, count]) => ({ query, count }));

        await cacheService.set(cacheKey, sorted, TRENDING_CACHE_TTL);
        return sorted;
    },

    /**
     * Track trending searches in-memory.
     */
    async _trackTrending(query) {
        const normalized = query.toLowerCase().trim();
        if (normalized.length < 2) return;

        const current = trendingMap.get(normalized) || 0;
        trendingMap.set(normalized, current + 1);

        if (trendingMap.size > 500) {
            const sorted = [...trendingMap.entries()].sort((a, b) => b[1] - a[1]);
            trendingMap.clear();
            sorted.slice(0, 100).forEach(([k, v]) => trendingMap.set(k, v));
        }
    },
};

// In-memory trending store (cleared on restart)
const trendingMap = new Map();

module.exports = searchService;
