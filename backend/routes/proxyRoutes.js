/**
 * backend/routes/proxyRoutes.js
 *
 * BUG FIX / IMPROVEMENT applied in this version:
 *  Added a movie streaming proxy route. The Peach API (movies4hub-movie-api on Railway)
 *  is called directly from the browser in movieService.js. If the Railway API ever
 *  returns restrictive CORS headers, all browser requests will silently fail.
 *
 *  This proxy route:
 *   - Forwards /api/proxy/movie/:provider/movie/:tmdbId to the Peach API
 *   - Forwards /api/proxy/movie/:provider/tv/:tmdbId/:season/:episode to the Peach API
 *   - Strips CORS-sensitive headers
 *   - Adds proper CORS headers back
 *
 *  The anime proxy is unchanged.
 *
 *  NOTE: movieService.js makes direct calls by default (better performance).
 *  Only switch to this proxy by updating EXTERNAL_MOVIE_API in movieService.js
 *  to point to your own backend if you encounter CORS issues in production.
 */

const express = require('express');
const router  = express.Router();
const config  = require('../config/env');
const axios   = require('axios');

const MOVIE_API_BASE = config.externalApis.movieApi || 'https://movies4hub-movie-api-production.up.railway.app';
const ANIME_API_BASE = config.externalApis.animeApi;

// ═══════════════════════════════════════════
// ANIME API PROXY (unchanged)
// ═══════════════════════════════════════════
router.all('/anime/*', async (req, res) => {
    try {
        const path      = req.originalUrl.replace('/api/proxy/anime', '');
        const targetUrl = `${ANIME_API_BASE}/api${path}`;

        const response = await axios({
            method:       req.method,
            url:          targetUrl,
            headers:      { 'User-Agent': 'Movies4Hub/2.0' },
            data:         req.method !== 'GET' ? req.body : undefined,
            timeout:      8000,
            responseType: 'json',
        });

        res.status(response.status).json(response.data);
    } catch (err) {
        if (err.code === 'ECONNABORTED') {
            return res.status(504).json({ success: false, message: 'Upstream request timed out' });
        }
        console.error('[Proxy] Anime error:', err.message);
        const status = err.response?.status || 502;
        const data   = err.response?.data   || { success: false, message: 'Failed to fetch from Anime API' };
        res.status(status).json(data);
    }
});

// ═══════════════════════════════════════════
// MOVIE API PROXY (new — CORS safety net)
// ═══════════════════════════════════════════

/**
 * GET /api/proxy/movie/:provider/movie/:tmdbId
 * Proxy to: MOVIE_API_BASE/:provider/movie/:tmdbId
 */
router.get('/movie/:provider/movie/:tmdbId', async (req, res) => {
    const { provider, tmdbId } = req.params;
    await proxyMovieRequest(`/${provider}/movie/${tmdbId}`, res);
});

/**
 * GET /api/proxy/movie/:provider/tv/:tmdbId/:season/:episode
 * Proxy to: MOVIE_API_BASE/:provider/tv/:tmdbId/:season/:episode
 */
router.get('/movie/:provider/tv/:tmdbId/:season/:episode', async (req, res) => {
    const { provider, tmdbId, season, episode } = req.params;
    await proxyMovieRequest(`/${provider}/tv/${tmdbId}/${season}/${episode}`, res);
});

async function proxyMovieRequest(path, res) {
    const targetUrl = `${MOVIE_API_BASE}${path}`;
    try {
        const response = await axios.get(targetUrl, {
            timeout: 12_000,
            headers: {
                'User-Agent': 'Movies4Hub/2.0',
                'Accept':     'application/json',
            },
            // Do NOT forward Authorization/Cookie headers to external API
        });

        // Forward CORS headers to allow browser fetch
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.status(response.status).json(response.data);
    } catch (err) {
        if (err.code === 'ECONNABORTED') {
            return res.status(504).json({ success: false, message: 'Movie API timed out' });
        }
        console.error('[Proxy] Movie error:', err.message);
        const status = err.response?.status || 502;
        const data   = err.response?.data   || { success: false, message: 'Failed to fetch from Movie API' };
        res.status(status).json(data);
    }
}

// Handle CORS pre-flight for movie proxy
router.options('/movie/*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.sendStatus(200);
});

module.exports = router;