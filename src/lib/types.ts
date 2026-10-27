/** Shapes of the JSON files in data/ (written by the Python scraper). */

export type ProjectStatus = "open" | "full";
export type BeginnerReason = "explicit" | "no_required_skills" | null;

export interface Person {
  name: string;
  role: string | null;
}

export interface Project {
  id: string;
  source: "krsp";
  wp_post_id: number;
  title: string;
  url: string;
  status: ProjectStatus;
  semester: string | null;
  team_size: number | null;
  open_spots: number | null;
  affiliation: string | null;
  team_leader: Person | null;
  co_leaders: Person[];
  faculty_mentor: string | null;
  required_quals: string[];
  preferred_quals: string[];
  quals_raw: string;
  quals_hash: string;
  required_skills: string[];
  preferred_skills: string[];
  /** Skills only the AI step found (shown with an "AI" mark). */
  ai_skills: string[];
  beginner_friendly: boolean;
  beginner_reason: BeginnerReason;
  /** 0–3 ids from data/topics.json, most central first (tagged by the AI step). */
  topics: string[];
  description: string;
  first_seen_at: string;
  last_checked_at: string;
  last_changed_at: string;
  status_changed_at: string;
  listed: boolean;
  removed_at: string | null;
}

export interface Meta {
  scraper_version: string;
  source_url: string;
  last_run_at: string;
  baseline_at: string;
  counts: { listed: number; open: number; full: number };
  ai?: { status: "off" | "ok" | "partial" | "stopped"; model: string | null };
}

/** A skill as the UI needs it. `counts` = counts toward "You meet X of Y". */
export interface SkillInfo {
  id: string;
  label: string;
  category: string;
  counts: boolean;
  parent: string | null;
}
export type SkillMap = Record<string, SkillInfo>;

export interface Course {
  code: string;
  title: string;
  skills: string[];
}

/** The slim project shape sent to the browser for the listing page. */
export interface ListingProject {
  id: string;
  title: string;
  url: string;
  status: ProjectStatus;
  semester: string | null;
  openSpots: number | null;
  teamSize: number | null;
  colleges: string[];
  /** Topic ids, most central first (tagged by the AI step in the daily update). */
  topics: string[];
  /** Label of the first topic, shown on the card. */
  topicLabel: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  beginnerReason: BeginnerReason;
  firstSeenAt: string;
  lastCheckedAt: string;
  /** Lowercased text used by the search box. */
  searchText: string;
}

export interface PlaceLink {
  title: string;
  url: string;
  description: string;
  robots_blocks_check?: boolean;
  /** Labs only: shown before the host, e.g. "Psychology". */
  department?: string;
  /** Labs only: a phrase from the page that the weekly link check must still find (not shown). */
  still_says?: string;
}

export interface PlaceSection {
  id: string;
  /** Short wayfinding label shown above the section, e.g. "Start here". */
  label: string;
  title: string;
  intro: string;
  /** When someone last read these pages by hand (the labs section). */
  checked_on?: string;
  links: PlaceLink[];
  callout?: {
    title: string;
    url: string;
    body: string;
    steps: { label: string; url: string }[];
  };
}

export interface OtherPlaces {
  checked_on: string;
  note: string;
  sections: PlaceSection[];
}

/** What a student told us about themselves (stored only in their browser). */
export interface Profile {
  skills: string[];
  courses: string[];
  updatedAt: string;
}
