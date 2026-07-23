import { runIngest } from '../services/pipeline.ts';
import { pool } from '../config/db.ts';
import { ensureSchema } from '../database/migrate.ts';

// CLI: run a single ingest pass. Usage:
//   npm run fetch:once -- [maxResults] [query...]
const main = async (): Promise<void> => {
  await ensureSchema();
  const [, , maxArg, ...queryParts] = process.argv;
  const maxResults = maxArg ? Number.parseInt(maxArg, 10) : 25;
  const query = queryParts.length ? queryParts.join(' ') : undefined;
  const summary = await runIngest({ maxResults, query });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  await pool.end();
};

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
