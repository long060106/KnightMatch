import type { NextRequest } from "next/server";
import { KRSP_PROJECT_PREFIX, leaderEmailFrom } from "@/lib/coach/krsp-contact";
import { getProject } from "@/lib/data";
import { clientKey, fromThisSite, withinLimit } from "@/lib/server/guard";

const USER_AGENT = "KnightMatchBot/0.2 (+https://github.com/long060106/KnightMatch; fetches one page when a student drafts an email)";

/**
 * GET /api/contact?project=krsp-534 → { email }
 * Reads the team leader's address from the live KRSP page so it can go in the To: line. The page is
 * cached for an hour (one KRSP request per project per hour at most); the address is never stored in
 * the repo or logged.
 */
export async function GET(request: NextRequest) {
  const noStore = { "cache-control": "private, no-store" };
  if (!fromThisSite(request)) return Response.json({ email: null }, { status: 403, headers: noStore });
  if (!withinLimit("contact", clientKey(request), 30, 10 * 60_000)) {
    return Response.json({ email: null }, { status: 429, headers: noStore });
  }
  const project = getProject(request.nextUrl.searchParams.get("project") ?? "");
  if (!project || !project.url.startsWith(KRSP_PROJECT_PREFIX)) {
    return Response.json({ email: null }, { status: 404, headers: noStore });
  }
  try {
    const page = await fetch(project.url, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 3_600 },
    });
    const email = page.ok ? leaderEmailFrom(await page.text()) : null;
    return Response.json({ email }, { headers: noStore });
  } catch {
    return Response.json({ email: null }, { headers: noStore });
  }
}
