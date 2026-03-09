/*
 * Movies4Hub Streaming Platform
 * Created by Pathan Arshlan
 * GitHub: https://github.com/Arshlankhan786
 * Copyright © Pathan Arshlan. Removing credits or copyright may result in legal action.
 *
 * frontend/services/movieService.js
 *
 * STREAMING ARCHITECTURE PIPELINE
 * Watch Page -> movieService.js -> Peach API (Railway) -> Provider URLs -> VideoPlayer
 *
 * CHANGES in this version:
 *  1. lang extraction: s.dub OR s.lang OR s.label OR "Original Audio"
 *  2. Exported groupSourcesByLanguage() helper
 *  3. Provider order: myflixerz → moviebox (spec-correct)
 *  4. Normalise-first then validate (was checking data.sources before normalising)
 *  5. Per-provider 10s AbortSignal timeout
 */

const EXTERNAL_MOVIE_API = 'https://movies4hub-movie-api-production.up.railway.app';

// ── Fallback chain: Myflixerz first, then Moviebox ──────────────────────────
const PROVIDERS = ["moviebox", "vidcloud", "upcloud", "myflixerz"];

const QUALITY_RANK = { '2160': 0, '1080': 1, '720': 2, '480': 3, '360': 4 };

function sortByQuality(sources) {
    return [...sources].sort((a, b) => {
        const rankA = QUALITY_RANK[String(a.quality).replace(/[^\d]/g, '')] ?? 99;
        const rankB = QUALITY_RANK[String(b.quality).replace(/[^\d]/g, '')] ?? 99;
        return rankA - rankB;
    });
}

function detectType(url, type) {
    if (type === 'hls' || type === 'mp4') return type;
    if (!url) return 'mp4';
    const lower = String(url).toLowerCase();
    return (
        lower.includes('.m3u8') ||
        lower.includes('/hls/') ||
        lower.includes('manifest') ||
        lower.includes('m3u8-proxy')
    ) ? 'hls' : 'mp4';
}

function normalizeSources(data, providerName) {
    if (!data) return [];

    const provider = data.providerName || providerName || 'unknown';
    const sources = [];
    const seenKey = new Set(); // lang:quality dedup key

    const addSource = (s) => {
        const url = s.url || s.file || s.source;
        if (!url) return;

        const type = detectType(url, s.type);
        const quality = String(s.quality || 'auto').replace(/[pP]$/, '');

        // ── CHANGED: extract lang from dub → lang → label → default ──
        const lang = s.dub || s.lang || s.label || 'Original Audio';

        const key = `${lang}:${quality}`;
        if (seenKey.has(key)) return;
        seenKey.add(key);

        sources.push({
            url,
            quality,
            type,
            lang,
            headers: s.headers || {},
            sizeBytes: s.sizeBytes || 0,
            provider,
        });
    };

    const findSources = (obj) => {
        if (!obj) return;

        if (Array.isArray(obj.sources) && obj.sources.length > 0) {
            obj.sources.forEach(addSource);
        }

        if (obj.source || obj.url) {
            addSource({ url: obj.source || obj.url, quality: obj.quality, headers: obj.headers, type: obj.type, dub: obj.dub, lang: obj.lang });
        }

        if (obj.stream) {
            const streamUrl = typeof obj.stream === 'string' ? obj.stream : (obj.stream.url || obj.stream.source);
            if (streamUrl) addSource({ url: streamUrl, quality: obj.quality, headers: obj.headers, type: obj.stream?.type || obj.type, dub: obj.dub });
        }

        if (obj.data && typeof obj.data === 'object') findSources(obj.data);
    };

    findSources(data);
    return sources;
}

// ═══════════════════════════════════════════════════════════════════════════
// groupSourcesByLanguage
// Groups a flat sources array into { language: { quality: sourceObj } }
//
// Input:  [{ url, quality, lang, type, ... }, ...]
// Output: {
//   "Original Audio": { "1080": {...}, "720": {...}, "480": {...} },
//   "Hindi":          { "1080": {...}, "480": {...} },
//   "French":         { "360": {...}, "480": {...}, "720": {...}, "1080": {...} },
// }
//
// Sources are expected to be pre-sorted by quality (highest first).
// First source encountered at each lang:quality key wins.
// ═══════════════════════════════════════════════════════════════════════════
export function groupSourcesByLanguage(sources) {
    if (!Array.isArray(sources) || sources.length === 0) return {};

    const grouped = {};

    for (const src of sources) {
        const lang = src.lang || 'Original Audio';
        const quality = String(src.quality).replace(/[^\d]/g, '') || 'auto';

        if (!grouped[lang]) grouped[lang] = {};

        // First-encountered wins (sources are quality-sorted: 1080 before 720, etc.)
        if (!grouped[lang][quality]) {
            grouped[lang][quality] = src;
        }
    }

    return grouped;
}

// ═══════════════════════════════════════════════════════════════════════════
// movieService
// ═══════════════════════════════════════════════════════════════════════════
const movieService = {
    /**
     * Fetch movie sources from all providers in priority order.
     * Returns: [{ provider, sources, data }]
     */
    async getAllMovieSources(tmdbId) {
        const results = [];

        for (const p of PROVIDERS) {
            try {
                const res = await fetch(`${EXTERNAL_MOVIE_API}/${p}/movie/${tmdbId}`, {
                    signal: AbortSignal.timeout(10_000),
                });

                if (!res.ok) {
                    console.warn(`[movieService] ${p} HTTP ${res.status} for movie ${tmdbId}`);
                    continue;
                }

                const data = await res.json();
                const sources = sortByQuality(normalizeSources(data, p));

                if (sources.length === 0) {
                    console.warn(`[movieService] ${p} → no parseable sources for movie ${tmdbId}`);
                    continue;
                }

                results.push({ provider: p, sources, data });
            } catch (err) {
                console.error(`[movieService] ${p} failed for movie ${tmdbId}:`, err.message);
            }
        }

        return results;
    },

    /**
     * Fetch TV episode sources from all providers in priority order.
     */
    async getAllTVSources(tmdbId, season, episode) {
        const results = [];

        for (const p of PROVIDERS) {
            try {
                const res = await fetch(
                    `${EXTERNAL_MOVIE_API}/${p}/tv/${tmdbId}/${season}/${episode}`,
                    { signal: AbortSignal.timeout(10_000) }
                );

                if (!res.ok) {
                    console.warn(`[movieService] ${p} HTTP ${res.status} for tv ${tmdbId} S${season}E${episode}`);
                    continue;
                }

                const data = await res.json();
                const sources = sortByQuality(normalizeSources(data, p));

                if (sources.length === 0) {
                    console.warn(`[movieService] ${p} → no parseable sources for tv ${tmdbId} S${season}E${episode}`);
                    continue;
                }

                results.push({ provider: p, sources, data });
            } catch (err) {
                console.error(`[movieService] ${p} failed for tv ${tmdbId} S${season}E${episode}:`, err.message);
            }
        }

        return results;
    },
};

export default movieService;