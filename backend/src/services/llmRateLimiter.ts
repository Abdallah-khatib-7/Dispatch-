import { pool } from '../config/db.ts';
import { env } from '../config/env.ts';

// Persisted per-day counter so the cost cap survives restarts. Reserve-before-
// spend inside a transaction with row locking: fail safe (deny) rather than
// risk overspending under any concurrency.

export interface RateDecision {
  allowed: boolean;
  used: number;
  cap: number;
}

export const tryConsume = async (): Promise<RateDecision> => {
  const cap = env.openai.maxRequestsPerDay;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      'INSERT IGNORE INTO llm_usage (usage_day, request_count) VALUES (CURDATE(), 0)',
    );
    const [rows] = await conn.query<(import('mysql2').RowDataPacket & { request_count: number })[]>(
      'SELECT request_count FROM llm_usage WHERE usage_day = CURDATE() FOR UPDATE',
    );
    const used = rows[0]?.request_count ?? 0;
    if (used >= cap) {
      await conn.commit();
      return { allowed: false, used, cap };
    }
    await conn.execute(
      'UPDATE llm_usage SET request_count = request_count + 1 WHERE usage_day = CURDATE()',
    );
    await conn.commit();
    return { allowed: true, used: used + 1, cap };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

export const usageToday = async (): Promise<RateDecision> => {
  const cap = env.openai.maxRequestsPerDay;
  const [rows] = await pool.query<(import('mysql2').RowDataPacket & { request_count: number })[]>(
    'SELECT request_count FROM llm_usage WHERE usage_day = CURDATE()',
  );
  const used = rows[0]?.request_count ?? 0;
  return { allowed: used < cap, used, cap };
};
