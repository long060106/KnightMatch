"use client";

import { formatDate, formatDateTime, formatRelative, useNow } from "@/lib/time";

/** "2 hours ago" in the browser; a plain date in the prerendered HTML. */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  const now = useNow();
  return (
    <time dateTime={iso} title={formatDateTime(iso)} className={className}>
      {now === null ? `on ${formatDate(iso)}` : formatRelative(iso, now)}
    </time>
  );
}
