import { Router } from 'express';
import { getAuthUrl, exchangeCodeAndStore } from '../services/googleAuth.ts';
import { signToken } from '../services/jwt.ts';
import { asyncHandler, badRequest } from '../middleware/errors.ts';
import { logger } from '../config/logger.ts';

export const authRouter = Router();

// Kick off consent. Public: this is how the single account connects.
authRouter.get('/google', (_req, res) => {
  res.redirect(getAuthUrl());
});

// OAuth callback. Exchanges the code, stores encrypted tokens, and returns an
// API token the future dashboard uses for the data endpoints.
authRouter.get(
  '/google/callback',
  asyncHandler(async (req, res) => {
    if (typeof req.query.error === 'string') {
      throw badRequest(`Google returned an error: ${req.query.error}`);
    }
    const code = req.query.code;
    if (typeof code !== 'string' || code === '') throw badRequest('Missing authorization code');

    const { googleEmail } = await exchangeCodeAndStore(code);
    const apiToken = signToken(googleEmail);
    logger.info('Account connected via OAuth callback', { account: googleEmail });

    res.json({
      connected: true,
      account: googleEmail,
      apiToken,
      note: 'Use apiToken as "Authorization: Bearer <apiToken>" for /api endpoints.',
    });
  }),
);
