require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'movies4hub',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  externalApis: {
    movieApi: process.env.MOVIE_API_URL || 'https://movies4hub-movie-api-production.up.railway.app',
    animeApi: process.env.ANIME_API_URL || 'https://animeverseapi.vercel.app',
    tmdbApiKey: process.env.TMDB_API_KEY || '0b5803aeab6bb79c26d84afd16b32274',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_dev_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
};
