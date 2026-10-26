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
  ) {
    super(message);
  }
}

interface ChatOptions {
  messages: { role: string; content: string }[];
  schema: object;
  name: string;
  /** How long the model may think before it answers. */
  effort: "low" | "medium" | "high";
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

export async function chatJson({ messages, schema, name, effort, signal }: ChatOptions): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new AiError("GEMINI_API_KEY is not set", "missing-key");
  const baseUrl = (process.env.COACH_AI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
  let busy = false;

  for (const model of models()) {
    // json_schema keeps the answer in shape; some endpoints reject it, so fall back to json_object once.
    for (const format of ["json_schema", "json_object"] as const) {
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
        const body = await response.json();
        const content: unknown = body?.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new AiError("AI answer had no content", "failed");
        try {
          return JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ""));
        } catch {
          throw new AiError("AI answer was not JSON", "failed");
        }
      }
      console.error(`coach: ${model} (${format}) answered ${response.status}: ${await errorText(response)}`);
      if (response.status === 400 && format === "json_schema") continue;
      // Out of free quota, overloaded or no such model: try the next model.
      if (response.status === 429 || response.status === 503 || response.status === 404) {
        busy ||= response.status !== 404;
        break;
      }
      throw new AiError(`AI endpoint answered ${response.status}`, "failed");
    }
  }
  throw new AiError("No AI model could answer", busy ? "busy" : "failed");
}
