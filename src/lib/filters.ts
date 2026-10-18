/** Listing filters, their URL form (so links can be shared), and facet counts. */

import type { ListingProject } from "./types";

export type SortKey = "match" | "newest" | "spots";

export interface Filters {
  q: string;
  openOnly: boolean;
  beginner: boolean;
  colleges: string[];
  semesters: string[];
  /** null = automatic: best match when the student added skills, otherwise newest. */
  sort: SortKey | null;
}

export const DEFAULT_FILTERS: Filters = {
  q: "",
  openOnly: true,
  beginner: false,
  colleges: [],
  semesters: [],
  sort: null,
};

const SORT_KEYS: SortKey[] = ["match", "newest", "spots"];

export function parseFilters(search: string): Filters {
  const params = new URLSearchParams(search);
  const sort = params.get("sort") as SortKey | null;
  return {
    q: params.get("q")?.trim() ?? "",
    openOnly: params.get("full") !== "1",
    beginner: params.get("beginner") === "1",
    colleges: params.getAll("college"),
    semesters: params.getAll("semester"),
    sort: sort && SORT_KEYS.includes(sort) ? sort : null,
  };
}

/** Only non-default values go in the URL, so the plain homepage stays "/". */
export function serializeFilters(f: Filters): string {
  const params = new URLSearchParams();
  if (f.q.trim()) params.set("q", f.q.trim());
  if (!f.openOnly) params.set("full", "1");
  if (f.beginner) params.set("beginner", "1");
  for (const c of f.colleges) params.append("college", c);
  for (const s of f.semesters) params.append("semester", s);
  if (f.sort) params.set("sort", f.sort);
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** How many filters differ from the defaults (shown on the mobile Filters button). */
export function activeFilterCount(f: Filters): number {
  return (
    (f.q.trim() ? 1 : 0) +
    (f.openOnly ? 0 : 1) +
    (f.beginner ? 1 : 0) +
    f.colleges.length +
    f.semesters.length
  );
}

type FacetKey = "q" | "openOnly" | "beginner" | "colleges" | "semesters";

/** Does p pass every filter except `skip`? (Skipping one gives correct facet counts.) */
export function passes(p: ListingProject, f: Filters, skip?: FacetKey): boolean {
  if (skip !== "openOnly" && f.openOnly && p.status !== "open") return false;
  if (skip !== "beginner" && f.beginner && !p.beginnerReason) return false;
  if (skip !== "colleges" && f.colleges.length && !p.colleges.some((c) => f.colleges.includes(c))) return false;
  if (skip !== "semesters" && f.semesters.length && !(p.semester && f.semesters.includes(p.semester))) return false;
  if (skip !== "q" && f.q.trim()) {
    const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.every((w) => p.searchText.includes(w))) return false;
  }
  return true;
}

/** Counts per option for a checkbox group, given all the other active filters. */
export function facetCounts(
  projects: ListingProject[],
  f: Filters,
  key: "colleges" | "semesters",
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of projects) {
    if (!passes(p, f, key)) continue;
    const values = key === "colleges" ? p.colleges : p.semester ? [p.semester] : [];
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}

/** How many results a toggle would give if it were switched on. */
export function toggleCount(projects: ListingProject[], f: Filters, key: "openOnly" | "beginner"): number {
  const on = { ...f, [key]: true };
  return projects.filter((p) => passes(p, on)).length;
}

const TERM_ORDER: Record<string, number> = { spring: 1, summer: 2, fall: 3 };

/** "Fall 2026" -> 20263, so semesters sort in calendar order. */
export function semesterOrder(semester: string): number {
  const match = /^(spring|summer|fall)\s+(\d{4})$/i.exec(semester.trim());
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[2]) * 10 + TERM_ORDER[match[1].toLowerCase()];
}

/** "College of Engineering and Computer Science" -> "Engineering and Computer Science". */
export function shortCollege(name: string): string {
  return name.replace(/^College of\s+/i, "");
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** New this week, but never the projects that were already there on our first run. */
export function isNewThisWeek(firstSeenAt: string, baselineAt: string, now: number): boolean {
  const seen = Date.parse(firstSeenAt);
  return seen > Date.parse(baselineAt) && now - seen < WEEK_MS;
}
