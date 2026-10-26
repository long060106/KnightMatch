/**
 * The email coach: an AI that reads one student's resume next to one KRSP listing, plans first
 * (strengths, what to do before sending, and why), then drafts an email from that plan.
 *
 * The draft follows what professors say about cold emails: ask directly, talk about yourself, ask
 * one specific question instead of praising the work, ask who else to contact if the team is full,
 * and above all don't sound like AI. So the draft is a plain starting point, and findAiTells()
 * marks phrasing the student should rewrite in their own words.
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
  /** 1–2 specific questions about one part of the project description, to show it was read. */
  questions: string[];
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

/**
 * Phrases that make a cold email read as AI-written. Professors say that is the fastest way to be
 * ignored, so the prompt bans them and the dialog flags any that remain in the student's draft.
 */
export const AI_TELLS = [
  "drawn to", "aligns with", "aligns directly", "align with", "passion", "fascinating", "fascinated", "intrigued", "thrilled", "excited to",
  "eager to contribute", "contribute to your team", "valuable addition", "would appreciate the opportunity",
  "i would welcome the opportunity", "delve", "leverage", "honed", "hone my", "invaluable", "foster",
  "synergy", "cutting-edge", "cutting edge", "innovative", "keen interest", "deeply interested",
  "i hope this email finds you well", "i am writing to express", "meets your requirement", "as required",
  "demonstrates my", "showcase", "furthermore", "moreover", "additionally,", "—",
];

/** The AI-sounding phrases in `text`, in the order they appear, each once. */
export function findAiTells(text: string): string[] {
  const lower = text.toLowerCase();
  return AI_TELLS.map((tell) => ({ tell, at: lower.indexOf(tell) }))
    .filter((t) => t.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((t) => (t.tell === "—" ? "— (em dash)" : t.tell));
}

const RULES = `Rules you never break:
- Use only facts that are in the resume or the student's profile. Never invent experience, grades, awards, dates, hours or reasons. If something is missing, write it as a [bracketed placeholder] for the student to fill in.
- You do not judge, score, rank or screen the student. Never write "not qualified", "not a fit", "unqualified", "ineligible" or anything that gatekeeps. Missing skills are things the resume "doesn't show yet".
- Plain English a busy postdoc can read in 30 seconds. No flattery, no emoji, no markdown.
- Contact details were removed from the resume on purpose. Never ask for them and never fill them in.`;

const VOICE = `Voice: write the way a real UCF undergrad writes to someone they respect. Short, plain sentences, contractions ("I'm", "I've"), first person, concrete nouns. It must not read as AI-written: professors say that is the number one reason they ignore an email. Never use these words or phrases: ${AI_TELLS.filter((t) => t !== "—").map((t) => `"${t}"`).join(", ")}. No em dashes, no "not only ... but also", no lists of three adjectives, no sentence that only praises.`;

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
5. Write 1 or 2 specific questions the student could ask about one concrete part of the project description (a method, a device, a dataset, a step), the kind only someone who read it closely would ask. Not praise, and never a name-drop of a paper or title.
6. Pick the single angle the email should be built around.

${RULES}

Answer with JSON only, matching the schema.`;
  const user = `PROJECT\n${projectBlock(project)}\n\nSTUDENT\n${studentBlock(request)}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export function draftMessages(project: CoachProject, request: CoachRequest, plan: CoachPlan, greeting: string) {
  const system = `You write a rough first draft of a student's cold email to a KRSP team leader, from a plan another coach already made. The student will rewrite it in their own words and send it from their own UCF email.

What professors say works, so follow it:
- Get to the point. Ask directly, early on, whether there's room on the team, instead of opening with praise of their work.
- Talk about the student, not the project: how they got into this field, what they've done, what they want to learn. If the resume doesn't say how they got into it, write "[one sentence: how you got into this]".
- Show interest with one specific question about a concrete part of the project (use the plan's question), not with compliments.
- End by asking who else they'd suggest reaching out to if the team is full.

The email:
- Subject: short, names the project, starts with "KRSP:".
- Starts with "Hi ${greeting}," on its own line.
- Paragraph 1: name, year and major (from the resume, or [your name], [year], [major]), then the direct ask, in words like "Do you have room on your team for someone like me?"
- Paragraph 2: about the student. How they got into the field, then the 2 strongest concrete things from the plan, said plainly with what they actually did.
- Paragraph 3: the plan's best question about the project, with a few words on why that part interests them (or "[why this part interests you]").
- Paragraph 4: "I can give about [number] hours per week" (never a number), resume attached, and "If your team is full, is there someone else you'd suggest I reach out to?"
- Sign-off: "Thank you," then the student's name (or [Your name]) on the next line.
- 110 to 150 words in the body. Plain text with real line breaks: "\\n\\n" between paragraphs, "\\n" between the sign-off and the name.
- Show, don't tell: describe the work. Never write "this meets your requirement", "as required" or similar checklist language.
- Do not mention the "before you send" steps: the student adds those lines themselves once they have started them.

${VOICE}

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
    questions: { type: "array", items: text },
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
  required: ["angle", "strengths", "questions", "not_yet_shown", "next_steps"],
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
    questions: list(r.questions, 4).map((x) => str(x, 300)).filter(Boolean).slice(0, 2),
    notYetShown: list(r.not_yet_shown, 6).map((x) => str(x, 200)).filter(Boolean),
    nextSteps,
  };
  return plan.strengths.length || plan.nextSteps.length ? plan : null;
}

/**
 * Smaller models sometimes put paragraphs on one line, separated only by runs of spaces.
 * Turn those back into blank lines so the email reads (and toggleStepLine finds paragraphs).
 */
export function paragraphs(body: string): string {
  if (body.includes("\n")) return body;
  return body
    .replace(/ {2,}/g, "\n\n")
    .replace(/\n\n(Thank you[^\n]*,|Thanks[^\n]*,|Best,)\n\n/i, "\n\n$1\n");
}

const HOURS = /\b(\d{1,2}(?:\s*(?:-|–|to)\s*\d{1,2})?)(\s+hours?\s+(?:per|a|each)\s+week)/gi;

/**
 * Weekly hours only the student can promise. Models like to fill in a number; unless the resume
 * itself states one, put the placeholder back.
 */
export function keepHoursPlaceholder(body: string, resume: string): string {
  return /\bhours?\s+(?:per|a|each)\s+week\b/i.test(resume) ? body : body.replace(HOURS, "[number]$2");
}

export function readDraft(raw: unknown): CoachDraft | null {
  const r = record(raw);
  const draft = { subject: str(r.subject, 200), body: paragraphs(str(r.body, 3_000)) };
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
