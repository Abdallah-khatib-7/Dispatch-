import { signToken } from '../services/jwt.ts';
import { getPrimaryTokens } from '../models/oauthToken.ts';
import { pool } from '../config/db.ts';

// Prints an API token for testing / the future dashboard. Uses the connected
// account as subject if one exists, else "admin".
const main = async (): Promise<void> => {
  let sub = 'admin';
  try {
    const tokens = await getPrimaryTokens();
    if (tokens) sub = tokens.googleEmail;
  } catch {
    // DB not reachable is fine for token minting; fall back to admin.
  }
  process.stdout.write(`${signToken(sub)}\n`);
  await pool.end().catch(() => undefined);
};

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
