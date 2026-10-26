"use client";

import { useEffect, useState } from "react";
import { RelativeTime } from "./relative-time";

let live: Promise<string | null> | null = null;

/** A check over an hour old means GitHub skipped its schedule; the site asks for one (see /api/refresh). */
const STALE_MS = 70 * 60_000;

/** One request per page load, shared by every "Last check" on the page. */
function fetchLastCheck(): Promise<string | null> {
  live ??= fetch("/api/status")
    .then((r) => (r.ok ? r.json() : null))
    .then((body) => {
      const checked = typeof body?.lastCheckAt === "string" ? body.lastCheckAt : null;
      if (checked && Date.now() - Date.parse(checked) > STALE_MS) void fetch("/api/refresh", { method: "POST" }).catch(() => {});
      return checked;
    })
    .catch(() => null);
  return live;
}

/**
 * When the KRSP list was last checked. The page is built with the time of the last data change;
 * the hourly check runs in between without a rebuild, so the newer time is fetched after load.
 */
export function LastCheck({ iso, className }: { iso: string; className?: string }) {
  const [latest, setLatest] = useState(iso);
  useEffect(() => {
    let current = true;
    void fetchLastCheck().then((checked) => {
      if (current && checked && Date.parse(checked) > Date.parse(iso)) setLatest(checked);
    });
    return () => {
      current = false;
    };
  }, [iso]);
  return <RelativeTime iso={latest} className={className} />;
}
