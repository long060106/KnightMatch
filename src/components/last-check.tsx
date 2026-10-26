"use client";

import { useEffect, useState } from "react";
import { RelativeTime } from "./relative-time";

let live: Promise<string | null> | null = null;

/** One request per page load, shared by every "Last check" on the page. */
function fetchLastCheck(): Promise<string | null> {
  live ??= fetch("/api/status")
    .then((r) => (r.ok ? r.json() : null))
    .then((body) => (typeof body?.lastCheckAt === "string" ? body.lastCheckAt : null))
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
