/**
 * The one Postgres connection pool (Neon on Vercel), used only for accounts. Created on first use,
 * so building the site and every page that does not touch an account need no database.
 */

import { Pool } from "pg";

let pool: Pool | null | undefined;

/** null when DATABASE_URL is not set (accounts are then off). */
export function getPool(): Pool | null {
  if (pool === undefined) {
    const url = process.env.DATABASE_URL?.trim();
    // Serverless functions come and go: few connections, closed soon after they go quiet.
    pool = url ? new Pool({ connectionString: url, max: 3, idleTimeoutMillis: 10_000 }) : null;
  }
  return pool;
}
