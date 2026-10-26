import type { NextRequest } from "next/server";
import { AiError, aiConfigured, chatJson } from "@/lib/coach/ai-client";
import {
  DRAFT_SCHEMA,
  MAX_PROFILE_ITEMS,
  MAX_RESUME_CHARS,
  PLAN_SCHEMA,
  draftMessages,
  keepHoursPlaceholder,
  planMessages,
  readDraft,
  readPlan,
  type CoachEvent,
  type CoachProject,
  type CoachRequest,
} from "@/lib/coach/coach";
import { getProject } from "@/lib/data";
import { greetingName } from "@/lib/email-template";
import { clientKey, fromThisSite, withinLimit } from "@/lib/server/guard";

// Planning with a long think, then drafting, can take a while on the free tier.
export const maxDuration = 120;

const MAX_BODY_BYTES = 64_000;

function problem(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

function parseRequest(raw: unknown): CoachRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const { projectId, resume, profile } = raw as Record<string, unknown>;
  if (typeof projectId !== "string" || typeof resume !== "string") return null;
  const text = resume.trim().slice(0, MAX_RESUME_CHARS);
  if (text.length < 80) return null;
  const items = Array.isArray(profile) ? profile.filter((p): p is string => typeof p === "string") : [];
  return { projectId, resume: text, profile: items.slice(0, MAX_PROFILE_ITEMS).map((p) => p.slice(0, 80)) };
}

/**
 * Reads one resume against one listing and streams back newline-delimited JSON:
 * stage events, then the plan (what to highlight, what to do first and why), then the draft.
 * Nothing is stored or logged: the resume lives only in this request.
 */
export async function POST(request: NextRequest) {
  if (!fromThisSite(request)) return problem("Requests must come from KnightMatch.", 403);
  if (!aiConfigured()) return problem("AI writing isn't set up on this site yet.", 503);
  if (!withinLimit("coach", clientKey(request), 6, 10 * 60_000)) {
    return problem("That's a lot of drafts in a few minutes. Try again in a little while.", 429);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return problem("That resume is too long to send.", 413);
  let body: CoachRequest | null = null;
  try {
    body = parseRequest(JSON.parse(raw));
  } catch {
    body = null;
  }
  if (!body) return problem("We couldn't read that request. Add your resume and try again.", 400);
  const found = getProject(body.projectId);
  if (!found) return problem("That project isn't on the KRSP list anymore.", 404);

  const project: CoachProject = {
    title: found.title,
    description: found.description,
    requiredQuals: found.required_quals,
    preferredQuals: found.preferred_quals,
    leaderName: found.team_leader?.name ?? null,
    leaderRole: found.team_leader?.role ?? null,
    facultyMentor: found.faculty_mentor,
    semester: found.semester,
  };
  const req = body;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: CoachEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        send({ type: "stage", stage: "planning" });
        const plan = await chatJson({
          messages: planMessages(project, req),
          schema: PLAN_SCHEMA,
          name: "coach_plan",
          effort: "high",
          read: readPlan,
          signal: request.signal,
        });
        send({ type: "plan", plan });

        send({ type: "stage", stage: "drafting" });
        const draft = await chatJson({
          messages: draftMessages(project, req, plan, greetingName(project.leaderName)),
          schema: DRAFT_SCHEMA,
          name: "coach_draft",
          effort: "medium",
          read: readDraft,
          signal: request.signal,
        });
        send({ type: "draft", draft: { ...draft, body: keepHoursPlaceholder(draft.body, req.resume) } });
      } catch (error) {
        if (!request.signal.aborted) {
          const busy = error instanceof AiError && error.kind === "busy";
          const code = error instanceof AiError ? error.code : error instanceof Error ? error.name : "unknown";
          if (!(error instanceof AiError)) console.error("coach: unexpected error", error);
          send({
            type: "error",
            message: busy
              ? `The free AI is busy right now. Wait a minute and try again, or use the template below. (${code})`
              : `The AI couldn't finish this one. Try again, or use the template below. (${code})`,
          });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
