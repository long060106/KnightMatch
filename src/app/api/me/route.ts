import type { NextRequest } from "next/server";
import { profileFrom } from "@/lib/profile";
import { getAuth } from "@/lib/server/auth";
import { getPool } from "@/lib/server/db";
import { fromThisSite, withinLimit } from "@/lib/server/guard";
import { applyPush, EMPTY_DATA, MAX_BODY_CHARS, parsePush, type SyncedData } from "@/lib/sync";
import { trackerFrom } from "@/lib/tracker";

const NO_STORE = { "cache-control": "private, no-store" };

interface Row {
  profile: unknown;
  tracker: unknown;
  version: number | string;
}

const toData = (row: Row | undefined): SyncedData =>
  row ? { profile: profileFrom(row.profile), tracker: trackerFrom(row.tracker), version: Number(row.version) } : EMPTY_DATA;

async function signedIn(request: NextRequest) {
  const auth = getAuth();
  const pool = getPool();
  if (!auth || !pool) return { status: 404 } as const;
  const session = await auth.api.getSession({ headers: request.headers });
  return session ? ({ pool, userId: session.user.id } as const) : ({ status: 401 } as const);
}

/**
 * GET /api/me → { profile, tracker, version }: the signed-in student's skills, courses and list.
 * PUT /api/me with { profile, tracker, base } saves this device's copy (merged with the account's
 * when another device saved since `base`) and returns what the account now holds.
 * Nothing else about the student is stored: no resume, no drafted emails, no team leader addresses.
 */
export async function GET(request: NextRequest) {
  const who = await signedIn(request);
  if ("status" in who) return Response.json(null, { status: who.status, headers: NO_STORE });
  const { rows } = await who.pool.query<Row>("SELECT profile, tracker, version FROM user_data WHERE user_id = $1", [who.userId]);
  return Response.json(toData(rows[0]), { headers: NO_STORE });
}

export async function PUT(request: NextRequest) {
  if (!fromThisSite(request)) return Response.json(null, { status: 403, headers: NO_STORE });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_CHARS * 4) {
    return Response.json(null, { status: 413, headers: NO_STORE });
  }
  const who = await signedIn(request);
  if ("status" in who) return Response.json(null, { status: who.status, headers: NO_STORE });
  if (!withinLimit("me", who.userId, 60, 60_000)) return Response.json(null, { status: 429, headers: NO_STORE });
  const push = parsePush(await request.text());
  if (!push) return Response.json(null, { status: 400, headers: NO_STORE });

  const client = await who.pool.connect();
  try {
    await client.query("BEGIN");
    // The empty row first, so two first saves at once queue on the same lock instead of racing.
    await client.query("INSERT INTO user_data (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [who.userId]);
    const { rows } = await client.query<Row>("SELECT profile, tracker, version FROM user_data WHERE user_id = $1 FOR UPDATE", [who.userId]);
    const next = applyPush(toData(rows[0]), push.data, push.base);
    await client.query(
      "UPDATE user_data SET profile = $2, tracker = $3, version = $4, updated_at = now() WHERE user_id = $1",
      [who.userId, next.profile && JSON.stringify(next.profile), JSON.stringify(next.tracker), next.version],
    );
    await client.query("COMMIT");
    return Response.json(next, { headers: NO_STORE });
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return Response.json(null, { status: 500, headers: NO_STORE });
  } finally {
    client.release();
  }
}
