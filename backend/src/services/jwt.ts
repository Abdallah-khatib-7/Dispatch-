import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.ts';

// Minimal HS256 JWT (sign + verify) using node crypto. Avoids a third-party
// dependency for what is a few lines of well-understood code. Single-user tool:
// the token authorizes the internal/data API.

const b64url = (buf: Buffer): string =>
  buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const b64urlJson = (obj: unknown): string => b64url(Buffer.from(JSON.stringify(obj), 'utf8'));

const fromB64url = (s: string): Buffer =>
  Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

const sign = (data: string): string =>
  b64url(createHmac('sha256', env.jwt.secret).update(data).digest());

interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

const parseDurationToSeconds = (d: string): number => {
  const m = /^(\d+)([smhd])$/.exec(d.trim());
  if (!m) {
    const n = Number.parseInt(d, 10);
    if (Number.isNaN(n)) throw new Error(`Invalid JWT_EXPIRES_IN: ${d}`);
    return n;
  }
  const value = Number.parseInt(m[1]!, 10);
  const unit = m[2]!;
  const mult = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
  return value * mult;
};

export const signToken = (sub: string): string => {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = { sub, iat: now, exp: now + parseDurationToSeconds(env.jwt.expiresIn) };
  const head = b64urlJson({ alg: 'HS256', typ: 'JWT' });
  const body = b64urlJson(payload);
  const sig = sign(`${head}.${body}`);
  return `${head}.${body}.${sig}`;
};

export const verifyToken = (token: string): JwtPayload => {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [head, body, sig] = parts as [string, string, string];

  const expected = sign(`${head}.${body}`);
  const a = fromB64url(sig);
  const b = fromB64url(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('Bad signature');

  const payload = JSON.parse(fromB64url(body).toString('utf8')) as JwtPayload;
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  return payload;
};
