/**
 * Skill matching with fixed rules (set operations), never an LLM.
 *
 * - Only skills with `counts: true` are requirements (soft skills and training are shown, not scored).
 * - Owning a child skill satisfies its parent: Python satisfies "Programming (any language)".
 *   The reverse is not true: "3D software" in general does not mean you know Maya.
 */

import type { Profile, SkillMap } from "./types";

export interface MatchResult {
  /** Counted required skills. */
  total: number;
  met: string[];
  missing: string[];
  /** Counted preferred skills the student has (a bonus, never a gap). */
  preferredMet: string[];
}

/** The student's skills plus the parent of each one. */
export function expandSkills(owned: Iterable<string>, skills: SkillMap): Set<string> {
  const have = new Set<string>();
  for (const id of owned) {
    have.add(id);
    const parent = skills[id]?.parent;
    if (parent) have.add(parent);
  }
  return have;
}

/** Skills from ticked boxes plus skills implied by completed courses. */
export function profileSkills(
  profile: Profile,
  courseSkills: Record<string, string[]>,
  skills: SkillMap,
): Set<string> {
  const owned = [...profile.skills];
  for (const code of profile.courses) owned.push(...(courseSkills[code] ?? []));
  return expandSkills(owned, skills);
}

export function matchProject(
  required: string[],
  preferred: string[],
  have: Set<string>,
  skills: SkillMap,
): MatchResult {
  const counted = required.filter((id) => skills[id]?.counts);
  const met = counted.filter((id) => have.has(id));
  const missing = counted.filter((id) => !have.has(id));
  const preferredMet = preferred.filter((id) => skills[id]?.counts && have.has(id));
  return { total: counted.length, met, missing, preferredMet };
}

/** Share of listed requirements met; a project that lists none counts as fully open. */
export function matchRatio(result: MatchResult): number {
  return result.total === 0 ? 1 : result.met.length / result.total;
}

/**
 * Where your skills count, first:
 *   0. you meet every listed requirement
 *   1. you meet some of them
 *   2. the team lists no specific skills (open to anyone, but not tailored to you)
 *   3. you meet none yet
 */
export function matchTier(result: MatchResult): number {
  if (result.total > 0 && result.met.length === result.total) return 0;
  if (result.met.length > 0) return 1;
  if (result.total === 0) return 2;
  return 3;
}

/**
 * Best match first: by tier, then share met, then more requirements met (4 of 4 beats 1 of 1),
 * then fewer missing (0 of 1 is closer than 0 of 7), then more nice-to-haves, then newer.
 */
export function compareMatches(
  a: { result: MatchResult; firstSeenAt: string },
  b: { result: MatchResult; firstSeenAt: string },
): number {
  return (
    matchTier(a.result) - matchTier(b.result) ||
    matchRatio(b.result) - matchRatio(a.result) ||
    b.result.met.length - a.result.met.length ||
    a.result.missing.length - b.result.missing.length ||
    b.result.preferredMet.length - a.result.preferredMet.length ||
    b.firstSeenAt.localeCompare(a.firstSeenAt)
  );
}
