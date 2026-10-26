import { describe, expect, it } from "vitest";
import {
  buildReminderIcs,
  compareTracked,
  followUpAt,
  followUpDue,
  parseTracker,
  serializeTracker,
  withStage,
  type TrackedProject,
} from "./tracker";

const T0 = "2026-10-20T15:00:00.000Z";
const T1 = "2026-10-22T15:00:00.000Z";
const T2 = "2026-10-29T15:00:00.000Z";
const DAY = 24 * 60 * 60 * 1000;

describe("withStage", () => {
  it("remembers when the first email went out", () => {
    const saved = withStage(undefined, "saved", T0);
    expect(saved).toEqual({ stage: "saved", updatedAt: T0 });
    const emailed = withStage(saved, "emailed", T1);
    expect(emailed).toEqual({ stage: "emailed", updatedAt: T1, emailedAt: T1 });
  });

  it("keeps the email dates as the project moves on", () => {
    const emailed = withStage(undefined, "emailed", T0);
    const followed = withStage(emailed, "followed_up", T1);
    expect(followed).toEqual({ stage: "followed_up", updatedAt: T1, emailedAt: T0, followedUpAt: T1 });
    const heard = withStage(followed, "heard_back", T2);
    expect(heard).toEqual({ stage: "heard_back", updatedAt: T2, emailedAt: T0, followedUpAt: T1 });
  });

  it("does not invent dates when a stage is skipped", () => {
    expect(withStage(undefined, "heard_back", T0)).toEqual({ stage: "heard_back", updatedAt: T0 });
  });

  it("drops the dates when moved back before them", () => {
    const followed = withStage(withStage(undefined, "emailed", T0), "followed_up", T1);
    expect(withStage(followed, "emailed", T2)).toEqual({ stage: "emailed", updatedAt: T2, emailedAt: T0 });
    expect(withStage(followed, "saved", T2)).toEqual({ stage: "saved", updatedAt: T2 });
  });
});

describe("follow-up timing", () => {
  const emailed: TrackedProject = { stage: "emailed", updatedAt: T0, emailedAt: T0 };

  it("is due a week after the first email", () => {
    expect(followUpAt(emailed)).toBe(Date.parse(T0) + 7 * DAY);
    expect(followUpDue(emailed, Date.parse(T0) + 7 * DAY - 1)).toBe(false);
    expect(followUpDue(emailed, Date.parse(T0) + 7 * DAY)).toBe(true);
  });

  it("is never due once they followed up, heard back, or never emailed", () => {
    const later = Date.parse(T0) + 30 * DAY;
    expect(followUpDue({ ...emailed, stage: "followed_up" }, later)).toBe(false);
    expect(followUpDue({ ...emailed, stage: "heard_back" }, later)).toBe(false);
    expect(followUpDue({ stage: "saved", updatedAt: T0 }, later)).toBe(false);
    expect(followUpDue(undefined, later)).toBe(false);
  });

  it("puts due follow-ups first, then the newest change", () => {
    const now = Date.parse(T2);
    const due: TrackedProject = { stage: "emailed", updatedAt: T0, emailedAt: T0 };
    const fresh: TrackedProject = { stage: "saved", updatedAt: T2 };
    const older: TrackedProject = { stage: "heard_back", updatedAt: T1 };
    expect([older, fresh, due].sort((a, b) => compareTracked(a, b, now))).toEqual([due, fresh, older]);
  });
});

describe("parseTracker", () => {
  it("round-trips", () => {
    const tracker = { "krsp-1": withStage(undefined, "emailed", T0) };
    expect(parseTracker(serializeTracker(tracker))).toEqual(tracker);
  });

  it("drops anything it does not recognise", () => {
    expect(parseTracker(null)).toEqual({});
    expect(parseTracker("not json")).toEqual({});
    expect(parseTracker(JSON.stringify({ projects: [] }))).toEqual({});
    const raw = JSON.stringify({
      projects: {
        a: { stage: "applied", updatedAt: T0 },
        b: { stage: "saved", updatedAt: "yesterday" },
        c: { stage: "emailed", updatedAt: T0, emailedAt: 42, note: "<script>" },
      },
    });
    expect(parseTracker(raw)).toEqual({ c: { stage: "emailed", updatedAt: T0 } });
  });
});

describe("buildReminderIcs", () => {
  const ics = buildReminderIcs({
    projectId: "krsp-534",
    projectTitle: "Secure, Fault-Tolerant LLMs; for “Embedded” Systems and a very long title that keeps going",
    pageUrl: "https://knight-match.vercel.app/projects/krsp-534",
    krspUrl: "https://knight.research.ucf.edu/krsp-project/secure-llms/",
    at: Date.parse("2026-10-27T15:00:00Z"),
    now: Date.parse(T0),
  });
  const unfolded = ics.replace(/\r\n /g, "");

  it("is one 10:00 event on the follow-up day, in the student's own time zone, with an alert", () => {
    expect(unfolded).toContain("DTSTART:20261027T100000\r\n");
    expect(unfolded).toContain("DTEND:20261027T101500\r\n");
    expect(unfolded).toContain("DTSTAMP:20261020T150000Z\r\n");
    expect(unfolded).toContain("UID:krsp-534-follow-up-20261027@knightmatch\r\n");
    expect(unfolded).toMatch(/BEGIN:VALARM\r\nACTION:DISPLAY\r\n/);
  });

  it("uses the Orlando date even late in the evening", () => {
    const late = buildReminderIcs({
      projectId: "x",
      projectTitle: "T",
      pageUrl: "https://knight-match.vercel.app/projects/x",
      krspUrl: "https://knight.research.ucf.edu/",
      at: Date.parse("2026-10-28T02:30:00Z"), // 10:30 pm on Oct 27 in Orlando
      now: Date.parse(T0),
    });
    expect(late).toContain("DTSTART:20261027T100000");
  });

  it("escapes text and folds long lines with CRLF", () => {
    expect(unfolded).toContain("SUMMARY:Follow up: Secure\\, Fault-Tolerant LLMs\\; for “Embedded” Systems");
    expect(unfolded).toContain("\\n\\nProject: https://knight-match.vercel.app/projects/krsp-534\\nKRSP listing:");
    const lines = ics.split("\r\n");
    expect(lines.every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/\n/);
  });

  it("never carries an email address", () => {
    expect(ics).not.toMatch(/@(?!knightmatch)/);
  });
});
