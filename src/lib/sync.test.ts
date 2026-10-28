import { describe, expect, it } from "vitest";
import { parseProfile, profileFrom } from "./profile";
import {
  applyPush,
  EMPTY_DATA,
  MAX_TRACKED,
  mergeData,
  mergeProfiles,
  mergeTrackers,
  parseMarker,
  parsePush,
  syncStep,
  type AccountData,
} from "./sync";
import type { Tracker } from "./tracker";

const T0 = "2026-10-20T15:00:00.000Z";
const T1 = "2026-10-22T15:00:00.000Z";
const T2 = "2026-10-29T15:00:00.000Z";

describe("mergeProfiles", () => {
  it("keeps every skill and course from both devices, once", () => {
    const phone = { skills: ["python", "r"], courses: ["COP3502C"], updatedAt: T1 };
    const laptop = { skills: ["r", "matlab"], courses: ["COP3502C", "STA2023"], updatedAt: T0 };
    expect(mergeProfiles(phone, laptop)).toEqual({
      skills: ["python", "r", "matlab"],
      courses: ["COP3502C", "STA2023"],
      updatedAt: T1,
    });
  });

  it("uses whichever side has a profile", () => {
    const p = { skills: ["python"], courses: [], updatedAt: T0 };
    expect(mergeProfiles(null, p)).toBe(p);
    expect(mergeProfiles(p, null)).toBe(p);
    expect(mergeProfiles(null, null)).toBeNull();
  });
});

describe("mergeTrackers", () => {
  it("keeps projects from both sides and the newest change of each", () => {
    const a: Tracker = { "krsp-1": { stage: "emailed", updatedAt: T1, emailedAt: T1 }, "krsp-2": { stage: "saved", updatedAt: T0 } };
    const b: Tracker = { "krsp-1": { stage: "saved", updatedAt: T0 }, "krsp-3": { stage: "joined", updatedAt: T2 } };
    expect(mergeTrackers(a, b)).toEqual({
      "krsp-1": { stage: "emailed", updatedAt: T1, emailedAt: T1 },
      "krsp-2": { stage: "saved", updatedAt: T0 },
      "krsp-3": { stage: "joined", updatedAt: T2 },
    });
    expect(mergeTrackers(b, a)["krsp-1"].stage).toBe("emailed");
  });
});

describe("applyPush", () => {
  const stored = {
    profile: { skills: ["python"], courses: [], updatedAt: T0 },
    tracker: { "krsp-1": { stage: "saved" as const, updatedAt: T0 } },
    version: 4,
  };

  it("replaces the account copy when the device saw the latest version, so removals stick", () => {
    const incoming: AccountData = { profile: null, tracker: {} };
    expect(applyPush(stored, incoming, 4)).toEqual({ profile: null, tracker: {}, version: 5 });
  });

  it("merges when another device saved in between, or on the first sign-in", () => {
    const incoming: AccountData = { profile: { skills: ["r"], courses: [], updatedAt: T1 }, tracker: { "krsp-2": { stage: "saved", updatedAt: T1 } } };
    const merged = { ...mergeData(incoming, stored), version: 5 };
    expect(applyPush(stored, incoming, 3)).toEqual(merged);
    expect(applyPush(stored, incoming, null)).toEqual(merged);
    expect(merged.profile?.skills).toEqual(["r", "python"]);
    expect(Object.keys(merged.tracker).sort()).toEqual(["krsp-1", "krsp-2"]);
  });

  it("starts an empty account at version 1", () => {
    const incoming: AccountData = { profile: null, tracker: { "krsp-9": { stage: "saved", updatedAt: T0 } } };
    expect(applyPush(null, incoming, null)).toEqual({ ...incoming, version: 1 });
    expect(EMPTY_DATA.version).toBe(0);
  });
});

describe("parsePush", () => {
  const body = (value: unknown) => JSON.stringify(value);

  it("keeps a well-formed save and drops anything else in it", () => {
    const parsed = parsePush(
      body({
        base: 2,
        profile: { skills: ["python", 3], courses: ["COP3502C"], updatedAt: T0, resume: "Jane Doe, 555-0100" },
        tracker: {
          "krsp-534": { stage: "emailed", updatedAt: T1, emailedAt: T1, leaderEmail: "someone@ucf.edu" },
          "../etc": { stage: "saved", updatedAt: T1 },
          "krsp-535": { stage: "applied", updatedAt: T1 },
        },
        email: "student@gmail.com",
      }),
    );
    expect(parsed).toEqual({
      base: 2,
      data: {
        profile: { skills: ["python"], courses: ["COP3502C"], updatedAt: T0 },
        tracker: { "krsp-534": { stage: "emailed", updatedAt: T1, emailedAt: T1 } },
      },
    });
    expect(JSON.stringify(parsed)).not.toMatch(/@|555|Jane/);
  });

  it("refuses bodies that are too big, too long, or not this shape", () => {
    expect(parsePush("not json")).toBeNull();
    expect(parsePush(body([]))).toBeNull();
    expect(parsePush(body({ base: -1, profile: null, tracker: {} }))).toBeNull();
    expect(parsePush(body({ base: "2", profile: null, tracker: {} }))).toBeNull();
    expect(parsePush(body({ profile: null, tracker: {} }))).toBeNull();
    expect(parsePush("x".repeat(64_001))).toBeNull();
    const many = Object.fromEntries(Array.from({ length: MAX_TRACKED + 1 }, (_, i) => [`krsp-${i}`, { stage: "saved", updatedAt: T0 }]));
    expect(parsePush(body({ base: null, profile: null, tracker: many }))).toBeNull();
    expect(parsePush(body({ base: null, profile: { skills: ["x".repeat(81)], courses: [] }, tracker: {} }))).toBeNull();
  });

  it("accepts base null and an empty account", () => {
    expect(parsePush(body({ base: null, profile: null, tracker: {} }))).toEqual({ base: null, data: { profile: null, tracker: {} } });
  });
});

describe("syncStep", () => {
  const local: AccountData = { profile: null, tracker: { "krsp-1": { stage: "saved", updatedAt: T0 } } };
  const empty: AccountData = { profile: null, tracker: {} };

  it("merges what this browser has the first time it meets an account", () => {
    expect(syncStep(null, "u1", local)).toBe("merge");
    expect(syncStep({ userId: "u2", version: 3, dirty: false }, "u1", local)).toBe("merge");
    expect(syncStep(null, "u1", empty)).toBe("pull");
  });

  it("sends waiting changes, otherwise takes the account's copy", () => {
    expect(syncStep({ userId: "u1", version: 3, dirty: true }, "u1", local)).toBe("push");
    expect(syncStep({ userId: "u1", version: 3, dirty: false }, "u1", local)).toBe("pull");
  });

  it("reads the marker defensively", () => {
    expect(parseMarker(JSON.stringify({ userId: "u1", version: 2, dirty: true }))).toEqual({ userId: "u1", version: 2, dirty: true });
    expect(parseMarker(JSON.stringify({ userId: "u1", version: "2" }))).toBeNull();
    expect(parseMarker("{")).toBeNull();
    expect(parseMarker(null)).toBeNull();
  });
});

describe("parseProfile", () => {
  it("still reads what the browser stored", () => {
    expect(parseProfile(JSON.stringify({ skills: ["python"], courses: [], updatedAt: T0 }))).toEqual({ skills: ["python"], courses: [], updatedAt: T0 });
    expect(parseProfile(JSON.stringify({ skills: [], courses: [] }))).toBeNull();
    expect(parseProfile("nope")).toBeNull();
    expect(profileFrom({ skills: "python", courses: [] })).toBeNull();
  });
});
