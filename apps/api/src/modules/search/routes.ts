import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../../config';
import { authenticate } from '../../shared/middleware/auth';
import { SearchService, validateSearchInput } from './service';

const router: ReturnType<typeof Router> = Router();
const searchService = new SearchService({
  openSerpBaseUrl: config.search.openSerpBaseUrl,
  openSerpApiKey: config.search.openSerpApiKey,
  timeoutMs: config.search.timeoutMs,
  cacheTtlMs: config.search.cacheTtlMs,
  directFallback: config.search.directFallback,
});

const searchRateLimit = rateLimit({
  windowMs: config.search.rateLimitWindowMs,
  limit: config.search.rateLimitMaxRequests,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'SEARCH_RATE_LIMITED',
      message: '搜索请求过于频繁，请稍后再试',
    },
  },
});

router.get('/platforms', (_req, res) => {
  res.json({
    success: true,
    data: searchService.getPlatforms(),
  });
});

router.post('/query', authenticate, searchRateLimit, async (req, res, next) => {
  try {
    const defaultPlatforms = searchService.getPlatforms()
      .filter((platform) => platform.available)
      .slice(0, 2)
      .map((platform) => platform.id);
    const input = validateSearchInput(req.body, defaultPlatforms);
    const data = await searchService.search(input);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
