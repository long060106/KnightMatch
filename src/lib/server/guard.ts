/**
 * Small guards for the API routes. No database, so the rate limit is per server instance and
 * best-effort: enough to stop one tab from burning the free AI quota, not a security boundary.
 */

import type { NextRequest } from "next/server";

/** Requests from another site's page are refused; tools like curl send no Sec-Fetch-Site and pass. */
export function fromThisSite(request: NextRequest): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export function clientKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

const hits = new Map<string, number[]>();

/** True if `key` has made fewer than `max` calls in the last `windowMs`, and counts this one. */
export function withinLimit(bucket: string, key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const id = `${bucket}:${key}`;
  const recent = (hits.get(id) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(id, recent);
    return false;
  }
  recent.push(now);
  hits.set(id, recent);
  if (hits.size > 5_000) {
    for (const [k, times] of hits) if (times.every((t) => now - t >= windowMs)) hits.delete(k);
  }
  return true;
}
