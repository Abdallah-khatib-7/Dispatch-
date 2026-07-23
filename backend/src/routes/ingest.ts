import { Router } from 'express';
import { requireAuth } from '../middleware/auth.ts';
import { asyncHandler } from '../middleware/errors.ts';
import { optInt, optString } from '../middleware/validate.ts';
import { runIngest } from '../services/pipeline.ts';
import { usageToday } from '../services/llmRateLimiter.ts';

export const ingestRouter = Router();

// Manual-trigger fetch + extract + dedup. Body is optional.
ingestRouter.post(
  '/run',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const maxResults = optInt(body.maxResults, 'maxResults', 1, 100, 25);
    const query = optString(body.query, 'query', 2048);
    const summary = await runIngest({ maxResults, query });
    res.json({ ok: true, summary });
  }),
);

ingestRouter.get(
  '/usage',
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json(await usageToday());
  }),
);
