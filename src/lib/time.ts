"use client";

import { useSyncExternalStore } from "react";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "5 minutes ago", "2 hours ago", "yesterday", "3 days ago", then a date. */
export function formatRelative(iso: string, now: number): string {
  const diff = Math.max(0, now - Date.parse(iso));
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return plural(Math.floor(diff / MINUTE), "minute");
  if (diff < DAY) return plural(Math.floor(diff / HOUR), "hour");
  if (diff < 2 * DAY) return "yesterday";
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} days ago`;
  return `on ${formatDate(iso)}`;
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}

/** Dates are shown in Orlando time. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });
}

let minuteNow = Math.floor(Date.now() / MINUTE) * MINUTE;

function subscribe(onChange: () => void): () => void {
  const timer = window.setInterval(() => {
    minuteNow = Math.floor(Date.now() / MINUTE) * MINUTE;
    onChange();
  }, MINUTE);
  return () => window.clearInterval(timer);
}

/**
 * Current time rounded to the minute, or null while prerendering.
 * Prerendered HTML shows absolute dates; the browser swaps in "2 hours ago" without a mismatch.
 */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => minuteNow,
    () => null,
  );
}
