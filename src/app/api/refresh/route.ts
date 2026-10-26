import { refreshIfDue } from "@/lib/server/refresh";

/**
 * GET or POST /api/refresh → { triggered, reason? }
 * Starts the KRSP check on GitHub if the last one began more than 50 minutes ago. An outside
 * timer (cron-job.org, see README) calls it every hour; the "Last check" label calls it when the
 * time it shows is over an hour old.
 */
async function handle() {
  const result = await refreshIfDue();
  return Response.json(result, {
    status: !result.triggered && result.reason === "not-set-up" ? 503 : 200,
    headers: { "cache-control": "no-store" },
  });
}

export const GET = handle;
export const POST = handle;
