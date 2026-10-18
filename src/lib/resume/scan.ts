/**
 * Find known skills and UCF courses in resume text, with the same fixed dictionary the scraper uses.
 *
 * No LLM and no network: every hit comes from an alias pattern in data/skills.json or a course in
 * data/course_skills.json, so results are predictable and testable. This module (and the JSON it
 * imports) is only loaded with import() after a student picks a file, so the Match page stays small.
 */

import courseFile from "../../../data/course_skills.json";
import skillFile from "../../../data/skills.json";

type Alias = string | { pattern: string; case_sensitive?: boolean };

interface SkillEntry {
  id: string;
  counts_toward_match?: boolean;
  parent?: string;
  aliases: Alias[];
}

interface CourseEntry {
  code: string;
  title: string;
}

export interface ResumeHit {
  /** Skill id or course code. */
  id: string;
  /** About 40 characters of the resume around the first match, on its line, whitespace collapsed. */
  snippet: string;
  /** Where the match sits inside `snippet`, as [start, end). */
  hit: [number, number];
}

export interface SkillHit extends ResumeHit {
  /** False for soft skills and training: listed, but they never count toward a match. */
  counts: boolean;
}

export interface ScanResult {
  courses: ResumeHit[];
  skills: SkillHit[];
}

interface CompiledSkill {
  id: string;
  counts: boolean;
  parent: string | null;
  patterns: RegExp[];
}

/**
 * Port of `_compile` in scraper/knightmatch_scraper/skills.py: whole-word style boundaries that
 * still allow symbols like C++ and C#. One difference: `m`, so `$` also ends a line. Resumes are
 * lists, and "Languages: Python, R" usually sits at the end of a line, not the end of the file.
 */
export function compileAlias(alias: Alias): RegExp {
  const [pattern, caseSensitive] = typeof alias === "string" ? [alias, false] : [alias.pattern, alias.case_sensitive === true];
  return new RegExp(`(?<![A-Za-z0-9])(?:${pattern})(?![A-Za-z0-9])`, caseSensitive ? "m" : "im");
}

// "COP 3502", "COP3502C", "CHM 2046L". The letter after the number is optional.
const COURSE_CODE = /(?<![A-Za-z0-9])([A-Z]{3})\s?(\d{4})([A-Z]?)(?![A-Za-z0-9])/g;
const SNIPPET_SIDE = 20;

let compiled: { skills: CompiledSkill[]; courses: CourseEntry[]; titles: { code: string; pattern: RegExp }[] } | null = null;

function dictionary() {
  if (compiled) return compiled;
  const skills = (skillFile.skills as SkillEntry[]).map((s) => ({
    id: s.id,
    counts: s.counts_toward_match ?? true,
    parent: s.parent ?? null,
    patterns: s.aliases.map(compileAlias),
  }));
  const courses = (courseFile.courses as CourseEntry[]).map(({ code, title }) => ({ code, title }));
  // One-word titles ("Genetics") name a topic far more often than the course, so only codes find those.
  const titles = courses
    .filter((c) => c.title.trim().split(/\s+/).length > 1)
    .map((c) => ({
      code: c.code,
      pattern: new RegExp(`(?<![A-Za-z0-9])${c.title.trim().split(/\s+/).map(escapeRegExp).join("\\s+")}(?![A-Za-z0-9])`, "i"),
    }));
  compiled = { skills, courses, titles };
  return compiled;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const collapse = (text: string) => text.replace(/\s+/g, " ");

/**
 * A short, readable piece of the resume around [start, end): it stays on the match's own line
 * (resumes are lists, so the next line is usually unrelated) and is cut at spaces where possible.
 */
export function snippetAround(text: string, start: number, end: number): Pick<ResumeHit, "snippet" | "hit"> {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = text.indexOf("\n", end);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  let from = Math.max(lineStart, start - SNIPPET_SIDE);
  let to = Math.min(lineEnd, end + SNIPPET_SIDE);
  if (from > lineStart) {
    const space = text.slice(from, start).search(/\s/);
    if (space >= 0) from += space + 1;
  }
  if (to < lineEnd) {
    const space = text.slice(end, to).search(/\s\S*$/);
    if (space >= 0) to = end + space;
  }
  const before = (from > lineStart ? "…" : "") + collapse(text.slice(from, start)).trimStart();
  const match = collapse(text.slice(start, end));
  const after = collapse(text.slice(end, to)).trimEnd() + (to < lineEnd ? "…" : "");
  return { snippet: before + match + after, hit: [before.length, before.length + match.length] };
}

/** Course code for a code written in the resume, or null when it is not in course_skills.json. */
function resolveCode(prefix: string, number: string, suffix: string, courses: CourseEntry[]): string | null {
  const exact = courses.find((c) => c.code === `${prefix}${number}${suffix}`);
  if (exact) return exact.code;
  if (suffix === "L") return null; // a lab is its own course, never the lecture
  const base = courses.filter((c) => c.code.slice(0, 7) === `${prefix}${number}`);
  const lectures = base.filter((c) => !c.code.endsWith("L"));
  const options = lectures.length > 0 ? lectures : base;
  return options.length === 1 ? options[0].code : null;
}

function firstMatch(patterns: RegExp[], text: string): { index: number; end: number } | null {
  let best: { index: number; end: number } | null = null;
  for (const pattern of patterns) {
    const m = pattern.exec(text);
    if (m && (best === null || m.index < best.index)) best = { index: m.index, end: m.index + m[0].length };
  }
  return best;
}

/**
 * Skills and courses in `text` that are not in the profile yet, in the order they appear.
 * A vaguer parent ("Programming") is left out when a child ("Python") is found or already owned.
 */
export function scanResume(rawText: string, profile: { skills: string[]; courses: string[] }): ScanResult {
  // NFKC turns PDF ligatures (ﬁ) and no-break spaces into plain text the patterns expect.
  const text = rawText.normalize("NFKC");
  const { skills, courses, titles } = dictionary();

  const foundCourses = new Map<string, { index: number; end: number }>();
  const keepFirst = (code: string, at: { index: number; end: number }) => {
    const seen = foundCourses.get(code);
    if (!seen || at.index < seen.index) foundCourses.set(code, at);
  };
  for (const m of text.matchAll(COURSE_CODE)) {
    const code = resolveCode(m[1], m[2], m[3], courses);
    if (code) keepFirst(code, { index: m.index, end: m.index + m[0].length });
  }
  for (const { code, pattern } of titles) {
    const m = pattern.exec(text);
    if (m) keepFirst(code, { index: m.index, end: m.index + m[0].length });
  }

  const foundSkills = new Map<string, { index: number; end: number; skill: CompiledSkill }>();
  for (const skill of skills) {
    const at = firstMatch(skill.patterns, text);
    if (at) foundSkills.set(skill.id, { ...at, skill });
  }
  const parentOf = new Map(skills.map((s) => [s.id, s.parent]));
  const owned = new Set(profile.skills);
  const coveredParents = new Set<string>();
  for (const id of [...owned, ...foundSkills.keys()]) {
    const parent = parentOf.get(id);
    if (parent) coveredParents.add(parent);
  }

  const takenCourses = new Set(profile.courses);
  const courseHits: ResumeHit[] = [...foundCourses.entries()]
    .filter(([code]) => !takenCourses.has(code))
    .sort((a, b) => a[1].index - b[1].index)
    .map(([code, at]) => ({ id: code, ...snippetAround(text, at.index, at.end) }));

  const skillHits: SkillHit[] = [...foundSkills.values()]
    .filter(({ skill }) => !owned.has(skill.id) && !coveredParents.has(skill.id))
    .sort((a, b) => a.index - b.index)
    .map(({ skill, index, end }) => ({ id: skill.id, counts: skill.counts, ...snippetAround(text, index, end) }));

  return { courses: courseHits, skills: skillHits };
}
