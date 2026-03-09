/**
 * backend/services/tmdbService.js
 *
 * Direct TMDB API client for the Node.js backend.
 * Called by tmdbController and searchService.
 *
 * FIX — This file was MISSING from the project.
 * The uploaded tmdbService.js was the FRONTEND version (ES Module, calls
 * our own Express proxy). This backend version calls TMDB directly via
 * the secret API key and normalises every response into a unified shape
 * before returning it to the controller.
 */

const config = require('../config/env');
const cacheService = require('./cacheService');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';
const API_KEY = config.externalApis.tmdbApiKey;

// Cache TTLs
const TRENDING_TTL = 10 * 60;  // 10 min  — changes frequently
const POPULAR_TTL = 15 * 60;  // 15 min
const TOPRATED_TTL = 60 * 60;  // 1 hour  — stable
const DETAILS_TTL = 30 * 60;  // 30 min
const SEARCH_TTL = 5 * 60;  // 5 min
const SEASON_TTL = 20 * 60;  // 20 min
const IMAGES_TTL = 60 * 60;  // 1 hour

// ─── Generic fetch wrapper ───────────────────────────────────────────────────
async function tmdbFetch(path, params = {}) {
    const url = new URL(`${TMDB_BASE}${path}`);
    url.searchParams.set('api_key', API_KEY);
    url.searchParams.set('language', 'en-US');

    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    try {
        const res = await fetch(url.toString(), {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
        });
        clearTimeout(timer);

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`TMDB ${res.status}: ${text.slice(0, 120)}`);
        }

        return await res.json();
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

// ─── Normalisation helpers ───────────────────────────────────────────────────
function posterUrl(path) {
    return path ? `${TMDB_IMG}/w342${path}` : null;
}

function backdropUrl(path) {
    return path ? `${TMDB_IMG}/w1280${path}` : null;
}

/** Normalise a raw TMDB list item (search / trending / popular / top-rated). */
function normaliseItem(item) {
    const isTV = item.media_type === 'tv' || (!item.title && item.name);
    return {
        id: item.id,
        tmdbId: item.id,
        title: item.title || item.name || '',
        type: isTV ? 'tv' : 'movie',
        contentType: isTV ? 'tv' : 'movie',
        poster: posterUrl(item.poster_path),
        backdrop: backdropUrl(item.backdrop_path),
        rating: item.vote_average || 0,
        year: (item.release_date || item.first_air_date || '').substring(0, 4),
        overview: item.overview || '',
    };
}

/** Normalise a full TMDB details response. */
function normaliseDetails(data, type) {
    const isTV = type === 'tv';

    // Genres
    const genres = (data.genres || []).map(g => ({ id: g.id, name: g.name }));

    // Cast
    const cast = (data.credits?.cast || []).slice(0, 12).map(c => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profilePath: posterUrl(c.profile_path),
    }));

    // Seasons (TV only)
    const seasons = isTV
        ? (data.seasons || [])
            .filter(s => s.season_number > 0)
            .map(s => ({
                id: s.id,
                number: s.season_number,
                name: s.name,
                episodeCount: s.episode_count,
                poster: posterUrl(s.poster_path),
                airDate: s.air_date,
            }))
        : [];

    // Similar
    const similar = ((data.similar || data.recommendations)?.results || [])
        .slice(0, 16)
        .map(normaliseItem);

    return {
        id: data.id,
        tmdbId: data.id,
        title: data.title || data.name || '',
        type: isTV ? 'tv' : 'movie',
        contentType: isTV ? 'tv' : 'movie',
        poster: posterUrl(data.poster_path),
        backdrop: backdropUrl(data.backdrop_path),
        rating: data.vote_average || 0,
        year: (data.release_date || data.first_air_date || '').substring(0, 4),
        release_date: data.release_date || data.first_air_date || '',
        runtime: data.runtime || null,
        status: data.status || '',
        tagline: data.tagline || '',
        overview: data.overview || '',
        genres,
        cast,
        seasons,
        similar,
        imdbId: data.external_ids?.imdb_id || null,
        numberOfSeasons: data.number_of_seasons || null,
        numberOfEpisodes: data.number_of_episodes || null,
    };
}

// ─── Service methods ─────────────────────────────────────────────────────────
const tmdbService = {

    /** GET /trending/{type}/{time_window} */
    async getTrending(type = 'movie', time = 'week', page = 1) {
        const mediaType = type === 'tv' ? 'tv' : 'movie';
        const key = `tmdb:trending:${mediaType}:${time}:${page}`;

        const cached = await cacheService.get(key);
        if (cached) return cached;

        const data = await tmdbFetch(`/trending/${mediaType}/${time}`, { page });
        const result = {
            results: (data.results || []).map(i => normaliseItem({ ...i, media_type: mediaType })),
            page: data.page || 1,
            total_pages: data.total_pages || 1,
            total_results: data.total_results || 0,
        };

        await cacheService.set(key, result, TRENDING_TTL);
        return result;
    },

    /** GET /movie/popular  or  /tv/popular */
    async getPopular(type = 'movie', page = 1) {
        const mediaType = type === 'tv' ? 'tv' : 'movie';
        const key = `tmdb:popular:${mediaType}:${page}`;

        const cached = await cacheService.get(key);
        if (cached) return cached;

        const data = await tmdbFetch(`/${mediaType}/popular`, { page });
        const result = {
            results: (data.results || []).map(i => normaliseItem({ ...i, media_type: mediaType })),
            page: data.page || 1,
            total_pages: data.total_pages || 1,
            total_results: data.total_results || 0,
        };

        await cacheService.set(key, result, POPULAR_TTL);
        return result;
    },

    /** GET /movie/top_rated  or  /tv/top_rated */
    async getTopRated(type = 'movie', page = 1) {
        const mediaType = type === 'tv' ? 'tv' : 'movie';
        const key = `tmdb:toprated:${mediaType}:${page}`;

        const cached = await cacheService.get(key);
        if (cached) return cached;

        const data = await tmdbFetch(`/${mediaType}/top_rated`, { page });
        const result = {
            results: (data.results || []).map(i => normaliseItem({ ...i, media_type: mediaType })),
            page: data.page || 1,
            total_pages: data.total_pages || 1,
            total_results: data.total_results || 0,
        };

        await cacheService.set(key, result, TOPRATED_TTL);
        return result;
    },

    /** GET /search/multi */
    async search(query, page = 1) {
        if (!query || !query.trim()) return { results: [], page: 1, total_pages: 0, total_results: 0 };

        const key = `tmdb:search:${encodeURIComponent(query.toLowerCase())}:${page}`;
        const cached = await cacheService.get(key);
        if (cached) return cached;

        const data = await tmdbFetch('/search/multi', { query, page, include_adult: false });

        // Filter to only movies and TV shows (skip persons, etc.)
        const filtered = (data.results || []).filter(
            i => i.media_type === 'movie' || i.media_type === 'tv'
        );

        const result = {
            results: filtered.map(normaliseItem),
            page: data.page || 1,
            total_pages: data.total_pages || 1,
            total_results: filtered.length,
        };

        await cacheService.set(key, result, SEARCH_TTL);
        return result;
    },

    /** GET /movie/:id  or  /tv/:id  (with credits + similar + recommendations + external_ids) */
    async getDetails(type, id) {
        const mediaType = type === 'tv' ? 'tv' : 'movie';
        const key = `tmdb:details:${mediaType}:${id}`;

        const cached = await cacheService.get(key);
        if (cached) return cached;

        const data = await tmdbFetch(`/${mediaType}/${id}`, {
            append_to_response: 'credits,similar,recommendations,external_ids',
        });

        const result = normaliseDetails(data, mediaType);

        await cacheService.set(key, result, DETAILS_TTL);
        return result;
    },

    /** GET /tv/:id/season/:season_number */
    async getSeasonEpisodes(tvId, seasonNumber) {
        const key = `tmdb:season:${tvId}:${seasonNumber}`;
        const cached = await cacheService.get(key);
        if (cached) return cached;

        const data = await tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`);

        const result = {
            id: data.id,
            seasonNumber: data.season_number,
            name: data.name,
            overview: data.overview,
            poster: posterUrl(data.poster_path),
            airDate: data.air_date,
            episodes: (data.episodes || []).map(ep => ({
                id: ep.id,
                episodeNumber: ep.episode_number,
                episode_number: ep.episode_number,
                number: ep.episode_number,
                name: ep.name,
                title: ep.name,
                overview: ep.overview,
                airDate: ep.air_date,
                runtime: ep.runtime,
                stillPath: ep.still_path ? `${TMDB_IMG}/w300${ep.still_path}` : null,
                rating: ep.vote_average || 0,
            })),
        };

        await cacheService.set(key, result, SEASON_TTL);
        return result;
    },

    /** GET /movie/:id/images  or  /tv/:id/images */
    async getImages(type, id) {
        const mediaType = type === 'tv' ? 'tv' : 'movie';
        const key = `tmdb:images:${mediaType}:${id}`;
        const cached = await cacheService.get(key);
        if (cached) return cached;

        const data = await tmdbFetch(`/${mediaType}/${id}/images`, {
            include_image_language: 'en,null',
        });

        const result = {
            backdrops: (data.backdrops || []).slice(0, 10).map(i => ({
                url: `${TMDB_IMG}/w1280${i.file_path}`,
                width: i.width,
                height: i.height,
                aspectRatio: i.aspect_ratio,
            })),
            posters: (data.posters || []).slice(0, 8).map(i => ({
                url: `${TMDB_IMG}/w500${i.file_path}`,
                width: i.width,
                height: i.height,
            })),
            stills: (data.stills || []).slice(0, 8).map(i => ({
                url: `${TMDB_IMG}/w300${i.file_path}`,
                width: i.width,
                height: i.height,
            })),
        };

        await cacheService.set(key, result, IMAGES_TTL);
        return result;
    },
};

module.exports = tmdbService;