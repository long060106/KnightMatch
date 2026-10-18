/**
 * Build-time data access. These imports are read during `next build` (static export),
 * so the site never calls a server: the daily scrape commits new JSON and triggers a rebuild.
 */

import coursesJson from "../../data/course_skills.json";
import metaJson from "../../data/meta.json";
import otherPlacesJson from "../../data/other-places.json";
import projectsJson from "../../data/projects.json";
import skillsJson from "../../data/skills.json";
import type { Course, ListingProject, Meta, OtherPlaces, Project, SkillMap } from "./types";

/** Hand-checked links for the Other places page (see scraper/knightmatch_scraper/check_links.py). */
export const otherPlaces = otherPlacesJson as OtherPlaces;

interface SkillsFile {
  categories: Record<string, string>;
  skills: { id: string; label: string; category: string; counts_toward_match?: boolean; parent?: string }[];
}

export const meta = metaJson as unknown as Meta;

/** Projects currently on the KRSP list (removed ones are kept in the JSON for history only). */
export const projects: Project[] = (projectsJson as unknown as Project[]).filter((p) => p.listed);

export const skillCategories = (skillsJson as SkillsFile).categories;

export const skills: SkillMap = Object.fromEntries(
  (skillsJson as SkillsFile).skills.map((s) => [
    s.id,
    {
      id: s.id,
      label: s.label,
      category: s.category,
      counts: s.counts_toward_match ?? true,
      parent: s.parent ?? null,
    },
  ]),
);

export const courses: Course[] = (coursesJson as { courses: Course[] }).courses;

export const courseSkills: Record<string, string[]> = Object.fromEntries(courses.map((c) => [c.code, c.skills]));

export function getProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

const SEARCH_DESCRIPTION_CHARS = 600;

export function toListing(p: Project): ListingProject {
  const colleges = (p.affiliation ?? "").split("; ").filter(Boolean);
  const skillLabels = [...p.required_skills, ...p.preferred_skills].map((id) => skills[id]?.label ?? id);
  const searchText = [
    p.title,
    ...colleges,
    p.semester ?? "",
    ...skillLabels,
    p.quals_raw,
    p.description.slice(0, SEARCH_DESCRIPTION_CHARS),
  ]
    .join(" ")
    .toLowerCase();
  return {
    id: p.id,
    title: p.title,
    url: p.url,
    status: p.status,
    semester: p.semester,
    openSpots: p.open_spots,
    colleges,
    requiredSkills: p.required_skills,
    preferredSkills: p.preferred_skills,
    beginnerReason: p.beginner_reason,
    firstSeenAt: p.first_seen_at,
    lastCheckedAt: p.last_checked_at,
    searchText,
  };
}

/** Only the skills a set of projects mentions (plus their parents), to keep the page small. */
export function skillsUsedBy(list: ListingProject[]): SkillMap {
  const used: SkillMap = {};
  const add = (id: string) => {
    const skill = skills[id];
    if (!skill || used[id]) return;
    used[id] = skill;
    if (skill.parent) add(skill.parent);
  };
  for (const p of list) [...p.requiredSkills, ...p.preferredSkills].forEach(add);
  return used;
}
