import { badRequest } from './errors.ts';

// Small, explicit validators. Every route that takes external input runs its
// values through these — no silent coercion of junk into queries.

export const asString = (v: unknown, field: string, maxLen = 512): string => {
  if (typeof v !== 'string' || v.trim() === '') throw badRequest(`${field} must be a non-empty string`);
  if (v.length > maxLen) throw badRequest(`${field} exceeds ${maxLen} chars`);
  return v.trim();
};

export const optString = (v: unknown, field: string, maxLen = 512): string | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  return asString(v, field, maxLen);
};

export const optInt = (v: unknown, field: string, min: number, max: number, fallback: number): number => {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  if (!Number.isInteger(n)) throw badRequest(`${field} must be an integer`);
  if (n < min || n > max) throw badRequest(`${field} must be between ${min} and ${max}`);
  return n;
};

export const oneOf = <T extends string>(v: unknown, field: string, allowed: readonly T[]): T | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    throw badRequest(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return v as T;
};

// Accepts YYYY-MM-DD or an ISO timestamp; returns a MySQL DATETIME string.
export const optDate = (v: unknown, field: string): string | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const s = String(v);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw badRequest(`${field} must be a valid date`);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};
