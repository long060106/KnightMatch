import { afterEach, describe, expect, it, vi } from "vitest";
import { AiError, chatJson } from "./ai-client";

const options = { messages: [{ role: "user", content: "hi" }], schema: {}, name: "t", effort: "low" as const };
const answer = (content: object) =>
  new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status: 200 });

function stubFetch(...responses: Response[]) {
  const fetch = vi.fn();
  for (const r of responses) fetch.mockResolvedValueOnce(r);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const modelOf = (call: unknown[]) => JSON.parse((call[1] as { body: string }).body).model;

describe("chatJson", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("moves to the fallback model when the first one is out of free quota", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetch = stubFetch(new Response("quota", { status: 429 }), answer({ ok: true }));
    await expect(chatJson(options)).resolves.toEqual({ ok: true });
    expect(fetch.mock.calls.map(modelOf)).toEqual(["gemini-3.5-flash", "gemini-3.5-flash-lite"]);
  });

  it("says busy when every model is out of quota", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch(new Response("", { status: 429 }), new Response("", { status: 503 }));
    await expect(chatJson(options)).rejects.toMatchObject({ kind: "busy" } satisfies Partial<AiError>);
  });

  it("refuses to call anything without a key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetch = stubFetch();
    await expect(chatJson(options)).rejects.toMatchObject({ kind: "missing-key" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
