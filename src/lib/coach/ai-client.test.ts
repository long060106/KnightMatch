import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chatJson, parseJsonAnswer } from "./ai-client";

const read = (raw: unknown) => (raw && typeof raw === "object" && "ok" in raw ? (raw as { ok: boolean }) : null);
const options = { messages: [{ role: "user", content: "hi" }], schema: {}, name: "t", effort: "low" as const, read };
const answer = (content: string | object) =>
  new Response(
    JSON.stringify({ choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }] }),
    { status: 200 },
  );

function stubFetch(...responses: Response[]) {
  const fetch = vi.fn();
  for (const r of responses) fetch.mockResolvedValueOnce(r);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const modelOf = (call: unknown[]) => JSON.parse((call[1] as { body: string }).body).model;

describe("parseJsonAnswer", () => {
  it("reads JSON wrapped in a code fence or a sentence", () => {
    expect(parseJsonAnswer('```json\n{"ok":true}\n```')).toEqual({ ok: true });
    expect(parseJsonAnswer('Here you go: {"ok":true} Hope it helps.')).toEqual({ ok: true });
    expect(parseJsonAnswer("no json here")).toBeNull();
    expect(parseJsonAnswer('{"ok": tru')).toBeNull();
  });
});

describe("chatJson", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Models put on cool-down by a 429 stay there for a minute, so each test uses its own model names.
    vi.stubEnv("GEMINI_API_KEY", "k");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("moves to the fallback model when the first one is out of free quota", async () => {
    vi.stubEnv("COACH_AI_MODEL", "first-a");
    vi.stubEnv("COACH_AI_FALLBACK_MODEL", "second-a");
    const fetch = stubFetch(new Response("quota", { status: 429 }), answer({ ok: true }));
    await expect(chatJson(options)).resolves.toEqual({ ok: true });
    expect(fetch.mock.calls.map(modelOf)).toEqual(["first-a", "second-a"]);
  });

  it("skips a model for a minute after it answered 429", async () => {
    vi.stubEnv("COACH_AI_MODEL", "first-b");
    vi.stubEnv("COACH_AI_FALLBACK_MODEL", "second-b");
    stubFetch(new Response("", { status: 429 }), answer({ ok: true }));
    await chatJson(options);
    const fetch = stubFetch(answer({ ok: true }));
    await chatJson(options);
    expect(fetch.mock.calls.map(modelOf)).toEqual(["second-b"]);
  });

  it("asks the same model once more when an answer is unusable, then moves on", async () => {
    vi.stubEnv("COACH_AI_MODEL", "first-c");
    vi.stubEnv("COACH_AI_FALLBACK_MODEL", "second-c");
    const fetch = stubFetch(answer("I can't do JSON"), answer({ nope: 1 }), answer({ ok: true }));
    await expect(chatJson(options)).resolves.toEqual({ ok: true });
    expect(fetch.mock.calls.map(modelOf)).toEqual(["first-c", "first-c", "second-c"]);
  });

  it("treats a server error at the provider like busy and tries the next model", async () => {
    vi.stubEnv("COACH_AI_MODEL", "first-d");
    vi.stubEnv("COACH_AI_FALLBACK_MODEL", "second-d");
    stubFetch(new Response("", { status: 500 }), new Response("", { status: 503 }));
    await expect(chatJson(options)).rejects.toMatchObject({ kind: "busy", code: "http-503" });
  });

  it("says what failed when no answer is usable", async () => {
    vi.stubEnv("COACH_AI_MODEL", "first-e");
    vi.stubEnv("COACH_AI_FALLBACK_MODEL", "first-e");
    stubFetch(answer("x"), answer("y"));
    await expect(chatJson(options)).rejects.toMatchObject({ kind: "failed", code: "bad-answer" });
  });

  it("refuses to call anything without a key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetch = stubFetch();
    await expect(chatJson(options)).rejects.toMatchObject({ kind: "missing-key" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
