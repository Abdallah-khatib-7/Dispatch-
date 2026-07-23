// Central, validated access to environment configuration. Fails fast at startup
// if a required secret is missing so we never boot half-configured.

const required = (name: string): string => {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
};

const optional = (name: string, fallback: string): string => {
  const v = process.env[name];
  return v && v.trim() !== '' ? v : fallback;
};

const asInt = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw || raw.trim() === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) throw new Error(`Env var ${name} must be an integer`);
  return n;
};

const tokenKey = required('TOKEN_ENCRYPTION_KEY');
if (!/^[0-9a-fA-F]{64}$/.test(tokenKey)) {
  throw new Error('TOKEN_ENCRYPTION_KEY must be 64 hex chars (32 bytes for AES-256)');
}

const openaiKey = process.env.OPENAI_API_KEY?.trim() ?? '';

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: asInt('PORT', 3000),

  db: {
    host: required('DB_HOST'),
    port: asInt('DB_PORT', 3306),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    name: required('DB_NAME'),
  },

  google: {
    clientId: required('GOOGLE_CLIENT_ID'),
    clientSecret: required('GOOGLE_CLIENT_SECRET'),
    redirectUri: required('GOOGLE_REDIRECT_URI'),
  },

  tokenEncryptionKey: tokenKey,

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: optional('JWT_EXPIRES_IN', '7d'),
  },

  openai: {
    apiKey: openaiKey,
    enabled: openaiKey.length > 0,
    model: optional('OPENAI_MODEL', 'gpt-4o-mini'),
    maxRequestsPerDay: asInt('LLM_MAX_REQUESTS_PER_DAY', 500),
  },

  // Extractions at or above this confidence are auto-counted; below it they are
  // held for manual review. 0.75 keeps genuine LinkedIn/ATS confirmations (which
  // score high) flowing while catching ambiguous marketing/newsletter noise.
  confidenceThreshold: 0.75,

  corsOrigin: optional('CORS_ORIGIN', 'http://localhost:5173'),
  logLevel: optional('LOG_LEVEL', 'info'),
} as const;

export const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
