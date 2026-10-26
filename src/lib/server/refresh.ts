/**
 * Starts the KRSP scrape workflow on GitHub when it is due. GitHub's own hourly schedule is
 * best-effort and on this repo it often runs 3 to 7 hours apart, so an outside timer (and any
 * visitor who sees an old "Last check") asks /api/refresh instead. Nothing here can make it run
 * more than once every MIN_GAP_MS, so the route needs no secret.
 */

export const MIN_GAP_MS = 50 * 60_000;
/** Between two GitHub lookups from the same server instance. */
const ASK_GAP_MS = 2 * 60_000;
const RUNNING = new Set(["queued", "in_progress", "waiting", "pending", "requested"]);

export const REPO = `${process.env.VERCEL_GIT_REPO_OWNER || "long060106"}/${process.env.VERCEL_GIT_REPO_SLUG || "KnightMatch"}`;
const WORKFLOW = `https://api.github.com/repos/${REPO}/actions/workflows/scrape.yml`;

export interface LatestRun {
  status: string;
  created_at: string;
}

export type RefreshResult =
  | { triggered: true }
  | { triggered: false; reason: "running" | "recent" | "asked-recently" | "not-set-up" | "github-error" };

/** Whether a new run should start, given the newest run of the workflow (any outcome). */
export function isDue(latest: LatestRun | null, now = Date.now()): "due" | "running" | "recent" {
  if (!latest) return "due";
  if (RUNNING.has(latest.status)) return "running";
  return now - Date.parse(latest.created_at) < MIN_GAP_MS ? "recent" : "due";
}

let lastAsked = 0;

export async function refreshIfDue(now = Date.now()): Promise<RefreshResult> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { triggered: false, reason: "not-set-up" };
  if (now - lastAsked < ASK_GAP_MS) return { triggered: false, reason: "asked-recently" };
  lastAsked = now;

  const headers = {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "user-agent": "KnightMatch",
    "x-github-api-version": "2022-11-28",
  };
  try {
    const runs = await fetch(`${WORKFLOW}/runs?per_page=1`, { headers, signal: AbortSignal.timeout(5_000), cache: "no-store" });
    if (!runs.ok) throw new Error(`runs ${runs.status}`);
    const latest: LatestRun | null = (await runs.json())?.workflow_runs?.[0] ?? null;
    const due = isDue(latest, now);
    if (due !== "due") return { triggered: false, reason: due };

    const dispatch = await fetch(`${WORKFLOW}/dispatches`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ref: "main" }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!dispatch.ok) throw new Error(`dispatch ${dispatch.status}`);
    return { triggered: true };
  } catch (error) {
    console.error("refresh:", error instanceof Error ? error.message : error);
    return { triggered: false, reason: "github-error" };
  }
}
