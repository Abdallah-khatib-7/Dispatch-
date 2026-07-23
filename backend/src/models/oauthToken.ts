import { pool, type Row } from '../config/db.ts';
import { encryptField, decryptField } from '../config/encryption.ts';

// Persistence for Gmail OAuth tokens. Tokens are AES-256-GCM encrypted per
// field; plaintext exists only transiently in memory here and is never logged.

export interface StoredTokens {
  googleEmail: string;
  accessToken: string;
  refreshToken: string;
  expiryDate: number; // epoch ms
  scope: string;
}

interface OAuthRow extends Row {
  google_email: string;
  access_token_encrypted: string;
  access_token_iv: string;
  access_token_auth_tag: string;
  refresh_token_encrypted: string;
  refresh_token_iv: string;
  refresh_token_auth_tag: string;
  expiry_date: number;
  scope: string;
}

export const upsertTokens = async (t: StoredTokens): Promise<void> => {
  const at = encryptField(t.accessToken);
  const rt = encryptField(t.refreshToken);
  await pool.execute(
    `INSERT INTO oauth_tokens
      (google_email, access_token_encrypted, access_token_iv, access_token_auth_tag,
       refresh_token_encrypted, refresh_token_iv, refresh_token_auth_tag, expiry_date, scope)
     VALUES (:email, :atc, :ativ, :attag, :rtc, :rtiv, :rttag, :exp, :scope)
     ON DUPLICATE KEY UPDATE
       access_token_encrypted = :atc, access_token_iv = :ativ, access_token_auth_tag = :attag,
       refresh_token_encrypted = :rtc, refresh_token_iv = :rtiv, refresh_token_auth_tag = :rttag,
       expiry_date = :exp, scope = :scope`,
    {
      email: t.googleEmail,
      atc: at.ciphertext, ativ: at.iv, attag: at.authTag,
      rtc: rt.ciphertext, rtiv: rt.iv, rttag: rt.authTag,
      exp: t.expiryDate, scope: t.scope,
    },
  );
};

const rowToTokens = (r: OAuthRow): StoredTokens => ({
  googleEmail: r.google_email,
  accessToken: decryptField({
    ciphertext: r.access_token_encrypted, iv: r.access_token_iv, authTag: r.access_token_auth_tag,
  }),
  refreshToken: decryptField({
    ciphertext: r.refresh_token_encrypted, iv: r.refresh_token_iv, authTag: r.refresh_token_auth_tag,
  }),
  expiryDate: Number(r.expiry_date),
  scope: r.scope,
});

// Single-account tool: the primary (most recently updated) connected account.
export const getPrimaryTokens = async (): Promise<StoredTokens | null> => {
  const [rows] = await pool.query<OAuthRow[]>(
    'SELECT * FROM oauth_tokens ORDER BY updated_at DESC LIMIT 1',
  );
  const r = rows[0];
  return r ? rowToTokens(r) : null;
};

export const getTokensByEmail = async (email: string): Promise<StoredTokens | null> => {
  const [rows] = await pool.query<OAuthRow[]>(
    'SELECT * FROM oauth_tokens WHERE google_email = :email LIMIT 1',
    { email },
  );
  const r = rows[0];
  return r ? rowToTokens(r) : null;
};

// Refresh may return a new access token but no new refresh token; callers must
// preserve the existing refresh token in that case.
export const updateAccessToken = async (
  email: string,
  accessToken: string,
  expiryDate: number,
): Promise<void> => {
  const at = encryptField(accessToken);
  await pool.execute(
    `UPDATE oauth_tokens
       SET access_token_encrypted = :atc, access_token_iv = :ativ,
           access_token_auth_tag = :attag, expiry_date = :exp
     WHERE google_email = :email`,
    { atc: at.ciphertext, ativ: at.iv, attag: at.authTag, exp: expiryDate, email },
  );
};
