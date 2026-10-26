/**
 * Server-side call to an OpenAI-compatible chat endpoint. The default is Gemini's free tier, the
 * same provider the scraper uses (scraper/knightmatch_scraper/ai.py). The key only comes from the
 * environment (Vercel → Settings → Environment Variables), never from the browser.
 */

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
/** The strongest model to try first; override with COACH_AI_MODEL. */
const DEFAULT_MODEL = "gemini-3.5-flash";
/**
 * Tried when the first model is out of free quota, overloaded or unknown. The scraper runs on it
 * every day, so it is known to work on a free key. Override with COACH_AI_FALLBACK_MODEL.
 */
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

export class AiError extends Error {
  constructor(
    message: string,
    readonly kind: "missing-key" | "busy" | "failed",
    /** Short reason shown to the student, so a screenshot says what went wrong. */
    readonly code: string = kind,
  ) {
    super(message);
  }
}

interface ChatOptions<T> {
  messages: { role: string; content: string }[];
  schema: object;
  name: string;
  /** How long the model may think before it answers. */
  effort: "low" | "medium" | "high";
  /** Turns the parsed JSON into what the caller needs; null means the answer is unusable. */
  read: (raw: unknown) => T | null;
  signal?: AbortSignal;
}

export function aiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function models(): string[] {
  const first = process.env.COACH_AI_MODEL?.trim() || DEFAULT_MODEL;
  const fallback = process.env.COACH_AI_FALLBACK_MODEL?.trim() || FALLBACK_MODEL;
  return [...new Set([first, fallback])];
}

/** The provider's own error text, for the server log only (it never contains the resume). */
async function errorText(response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  return body.replace(/\s+/g, " ").slice(0, 300);
}

/** JSON from a model answer, even when it is wrapped in a code fence or a sentence. */
export function parseJsonAnswer(content: string): unknown {
  const text = content.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    return JSON.parse(text);
  } catch {
    const from = text.indexOf("{");
    const to = text.lastIndexOf("}");
    if (from < 0 || to <= from) return null;
    try {
      return JSON.parse(text.slice(from, to + 1));
    } catch {
      return null;
    }
  }
}

/** Models that just answered 429, skipped for a minute so a busy model doesn't add a round trip to every call. */
const coolingDown = new Map<string, number>();
const COOL_DOWN_MS = 60_000;
/** Busy, out of free quota or a hiccup on the provider's side: worth trying the next model. */
const TRY_NEXT = new Set([429, 500, 502, 503, 504]);

export async function chatJson<T>({ messages, schema, name, effort, read, signal }: ChatOptions<T>): Promise<T> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new AiError("GEMINI_API_KEY is not set", "missing-key");
  const baseUrl = (process.env.COACH_AI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
  const all = models();
  const ready = all.filter((m) => (coolingDown.get(m) ?? 0) < Date.now());
  let busy = false;
  let code = "no-answer";

  for (const model of ready.length ? ready : all) {
    // json_schema keeps the answer in shape; some endpoints reject it, so fall back to json_object.
    // An unusable answer gets one more try on the same model before moving on.
    const attempts = ["json_schema", "json_schema", "json_object"] as const;
    for (let i = 0; i < attempts.length; i++) {
      const format = attempts[i];
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages,
          reasoning_effort: effort,
          response_format:
            format === "json_schema"
              ? { type: "json_schema", json_schema: { name, strict: true, schema } }
              : { type: "json_object" },
        }),
        signal,
        cache: "no-store",
      });
      if (response.ok) {
        const body = await response.json().catch(() => null);
        const content: unknown = body?.choices?.[0]?.message?.content;
        const value = typeof content === "string" ? read(parseJsonAnswer(content)) : null;
        if (value !== null) return value;
        code = typeof content === "string" ? "bad-answer" : "empty-answer";
        console.error(`coach: ${model} (${format}) gave an unusable ${name} answer (${code})`);
        if (i === 0) continue; // same model, once more
        break;
      }
      console.error(`coach: ${model} (${format}) answered ${response.status}: ${await errorText(response)}`);
      code = `http-${response.status}`;
      if (response.status === 400 && format === "json_schema") {
        i = attempts.length - 2; // straight to json_object
        continue;
      }
      if (response.status === 429) coolingDown.set(model, Date.now() + COOL_DOWN_MS);
      if (TRY_NEXT.has(response.status) || response.status === 404) {
        busy ||= response.status !== 404;
        break;
      }
      throw new AiError(`AI endpoint answered ${response.status}`, "failed", code);
    }
  }
  throw new AiError("No AI model could answer", busy ? "busy" : "failed", code);
}
