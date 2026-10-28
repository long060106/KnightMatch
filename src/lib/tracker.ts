/**
 * The student's own list: which projects they saved or emailed, and how far each one got.
 * Pure functions here; the browser storage lives in tracker-store.ts. It leaves the device only when
 * the student signs in to keep the same list on their other devices (src/lib/sync.ts).
 */

export const STAGES = ["saved", "emailed", "followed_up", "heard_back", "joined", "not_this_time"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  saved: "Saved",
  emailed: "Emailed",
  followed_up: "Followed up",
  heard_back: "Heard back",
  joined: "Joined",
  not_this_time: "Not this time",
};

export interface TrackedProject {
  stage: Stage;
  updatedAt: string;
  /** When the student marked the first email as sent. */
  emailedAt?: string;
  followedUpAt?: string;
}

/** Project id -> where the student is with it. */
export type Tracker = Record<string, TrackedProject>;

const DAY_MS = 24 * 60 * 60 * 1000;
/** Professors' advice: wait about a week, then follow up once. */
export const FOLLOW_UP_DAYS = 7;

const isStage = (value: unknown): value is Stage => STAGES.includes(value as Stage);
const isTime = (value: unknown): value is string => typeof value === "string" && !Number.isNaN(Date.parse(value));

/** Reads what localStorage holds; anything unexpected is dropped rather than trusted. */
export function parseTracker(raw: string | null): Tracker {
  if (!raw) return {};
  try {
    return trackerFrom(JSON.parse(raw)?.projects);
  } catch {
    return {};
  }
}

/** Keeps only well-formed entries of a `{ [projectId]: entry }` object, from storage or the network. */
export function trackerFrom(value: unknown): Tracker {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const tracker: Tracker = {};
  for (const [id, entry] of Object.entries(value as Record<string, Record<string, unknown>>)) {
    if (!entry || !isStage(entry.stage) || !isTime(entry.updatedAt)) continue;
    tracker[id] = {
      stage: entry.stage,
      updatedAt: entry.updatedAt,
      ...(isTime(entry.emailedAt) && { emailedAt: entry.emailedAt }),
      ...(isTime(entry.followedUpAt) && { followedUpAt: entry.followedUpAt }),
    };
  }
  return tracker;
}

export function serializeTracker(tracker: Tracker): string {
  return JSON.stringify({ projects: tracker });
}

/**
 * Moves a project to `stage`. The email dates stay with the project as it moves on (so "Heard back"
 * still knows when you wrote), and are dropped when it moves back before them.
 */
export function withStage(prev: TrackedProject | undefined, stage: Stage, now: string): TrackedProject {
  const next: TrackedProject = { stage, updatedAt: now };
  if (stage !== "saved") {
    const emailedAt = prev?.emailedAt ?? (stage === "emailed" ? now : undefined);
    if (emailedAt) next.emailedAt = emailedAt;
  }
  if (stage !== "saved" && stage !== "emailed") {
    const followedUpAt = prev?.followedUpAt ?? (stage === "followed_up" ? now : undefined);
    if (followedUpAt) next.followedUpAt = followedUpAt;
  }
  return next;
}

/** When to send the one follow-up, or null if there is nothing to follow up on. */
export function followUpAt(entry: TrackedProject | undefined): number | null {
  if (entry?.stage !== "emailed" || !entry.emailedAt) return null;
  return Date.parse(entry.emailedAt) + FOLLOW_UP_DAYS * DAY_MS;
}

export function followUpDue(entry: TrackedProject | undefined, now: number): boolean {
  const at = followUpAt(entry);
  return at !== null && now >= at;
}

/** "Your list": follow-ups that are due first, then the most recently changed. */
export function compareTracked(a: TrackedProject, b: TrackedProject, now: number): number {
  return Number(followUpDue(b, now)) - Number(followUpDue(a, now)) || b.updatedAt.localeCompare(a.updatedAt);
}

/** Year, month, day of a moment in Orlando, where the dates on the site are shown. */
function orlandoDay(ms: number): [number, number, number] {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return [part("year"), part("month"), part("day")];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Text values in .ics escape backslash, semicolon, comma and newlines (RFC 5545 3.3.11). */
function icsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 bytes continue on the next line after a space, never inside a character. */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const pieces: string[] = [];
  let piece = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = pieces.length ? 74 : 75; // continuation lines start with a space
    if (bytes + size > limit) {
      pieces.push(piece);
      piece = "";
      bytes = 0;
    }
    piece += char;
    bytes += size;
  }
  pieces.push(piece);
  return pieces.join("\r\n ");
}

export interface ReminderInput {
  projectId: string;
  projectTitle: string;
  /** This project's page on KnightMatch. */
  pageUrl: string;
  krspUrl: string;
  /** The day to follow up (ms); the event is at 10:00 that day, wherever the student is. */
  at: number;
  /** For DTSTAMP. */
  now: number;
}

/**
 * A calendar file for the follow-up, made in the browser: one 15-minute event at 10:00 with an
 * alert. Opening it adds the reminder to Google, Apple or Outlook calendar, so it reaches the
 * student even if they never come back to the site. No email address goes in it.
 */
export function buildReminderIcs({ projectId, projectTitle, pageUrl, krspUrl, at, now }: ReminderInput): string {
  const [y, m, d] = orlandoDay(at);
  const day = `${y}${pad(m)}${pad(d)}`;
  const stamp = new Date(now).toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KnightMatch//Follow-up reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${projectId}-follow-up-${day}@knightmatch`,
    `DTSTAMP:${stamp}`,
    // No time zone on purpose ("floating" time): 10:00 wherever the student's calendar is.
    `DTSTART:${day}T100000`,
    `DTEND:${day}T101500`,
    `SUMMARY:${icsText(`Follow up: ${projectTitle}`)}`,
    `DESCRIPTION:${icsText(
      `No reply yet? Send one short, polite follow-up about “${projectTitle}”. KnightMatch has a draft for you.\n\n` +
        `Project: ${pageUrl}\nKRSP listing: ${krspUrl}`,
    )}`,
    `URL:${pageUrl}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText(`Follow up: ${projectTitle}`)}`,
    "TRIGGER:PT0S",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
