/**
 * A first-email draft the student edits and sends themselves. We never send anything.
 * Square brackets mark what only the student can fill in.
 */

export interface EmailDraftInput {
  projectTitle: string;
  leaderName: string | null;
  semester: string | null;
  /** Labels of listed skills the student already has. */
  matchedSkills: string[];
  /** Codes of the student's courses that taught one of those skills. */
  relevantCourses: string[];
}

export interface EmailDraft {
  subject: string;
  body: string;
}

const DOCTOR_CREDENTIALS = /\b(ph\.?\s?d|m\.?d|ed\.?d|psy\.?d|dnp|d\.?sc)\b/i;
/** Short words that are not surnames, e.g. in "Juan de la Cruz" the surname starts at "de". */
const NAME_PARTICLES = new Set(["de", "del", "la", "van", "von", "da", "di", "le"]);

/** "Chanhee Lee, PhD" -> "Dr. Lee"; "Gino Romero" -> "Gino"; unknown -> "there". */
export function greetingName(fullName: string | null): string {
  if (!fullName?.trim()) return "there";
  const [name, ...credentials] = fullName.split(",").map((part) => part.trim());
  const words = name.split(/\s+/).filter(Boolean);
  if (credentials.some((c) => DOCTOR_CREDENTIALS.test(c)) && words.length > 1) {
    let start = words.length - 1;
    while (start > 1 && NAME_PARTICLES.has(words[start - 1].toLowerCase())) start--;
    return `Dr. ${words.slice(start).join(" ")}`;
  }
  return words[0];
}

/** "A, B and C" */
export function listToText(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function buildEmailDraft(input: EmailDraftInput): EmailDraft {
  const { projectTitle, leaderName, semester, matchedSkills, relevantCourses } = input;
  const subject = `KRSP: interested in joining “${projectTitle}”`;

  let skillsLine: string;
  if (matchedSkills.length && relevantCourses.length) {
    skillsLine = `I have experience with ${listToText(matchedSkills)}, and I've completed ${listToText(relevantCourses)}.`;
  } else if (matchedSkills.length) {
    skillsLine = `I have experience with ${listToText(matchedSkills)}.`;
  } else {
    skillsLine =
      "I'm still building the skills your listing mentions, and I'm ready to put in the time to learn them quickly.";
  }

  // What professors say works: ask directly, talk about yourself, ask one specific question
  // instead of praising the project, and ask who else to contact if the team is full.
  const body = [
    `Hi ${greetingName(leaderName)},`,
    "",
    `I'm [your name], a [year] majoring in [major] at UCF. I'd like to join your KRSP team on “${projectTitle}”${semester ? ` for ${semester}` : ""}. Do you have room for someone like me?`,
    "",
    `[One sentence on how you got into this field.] ${skillsLine}`,
    "",
    "I read the project description and wanted to ask: [one specific question about a part of the project].",
    "",
    "I can give about [number] hours per week, and I've attached my resume. If your team is full, is there someone else you'd suggest I reach out to?",
    "",
    "Thank you,",
    "[Your name]",
    "[Your UCF email]",
  ].join("\n");

  return { subject, body };
}

export interface FollowUpInput {
  projectTitle: string;
  leaderName: string | null;
  /** When the first email went out, if the student marked it. */
  emailedAt: string | null;
  /** Formats emailedAt for the sentence, e.g. "Oct 20". */
  formatDate: (iso: string) => string;
}

/** The one polite follow-up, about a week after the first email. Short on purpose. */
export function buildFollowUpDraft({ projectTitle, leaderName, emailedAt, formatDate }: FollowUpInput): EmailDraft {
  const when = emailedAt ? `on ${formatDate(emailedAt)}` : "last week";
  const body = [
    `Hi ${greetingName(leaderName)},`,
    "",
    `I wanted to follow up on the email I sent ${when} about joining your KRSP team on “${projectTitle}”. I'm still very interested, and I'm happy to send anything else that would help.`,
    "",
    "If the team is full right now, is there someone else you'd suggest I reach out to?",
    "",
    "Thank you,",
    "[Your name]",
  ].join("\n");
  return { subject: `Re: KRSP: interested in joining “${projectTitle}”`, body };
}

/** mailto: link, addressed to the team leader when we have their email from KRSP. */
export function mailtoHref(draft: EmailDraft, to: string | null = null): string {
  const recipient = to ? encodeURIComponent(to).replace(/%40/g, "@") : "";
  return `mailto:${recipient}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
}

export function draftAsText(draft: EmailDraft, to: string | null = null): string {
  return `${to ? `To: ${to}\n` : ""}Subject: ${draft.subject}\n\n${draft.body}`;
}
