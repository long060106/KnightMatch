/**
 * The email coach: an AI that reads one student's resume next to one KRSP listing, plans first
 * (strengths, what to do before sending, and why), then drafts an email from that plan.
 *
 * It only writes text the student edits and sends. It never scores or ranks anyone: matching stays
 * the fixed set arithmetic in match.ts. Shared by the route handler and the dialog, so it stays pure.
 */

export interface Strength {
  /** "You've already written C++ that talks to hardware." */
  point: string;
  /** Where the resume shows it, quoted or closely paraphrased. */
  evidence: string;
  /** Which part of the listing it answers, and why the team leader will care. */
  why: string;
}

export interface NextStep {
  /** "Flip bits in an open-source LLM's weights" */
  title: string;
  /** Concrete steps with real, free tools. */
  what: string;
  /** Which listed requirement or project goal it speaks to. */
  why: string;
  /** "A weekend", "3–5 hours" */
  time: string;
  /** One first-person sentence for the email, true once the student has started it. */
  emailLine: string;
}

export interface CoachPlan {
  /** The one idea the email is built around. */
  angle: string;
  strengths: Strength[];
  /** Listed asks the resume doesn't show yet, said kindly. */
  notYetShown: string[];
  nextSteps: NextStep[];
}

export interface CoachDraft {
  subject: string;
  body: string;
}

export interface CoachProject {
  title: string;
  description: string;
  requiredQuals: string[];
  preferredQuals: string[];
  leaderName: string | null;
  leaderRole: string | null;
  facultyMentor: string | null;
  semester: string | null;
}

export interface CoachRequest {
  projectId: string;
  /** Resume text with contact details already removed in the browser (see redact.ts). */
  resume: string;
  /** Labels of the skills and course codes in the student's KnightMatch profile. */
  profile: string[];
}

/** One line of the streamed answer (newline-delimited JSON). */
export type CoachEvent =
  | { type: "stage"; stage: "reading" | "planning" | "drafting" }
  | { type: "plan"; plan: CoachPlan }
  | { type: "draft"; draft: CoachDraft }
  | { type: "error"; message: string };

export const MAX_RESUME_CHARS = 12_000;
export const MAX_PROFILE_ITEMS = 60;
const MAX_DESCRIPTION_CHARS = 4_000;

const GATEKEEPING = /\b(not|un)\s*-?\s*(qualified|a\s+(good\s+)?fit|eligible|suitable)\b|\bunqualified\b|\bunsuitable\b/gi;

/** Words the site never uses about a student, in case the model slips. */
export function soften(text: string): string {
  return text.replace(GATEKEEPING, "still building toward it");
}

const RULES = `Rules you never break:
- Use only facts that are in the resume or the student's profile. Never invent experience, grades, awards or dates. If something is missing, write it as a [bracketed placeholder] for the student to fill in.
- You do not judge, score, rank or screen the student. Never write "not qualified", "not a fit", "unqualified", "ineligible" or anything that gatekeeps. Missing skills are things the resume "doesn't show yet".
- Plain English a busy postdoc can read in 30 seconds. No buzzwords ("passionate", "leverage", "synergy"), no flattery, no emoji, no markdown.
- Contact details were removed from the resume on purpose. Never ask for them and never fill them in.`;

function projectBlock(p: CoachProject): string {
  const lines = [
    `Title: ${p.title}`,
    p.semester && `Semester: ${p.semester}`,
    p.leaderName && `Team leader: ${p.leaderName}${p.leaderRole ? ` (${p.leaderRole})` : ""}`,
    p.facultyMentor && `Faculty mentor: ${p.facultyMentor}`,
    p.requiredQuals.length > 0 && `Required:\n- ${p.requiredQuals.join("\n- ")}`,
    p.preferredQuals.length > 0 && `Nice to have:\n- ${p.preferredQuals.join("\n- ")}`,
    `Description:\n${p.description.slice(0, MAX_DESCRIPTION_CHARS)}`,
  ];
  return lines.filter(Boolean).join("\n");
}

function studentBlock(request: Pick<CoachRequest, "resume" | "profile">): string {
  const profile = request.profile.length ? `Skills and courses they added on KnightMatch: ${request.profile.join(", ")}\n\n` : "";
  return `${profile}Resume (contact details removed):\n"""\n${request.resume}\n"""`;
}

export function planMessages(project: CoachProject, request: CoachRequest) {
  const system = `You coach UCF undergraduates who are about to email a Knight Research Scholars Program (KRSP) team leader to join a research project. Before anything gets written, you think hard about this one student and this one project.

Work it out in this order:
1. Read the listing and name what the team actually needs: the methods, tools and kind of work, not just the keywords.
2. Read the resume and find the 2 to 4 things that speak most directly to those needs. Prefer concrete work (a project, a class build, a job task) over a skill list. For each, quote or closely paraphrase the resume line, and say which part of the listing it answers.
3. List what the listing asks for that the resume doesn't show yet.
4. Suggest 1 to 3 small things the student can do before sending, so the email stands out. Each one must:
   - be specific to this project's actual research, the way "run an open-source LLM with llama.cpp and write a small C++ tool that flips single bits in the model weights, then compare output quality" is specific to a project on fault-tolerant LLMs on embedded hardware;
   - use free tools and public data, and fit in a weekend to two weeks;
   - close a gap from step 3 or show a strength in this project's own setting;
   - come with the reason it would make a team leader want to reply, and an honest time estimate;
   - come with one first-person sentence the student could put in the email once they have started it ("I've started ...", "I built ...").
   Never suggest paid courses, certificates, or anything that only pads a resume.
5. Pick the single angle the email should be built around.

${RULES}

Answer with JSON only, matching the schema.`;
  const user = `PROJECT\n${projectBlock(project)}\n\nSTUDENT\n${studentBlock(request)}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export function draftMessages(project: CoachProject, request: CoachRequest, plan: CoachPlan, greeting: string) {
  const system = `You write a student's first email to a KRSP team leader, from a plan another coach already made. The student will edit it and send it from their own UCF email.

The email:
- Subject: short, names the project, starts with "KRSP:".
- Starts with "Hi ${greeting}," on its own line.
- Paragraph 1: who they are (name, year and major from the resume, or [your name], [year], [major]) and one specific thing about this project that drew them, taken from the description, not a generic compliment.
- Paragraph 2: the plan's angle and its strongest 2 strengths, each with the concrete evidence. Connect each to what the team needs.
- Paragraph 3: availability as "[number] hours per week", that the resume is attached, and an offer to meet.
- Sign-off: "Thank you for your time," then the student's name (or [Your name]) on the next line.
- 120 to 170 words in the body. Plain text, blank lines between paragraphs.
- Do not mention the "before you send" steps: the student adds those lines themselves once they have started them.

${RULES}

Answer with JSON only, matching the schema.`;
  const user = `PROJECT\n${projectBlock(project)}\n\nSTUDENT\n${studentBlock(request)}\n\nPLAN\n${JSON.stringify(plan, null, 2)}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

const text = { type: "string" } as const;

export const PLAN_SCHEMA = {
  type: "object",
  properties: {
    angle: text,
    strengths: {
      type: "array",
      items: {
        type: "object",
        properties: { point: text, evidence: text, why: text },
        required: ["point", "evidence", "why"],
        additionalProperties: false,
      },
    },
    not_yet_shown: { type: "array", items: text },
    next_steps: {
      type: "array",
      items: {
        type: "object",
        properties: { title: text, what: text, why: text, time: text, email_line: text },
        required: ["title", "what", "why", "time", "email_line"],
        additionalProperties: false,
      },
    },
  },
  required: ["angle", "strengths", "not_yet_shown", "next_steps"],
  additionalProperties: false,
} as const;

export const DRAFT_SCHEMA = {
  type: "object",
  properties: { subject: text, body: text },
  required: ["subject", "body"],
  additionalProperties: false,
} as const;

const str = (value: unknown, max = 600): string =>
  typeof value === "string" ? soften(value.replace(/\r\n?/g, "\n").trim()).slice(0, max) : "";

const list = (value: unknown, max: number): unknown[] => (Array.isArray(value) ? value.slice(0, max) : []);

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

/** The model's plan, trimmed to the shape and limits the UI expects. Null if nothing usable came back. */
export function readPlan(raw: unknown): CoachPlan | null {
  const r = record(raw);
  const strengths = list(r.strengths, 4)
    .map(record)
    .map((s) => ({ point: str(s.point, 200), evidence: str(s.evidence, 300), why: str(s.why, 400) }))
    .filter((s) => s.point && s.why);
  const nextSteps = list(r.next_steps, 3)
    .map(record)
    .map((s) => ({
      title: str(s.title, 120),
      what: str(s.what, 700),
      why: str(s.why, 500),
      time: str(s.time, 60),
      emailLine: str(s.email_line, 300),
    }))
    .filter((s) => s.title && s.what);
  const plan = {
    angle: str(r.angle, 300),
    strengths,
    notYetShown: list(r.not_yet_shown, 6).map((x) => str(x, 200)).filter(Boolean),
    nextSteps,
  };
  return plan.strengths.length || plan.nextSteps.length ? plan : null;
}

export function readDraft(raw: unknown): CoachDraft | null {
  const r = record(raw);
  const draft = { subject: str(r.subject, 200), body: str(r.body, 3_000) };
  return draft.subject && draft.body ? draft : null;
}

/**
 * Adds a "before you send" line to the end of the strengths paragraph (after the greeting and the
 * intro), or takes it out again. Edits the student made elsewhere in the body are kept.
 */
export function toggleStepLine(body: string, line: string, on: boolean): string {
  const sentence = line.trim();
  if (!sentence) return body;
  if (!on) return body.replace(` ${sentence}`, "").replace(sentence, "");
  if (body.includes(sentence)) return body;
  const paragraphs = body.split(/\n{2,}/);
  const at = Math.min(2, paragraphs.length - 1);
  paragraphs[at] = `${paragraphs[at].trimEnd()} ${sentence}`;
  return paragraphs.join("\n\n");
}
