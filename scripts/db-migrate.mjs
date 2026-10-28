// Creates the account tables (db/schema.sql) in the database at DATABASE_URL. Every statement is
// "if not exists", so running it again changes nothing.
//   npm run db:migrate   (reads .env.local if there is one)

import { readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set. Run `vercel env pull .env.local` first, or pass --env-file.");
  process.exit(1);
}

const sql = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(sql);
  const { rows } = await client.query(
    "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
  );
  console.log(`Tables: ${rows.map((r) => r.table_name).join(", ")}`);
} finally {
  await client.end();
}
