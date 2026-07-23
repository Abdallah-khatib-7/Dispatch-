import express from 'express';
import type { Request, Response } from 'express';
import { env } from './config/env.ts';
import { logger } from './config/logger.ts';
import { pool } from './config/db.ts';
import { ensureSchema } from './database/migrate.ts';
import { errorHandler, notFound } from './middleware/errors.ts';
import { authRouter } from './routes/auth.ts';
import { ingestRouter } from './routes/ingest.ts';
import { applicationsRouter } from './routes/applications.ts';
import { reviewRouter } from './routes/review.ts';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

// Minimal CORS for the future dashboard origin.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', env.corsOrigin);
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', openai: env.openai.enabled ? 'enabled' : 'heuristic-only' });
});

app.use('/auth', authRouter);
app.use('/api/ingest', ingestRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/review', reviewRouter);

app.use((_req, _res, next) => next(notFound('Route not found')));
app.use(errorHandler);

const start = async (): Promise<void> => {
  await pool.query('SELECT 1');
  await ensureSchema();
  app.listen(env.port, () => {
    logger.info(`Dispatch backend listening on http://localhost:${env.port}`, {
      openai: env.openai.enabled ? 'enabled' : 'heuristic-only',
      llmCapPerDay: env.openai.maxRequestsPerDay,
    });
  });
};

start().catch((err) => {
  logger.error('Failed to start server', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
