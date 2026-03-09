const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const premiumRoutes = require('./routes/premiumRoutes');
const adsRoutes = require('./routes/adsRoutes');
const contentRoutes = require('./routes/contentRoutes');
const proxyRoutes = require('./routes/proxyRoutes');
const watchHistoryRoutes = require('./routes/watchHistoryRoutes');
const watchlistRoutes = require('./routes/watchlistRoutes');
const searchRoutes = require('./routes/searchRoutes');
const seoRoutes = require('./routes/seoRoutes');
const tmdbRoutes = require('./routes/tmdbRoutes');

const app = express();

// ─── Security ────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting (per IP) ─────────────────────────
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
    message: { success: false, message: 'Too many requests, please try again later' },
});

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
    message: { success: false, message: 'Too many auth attempts, try again later' },
});

app.use('/api/', apiLimiter);

// ─── Body Parsing ────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── SEO Routes (must be before API routes) ──────────
app.use(seoRoutes);

// ─── Health Check (enhanced) ─────────────────────────
const circuitBreaker = require('./services/circuitBreaker');
const { isAvailable: isRedisAvailable } = require('./config/redis');
const pool = require('./config/db');

app.get('/api/health', async (req, res) => {
    let dbStatus = 'unknown';
    try {
        const conn = await pool.getConnection();
        conn.release();
        dbStatus = 'connected';
    } catch {
        dbStatus = 'disconnected';
    }

    res.status(200).json({
        success: true,
        message: 'Movies4Hub API is running',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        services: {
            database: dbStatus,
            redis: isRedisAvailable() ? 'connected' : 'disconnected',
            providers: circuitBreaker.getStatus(),
        },
        uptime: Math.floor(process.uptime()),
    });
});

// ─── API Routes ──────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/watch-history', watchHistoryRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/tmdb', tmdbRoutes);

// ─── Admin Ad Settings ──────────────────────────────
const { requireAuth } = require('./middleware/auth');
const { requireRole } = require('./middleware/role');
const adSettingsController = require('./controllers/adSettingsController');

app.get('/api/admin/ads/settings', requireAuth, requireRole('super_admin'), adSettingsController.getSettings);
app.post('/api/admin/ads/settings', requireAuth, requireRole('super_admin'), adSettingsController.updateSettings);

// ─── 404 Handler ─────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});

// ─── Global Error Handler ────────────────────────────
app.use(errorHandler);

// ─── Unhandled Rejection / Exception Guards ──────────
process.on('unhandledRejection', (reason) => {
    console.error('⚠️ Unhandled Rejection:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    // Don't exit in development
    if (config.nodeEnv === 'production') {
        process.exit(1);
    }
});

// ─── Start Server ────────────────────────────────────
const PORT = config.port;
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║         🎬 Movies4Hub API Server v5          ║
║──────────────────────────────────────────────║
║  Port:        ${String(PORT).padEnd(30)}║
║  Environment: ${config.nodeEnv.padEnd(30)}║
║  Health:      http://localhost:${PORT}/api/health  ║
║  Phase:       5 (Stability + SEO + Revenue)  ║
╚══════════════════════════════════════════════╝
  `);
});

module.exports = app;
