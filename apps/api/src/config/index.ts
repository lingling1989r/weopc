import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3002,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL!,
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3003',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  search: {
    openSerpBaseUrl: process.env.OPENSERP_BASE_URL || '',
    openSerpApiKey: process.env.OPENSERP_API_KEY || undefined,
    timeoutMs: parseInt(process.env.SEARCH_TIMEOUT_MS || '8000'),
    cacheTtlMs: parseInt(process.env.SEARCH_CACHE_TTL_MS || '300000'),
    directFallback: process.env.SEARCH_DIRECT_FALLBACK !== 'false',
    rateLimitWindowMs: parseInt(process.env.SEARCH_RATE_LIMIT_WINDOW_MS || '900000'),
    rateLimitMaxRequests: parseInt(process.env.SEARCH_RATE_LIMIT_MAX_REQUESTS || '30'),
  },
};
