/**
 * Keeping the profile and the list the same on every device a student signs in on. Pure functions:
 * the account API (src/app/api/me) and the browser side (account-sync.tsx) both use them.
 *
 * The account keeps one copy with a version number. A device sends its whole copy together with the
 * version it last saw; if someone else saved in between, the two copies are merged instead of one
 * overwriting the other.
 */

import { profileFrom } from "./profile";
import { trackerFrom, type Tracker } from "./tracker";
import type { Profile } from "./types";

/** What an account keeps: the same two things the browser keeps, nothing else. */
export interface AccountData {
  profile: Profile | null;
  tracker: Tracker;
}

export interface SyncedData extends AccountData {
  /** Goes up by one on every save; 0 when the account has nothing yet. */
  version: number;
}

export const EMPTY_DATA: SyncedData = { profile: null, tracker: {}, version: 0 };

/** Limits on what one save may hold, far above what a student would add by hand. */
export const MAX_BODY_CHARS = 64_000;
export const MAX_TRACKED = 300;
export const MAX_PROFILE_ITEMS = 300;
const MAX_ITEM_CHARS = 80;
const PROJECT_ID = /^krsp-\d{1,7}$/;

const time = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? -Infinity : t;
};

/** Skills and courses from both sides, `a`'s order first; the newer change time. */
export function mergeProfiles(a: Profile | null, b: Profile | null): Profile | null {
  if (!a) return b;
  if (!b) return a;
  const union = (x: string[], y: string[]) => [...new Set([...x, ...y])];
  return {
    skills: union(a.skills, b.skills),
    courses: union(a.courses, b.courses),
    updatedAt: time(a.updatedAt) >= time(b.updatedAt) ? a.updatedAt : b.updatedAt,
  };
}

/** Every project from both sides; where both have one, the one changed last wins (`a` on a tie). */
export function mergeTrackers(a: Tracker, b: Tracker): Tracker {
  const merged: Tracker = { ...b };
  for (const [id, entry] of Object.entries(a)) {
    const other = merged[id];
    if (!other || time(entry.updatedAt) >= time(other.updatedAt)) merged[id] = entry;
  }
  return merged;
}

export function mergeData(a: AccountData, b: AccountData): AccountData {
  return { profile: mergeProfiles(a.profile, b.profile), tracker: mergeTrackers(a.tracker, b.tracker) };
}

export function hasData(data: AccountData): boolean {
  return Boolean(data.profile) || Object.keys(data.tracker).length > 0;
}

/**
 * Reads the body of a save (PUT /api/me): `{ profile, tracker, base }`, where `base` is the version
 * the device last saw, or null to merge with whatever the account holds. Unknown fields are dropped;
 * null when the body is too big or not this shape at all.
 */
export function parsePush(text: string): { data: AccountData; base: number | null } | null {
  if (text.length > MAX_BODY_CHARS) return null;
  let value: { profile?: unknown; tracker?: unknown; base?: unknown };
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;

  const base = value.base === null ? null : Number.isSafeInteger(value.base) && (value.base as number) >= 0 ? (value.base as number) : undefined;
  if (base === undefined) return null;

  if (value.tracker && typeof value.tracker === "object" && Object.keys(value.tracker).length > MAX_TRACKED) return null;
  const tracker = Object.fromEntries(Object.entries(trackerFrom(value.tracker)).filter(([id]) => PROJECT_ID.test(id)));

  const profile = profileFrom(value.profile);
  if (profile) {
    const items = [...profile.skills, ...profile.courses];
    if (items.length > MAX_PROFILE_ITEMS || items.some((item) => item.length > MAX_ITEM_CHARS)) return null;
  }
  return { data: { profile, tracker }, base };
}

/** What the account copy becomes when a device saves `incoming` on top of `stored`. */
export function applyPush(stored: SyncedData | null, incoming: AccountData, base: number | null): SyncedData {
  const current = stored ?? EMPTY_DATA;
  const data = base !== null && base === current.version ? incoming : mergeData(incoming, current);
  return { ...data, version: current.version + 1 };
}

/** Stored in this browser under SYNC_KEY. */
export interface SyncMarker {
  userId: string;
  version: number;
  /** Something changed here that has not reached the account yet. */
  dirty: boolean;
}

export function parseMarker(raw: string | null): SyncMarker | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (typeof value?.userId !== "string" || !Number.isSafeInteger(value.version)) return null;
    return { userId: value.userId, version: value.version, dirty: value.dirty === true };
  } catch {
    return null;
  }
}

/**
 * What a device does when it finds the student signed in:
 * - "merge": first time this browser meets this account. What it already has joins the account
 *   (sent with base null), so signing in never loses the list made before.
 * - "push": it has changes that did not reach the account yet. Sent with the version it last saw.
 * - "pull": nothing waiting here. The account's copy replaces this one if it is newer.
 */
export function syncStep(marker: SyncMarker | null, userId: string, local: AccountData): "merge" | "push" | "pull" {
  if (!marker || marker.userId !== userId) return hasData(local) ? "merge" : "pull";
  return marker.dirty ? "push" : "pull";
}
