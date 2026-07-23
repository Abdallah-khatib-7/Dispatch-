import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool } from '../config/db.ts';
import { logger } from '../config/logger.ts';

const here = dirname(fileURLToPath(import.meta.url));

// Applies schema.sql. All statements are CREATE TABLE IF NOT EXISTS, so this is
// idempotent and safe to run at every boot.
export const ensureSchema = async (): Promise<void> => {
  const sql = await readFile(join(here, 'schema.sql'), 'utf8');
  // Strip line comments first (handles CRLF), then split into statements.
  const statements = sql
    .split(/\r?\n/)
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const conn = await pool.getConnection();
  try {
    for (const stmt of statements) {
      await conn.query(stmt);
    }
    logger.info('Schema ensured', { statements: statements.length });
  } finally {
    conn.release();
  }
};
