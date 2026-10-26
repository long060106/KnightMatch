import { meta } from "@/lib/data";

// Rebuilt at most every 5 minutes, so GitHub sees ~12 requests an hour however many people visit.
export const revalidate = 300;

const REPO = `${process.env.VERCEL_GIT_REPO_OWNER || "long060106"}/${process.env.VERCEL_GIT_REPO_SLUG || "KnightMatch"}`;

/**
 * GET /api/status → { lastCheckAt }
 * The hourly scrape only commits (and redeploys) when the KRSP list changed, so the build's
 * meta.last_run_at can be hours old even though the list was checked minutes ago. The latest
 * successful run of the workflow says when it was really checked.
 */
export async function GET() {
  let lastCheckAt = meta.last_run_at;
  try {
    const headers: Record<string, string> = { accept: "application/vnd.github+json", "user-agent": "KnightMatch" };
    if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const response = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/scrape.yml/runs?status=success&per_page=1`,
      { headers, signal: AbortSignal.timeout(5_000) },
    );
    const runAt: unknown = response.ok ? (await response.json())?.workflow_runs?.[0]?.updated_at : null;
    if (typeof runAt === "string" && Date.parse(runAt) > Date.parse(lastCheckAt)) lastCheckAt = runAt;
  } catch {
    // GitHub unreachable: the build's own time is still true, just older.
  }
  return Response.json({ lastCheckAt });
}
