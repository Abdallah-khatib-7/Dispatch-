import winston from 'winston';
import { env } from './env.ts';

// Keys whose values must never reach the logs, at any nesting depth.
const REDACT_KEYS = new Set([
  'access_token',
  'accesstoken',
  'refresh_token',
  'refreshtoken',
  'token',
  'authorization',
  'code',
  'client_secret',
  'clientsecret',
  'password',
  'jwt',
  'id_token',
]);

const redact = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value as object)) return '[Circular]';
  seen.add(value as object);

  if (Array.isArray(value)) return value.map((v) => redact(v, seen));

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = REDACT_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : redact(v, seen);
  }
  return out;
};

const redactFormat = winston.format((info) => {
  const redacted = redact(info) as Record<string | symbol, unknown>;
  // redact() only walks string keys (Object.entries), so winston's internal
  // level/message symbols get dropped — that silently breaks transport output.
  for (const sym of Object.getOwnPropertySymbols(info)) {
    redacted[sym] = (info as Record<symbol, unknown>)[sym];
  }
  return redacted as winston.Logform.TransformableInfo;
})();

export const logger = winston.createLogger({
  level: env.logLevel,
  format: winston.format.combine(
    redactFormat,
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    env.nodeEnv === 'development'
      ? winston.format.printf(({ timestamp, level, message, ...rest }) => {
          const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
          return `${timestamp as string} ${level}: ${message as string}${extra}`;
        })
      : winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});