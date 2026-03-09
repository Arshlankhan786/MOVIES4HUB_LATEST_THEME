/**
 * SEO Routes — sitemap.xml, robots.txt, JSON-LD, OpenGraph
 */
const express = require('express');
const router = express.Router();
const config = require('../config/env');
const Content = require('../models/Content');
const cacheService = require('../services/cacheService');

const SITE_URL = process.env.SITE_URL || 'https://movies4hub.com';

// ─── robots.txt ──────────────────────────────────────
router.get('/robots.txt', (req, res) => {
    res.type('text/plain').send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard
Disallow: /login
Disallow: /register

Sitemap: ${SITE_URL}/sitemap.xml
`);
});

// ─── sitemap.xml ─────────────────────────────────────
router.get('/sitemap.xml', async (req, res) => {
    try {
        const cached = await cacheService.get('seo:sitemap');
        if (cached) {
            res.type('application/xml').send(cached);
            return;
        }

        // Get all content for sitemap
        let contentItems = [];
        try {
            contentItems = await Content.findAll({ limit: 5000 });
        } catch {
            contentItems = [];
        }

        // Get anime from AnimeVerse
        let animeItems = [];
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5000);
            const animeRes = await fetch(`${config.externalApis.animeApi}/api/home`, {
                signal: controller.signal,
            });
            clearTimeout(timer);
            if (animeRes.ok) {
                const data = await animeRes.json();
                const trending = data?.trending || data?.results || [];
                animeItems = Array.isArray(trending) ? trending : [];
            }
        } catch {
            // Continue without anime
        }

        const now = new Date().toISOString().split('T')[0];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <lastmod>${now}</lastmod>
  </url>
  <url>
    <loc>${SITE_URL}/search</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;

        // Add movie pages
        for (const item of contentItems) {
            const slug = slugify(item.title);
            xml += `
  <url>
    <loc>${SITE_URL}/info/movie/${slug}-${item.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
        }

        // Add anime pages
        for (const item of animeItems) {
            const id = item.id || item.slug || slugify(item.title || item.name || '');
            if (id) {
                xml += `
  <url>
    <loc>${SITE_URL}/info/anime/${id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
            }
        }

        xml += '\n</urlset>';

        await cacheService.set('seo:sitemap', xml, 3600); // 1 hour cache
        res.type('application/xml').send(xml);
    } catch (err) {
        console.error('Sitemap error:', err.message);
        res.status(500).type('application/xml').send(
            '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'
        );
    }
});

// ─── JSON-LD structured data endpoint ────────────────
router.get('/api/seo/jsonld/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;

        if (type === 'movie') {
            const item = await Content.findById(id);
            if (!item) return res.status(404).json({ success: false });

            const jsonld = {
                '@context': 'https://schema.org',
                '@type': 'Movie',
                name: item.title,
                description: item.description || '',
                image: item.poster || '',
                dateCreated: item.createdAt,
                url: `${SITE_URL}/info/movie/${slugify(item.title)}-${item.id}`,
            };
            return res.json(jsonld);
        }

        if (type === 'anime') {
            const jsonld = {
                '@context': 'https://schema.org',
                '@type': 'TVSeries',
                name: id.replace(/-/g, ' '),
                url: `${SITE_URL}/info/anime/${id}`,
            };
            return res.json(jsonld);
        }

        res.status(400).json({ success: false, message: 'Invalid type' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─── OpenGraph meta endpoint ─────────────────────────
router.get('/api/seo/og/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        let meta = {
            'og:site_name': 'Movies4Hub',
            'og:type': 'video.movie',
            'twitter:card': 'summary_large_image',
            'twitter:site': '@movies4hub',
        };

        if (type === 'movie') {
            const item = await Content.findById(id);
            if (item) {
                meta['og:title'] = `${item.title} - Movies4Hub`;
                meta['og:description'] = item.description || `Watch ${item.title} on Movies4Hub`;
                meta['og:image'] = item.poster || item.backdrop || '';
                meta['og:url'] = `${SITE_URL}/info/movie/${slugify(item.title)}-${item.id}`;
                meta['twitter:title'] = item.title;
                meta['twitter:description'] = item.description || `Watch ${item.title}`;
                meta['twitter:image'] = item.poster || '';
            }
        } else if (type === 'anime') {
            const title = id.replace(/-/g, ' ');
            meta['og:title'] = `${title} - Movies4Hub`;
            meta['og:description'] = `Watch ${title} anime on Movies4Hub`;
            meta['og:url'] = `${SITE_URL}/info/anime/${id}`;
            meta['twitter:title'] = title;
            meta['twitter:description'] = `Watch ${title} anime`;
        }

        res.json(meta);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

function slugify(text) {
    return (text || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

module.exports = router;
