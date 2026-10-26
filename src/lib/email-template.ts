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

  const body = [
    `Hi ${greetingName(leaderName)},`,
    "",
    `I'm [your name], a [year] majoring in [major] at UCF. I found “${projectTitle}” on the Knight Research Scholars Program list and would love to join the team${semester ? ` for ${semester}` : ""}.`,
    "",
    `${skillsLine} [One or two sentences on why this project interests you.]`,
    "",
    "I can commit about [number] hours per week. I've attached my resume, and I'm happy to share my unofficial transcript or meet at a time that works for you.",
    "",
    "Thank you for your time,",
    "[Your name]",
    "[Your UCF email]",
  ].join("\n");

  return { subject, body };
}

/** mailto: link, addressed to the team leader when we have their email from KRSP. */
export function mailtoHref(draft: EmailDraft, to: string | null = null): string {
  const recipient = to ? encodeURIComponent(to).replace(/%40/g, "@") : "";
  return `mailto:${recipient}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
}

export function draftAsText(draft: EmailDraft, to: string | null = null): string {
  return `${to ? `To: ${to}\n` : ""}Subject: ${draft.subject}\n\n${draft.body}`;
}
