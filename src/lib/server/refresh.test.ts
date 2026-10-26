import { afterEach, describe, expect, it, vi } from "vitest";
import { isDue, MIN_GAP_MS, refreshIfDue } from "./refresh";

const NOW = Date.parse("2026-10-26T19:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("isDue", () => {
  it("starts a run when none exists or the last one began over 50 minutes ago", () => {
    expect(isDue(null, NOW)).toBe("due");
    expect(isDue({ status: "completed", created_at: ago(MIN_GAP_MS + 1) }, NOW)).toBe("due");
  });

  it("waits while a run is queued or going, or began recently", () => {
    expect(isDue({ status: "queued", created_at: ago(3 * 3_600_000) }, NOW)).toBe("running");
    expect(isDue({ status: "in_progress", created_at: ago(60_000) }, NOW)).toBe("running");
    expect(isDue({ status: "completed", created_at: ago(10 * 60_000) }, NOW)).toBe("recent");
  });
});

describe("refreshIfDue", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("does nothing without a token", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(refreshIfDue(NOW)).resolves.toEqual({ triggered: false, reason: "not-set-up" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("dispatches the workflow when due, then asks GitHub at most every 2 minutes", async () => {
    vi.stubEnv("GITHUB_TOKEN", "t");
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ workflow_runs: [{ status: "completed", created_at: ago(4 * 3_600_000) }] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    await expect(refreshIfDue(NOW)).resolves.toEqual({ triggered: true });
    expect(fetch.mock.calls[1][0]).toMatch(/scrape\.yml\/dispatches$/);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ ref: "main" });

    await expect(refreshIfDue(NOW + 60_000)).resolves.toEqual({ triggered: false, reason: "asked-recently" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
