import { google } from 'googleapis';
import type { GoogleClient } from './googleClient.ts';
import { AppError } from '../middleware/errors.ts';
import { env, GMAIL_READONLY_SCOPE } from '../config/env.ts';
import { logger } from '../config/logger.ts';
import {
  getPrimaryTokens,
  upsertTokens,
  updateAccessToken,
  type StoredTokens,
} from '../models/oauthToken.ts';

const newClient = (): GoogleClient =>
  new google.auth.OAuth2(env.google.clientId, env.google.clientSecret, env.google.redirectUri);

// access_type=offline + prompt=consent guarantees Google returns a refresh
// token (it otherwise omits it on repeat consents). Mailbox scope is read-only;
// 'email' is an identity scope only — it tells us which account this is (needed
// to key the tokens) and grants no mailbox access.
export const getAuthUrl = (): string =>
  newClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [GMAIL_READONLY_SCOPE, 'email'],
  });

export interface ExchangeResult {
  googleEmail: string;
}

// Decode the email claim from a Google id_token (JWT). Payload only — the token
// came straight from Google's token endpoint over TLS, so we don't re-verify the
// signature here; we only need the address to key the stored tokens.
const emailFromIdToken = (idToken: string): string | undefined => {
  const parts = idToken.split('.');
  if (parts.length !== 3) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as { email?: string };
    return payload.email;
  } catch {
    return undefined;
  }
};

export const exchangeCodeAndStore = async (code: string): Promise<ExchangeResult> => {
  const client = newClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Google did not return both access and refresh tokens');
  }
  client.setCredentials(tokens);

  // The 'email' scope makes Google return an id_token whose payload carries the
  // address; decode that (delivered directly over TLS from getToken). Fall back
  // to the tokeninfo endpoint if for any reason the id_token is absent.
  let googleEmail = tokens.id_token ? emailFromIdToken(tokens.id_token) : undefined;
  if (!googleEmail) {
    const info = await client.getTokenInfo(tokens.access_token);
    googleEmail = info.email;
  }
  if (!googleEmail) throw new Error('Could not determine Google account email');

  await upsertTokens({
    googleEmail,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date ?? Date.now() + 3600_000,
    scope: tokens.scope ?? GMAIL_READONLY_SCOPE,
  });

  logger.info('Stored OAuth tokens for connected account', { account: googleEmail });
  return { googleEmail };
};

const EXPIRY_SKEW_MS = 60_000; // refresh a minute early to avoid edge failures

// Returns an OAuth2 client with a valid (refreshed if needed) access token for
// the connected account. Re-saves a refreshed access token transparently.
export const getAuthorizedClient = async (): Promise<{ client: GoogleClient; tokens: StoredTokens }> => {
  const tokens = await getPrimaryTokens();
  if (!tokens) {
    throw new AppError(409, 'no_connected_account', 'No connected Google account. Visit /auth/google first.');
  }

  const client = newClient();
  client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
    scope: tokens.scope,
  });

  if (Date.now() >= tokens.expiryDate - EXPIRY_SKEW_MS) {
    const { credentials } = await client.refreshAccessToken();
    if (!credentials.access_token) throw new Error('Token refresh returned no access token');
    const newExpiry = credentials.expiry_date ?? Date.now() + 3600_000;
    await updateAccessToken(tokens.googleEmail, credentials.access_token, newExpiry);
    client.setCredentials({ ...client.credentials, access_token: credentials.access_token, expiry_date: newExpiry });
    tokens.accessToken = credentials.access_token;
    tokens.expiryDate = newExpiry;
    logger.info('Refreshed Gmail access token', { account: tokens.googleEmail });
  }

  return { client, tokens };
};
