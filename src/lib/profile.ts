/**
 * Reading a stored profile. Shared by the browser store (profile-store.ts) and the account API, so
 * it must not live in a "use client" module.
 */

import type { Profile } from "./types";

/** What localStorage holds; anything unexpected gives null rather than being trusted. */
export function parseProfile(raw: string | null): Profile | null {
  if (!raw) return null;
  try {
    return profileFrom(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Keeps only the skill and course strings; null when there is nothing in it. */
export function profileFrom(value: unknown): Profile | null {
  const v = value as { skills?: unknown; courses?: unknown; updatedAt?: unknown } | null;
  if (!Array.isArray(v?.skills) || !Array.isArray(v?.courses)) return null;
  const strings = (list: unknown[]) => list.filter((x): x is string => typeof x === "string");
  const profile = { skills: strings(v.skills), courses: strings(v.courses), updatedAt: String(v.updatedAt ?? "") };
  return profile.skills.length || profile.courses.length ? profile : null;
}
