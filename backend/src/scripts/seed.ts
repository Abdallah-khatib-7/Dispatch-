import { pool } from '../config/db.ts';
import { ensureSchema } from '../database/migrate.ts';
import { processEmail, emptySummary } from '../services/pipeline.ts';
import type { ParsedEmail } from '../types/index.ts';

// Offline end-to-end proof of steps 3-7 (extraction heuristic path, dedup,
// persistence, review flagging, stats) without live Gmail or OpenAI. Feeds
// realistic fixtures through the exact same processEmail path the live loop uses.
// Usage: node --experimental-strip-types --env-file=.env src/scripts/seed.ts

const ACCOUNT = 'seed-tester@gmail.com';

const email = (
  id: string,
  from: string,
  subject: string,
  body: string,
  isoDate: string,
): ParsedEmail => ({
  messageId: id,
  threadId: `t-${id}`,
  from,
  to: ACCOUNT,
  subject,
  bodyText: body,
  snippet: body.slice(0, 120),
  receivedAt: new Date(isoDate),
});

const fixtures: ParsedEmail[] = [
  // LinkedIn original + ~3-day reminder for the SAME application -> 1 app, 2 sources.
  email('ln-1', 'jobs-noreply@linkedin.com', 'Your application was sent to Stripe',
    'Your application was sent to Stripe. Backend Engineer.', '2026-07-01T09:00:00Z'),
  email('ln-2', 'jobs-noreply@linkedin.com', 'Your application was sent to Stripe',
    'Reminder: Your application was sent to Stripe. Backend Engineer.', '2026-07-04T09:00:00Z'),

  // Workable confirmation + follow-up for the SAME application -> collapses.
  email('wk-1', 'no-reply@workable.com', 'Thank you for applying to Acme',
    'Thank you for applying to Product Designer at Acme. We received your application.', '2026-07-10T12:00:00Z'),
  email('wk-2', 'no-reply@workable.com', 'Update on your Acme application',
    'Thank you for applying to Product Designer at Acme Inc. Our team is reviewing.', '2026-07-15T08:30:00Z'),

  // Distinct company -> separate application.
  email('gh-1', 'no-reply@greenhouse.io', 'Thank you for applying to Netflix',
    'Thank you for applying to Site Reliability Engineer at Netflix.', '2026-07-12T10:00:00Z'),

  // Ambiguous marketing/newsletter -> not an application, ignored.
  email('nl-1', 'digest@linkedin.com', '10 jobs you may be interested in',
    'Here are jobs you may be interested in this week. Apply now to explore roles.', '2026-07-13T07:00:00Z'),

  // Re-ingest of ln-1 (same message id) -> idempotent, no double count.
  email('ln-1', 'jobs-noreply@linkedin.com', 'Your application was sent to Stripe',
    'Your application was sent to Stripe. Backend Engineer.', '2026-07-01T09:00:00Z'),
];

const main = async (): Promise<void> => {
  await ensureSchema();

  // Clean slate for this account so the run is deterministic.
  const [apps] = await pool.query<(import('mysql2').RowDataPacket & { id: number })[]>(
    'SELECT id FROM applications WHERE account = :a', { a: ACCOUNT },
  );
  if (apps.length) {
    const ids = apps.map((a) => a.id);
    await pool.query('DELETE FROM application_sources WHERE application_id IN (?)', [ids]);
    await pool.query('DELETE FROM applications WHERE account = ?', [ACCOUNT]);
  }

  const summary = emptySummary(fixtures.length);
  for (const e of fixtures) {
    await processEmail(ACCOUNT, e, { allowLlm: false }, summary);
  }

  process.stdout.write(`Seed summary:\n${JSON.stringify(summary, null, 2)}\n`);

  const [rows] = await pool.query<(import('mysql2').RowDataPacket)[]>(
    `SELECT company, role, status, review_status, source_count, confidence
       FROM applications WHERE account = :a ORDER BY first_seen_at`, { a: ACCOUNT },
  );
  process.stdout.write(`\nApplications for ${ACCOUNT}:\n${JSON.stringify(rows, null, 2)}\n`);
  await pool.end();
};

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
