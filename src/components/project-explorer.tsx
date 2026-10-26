"use client";

import { ArrowRight, Bookmark, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { ViewTransition, addTransitionType, startTransition, useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  facetCounts,
  isNewThisWeek,
  parseFilters,
  passes,
  semesterOrder,
  serializeFilters,
  shortCollege,
  toggleCount,
  type Filters,
  type SortKey,
} from "@/lib/filters";
import { compareMatches, matchProject, profileSkills, type MatchResult } from "@/lib/match";
import { useProfile } from "@/lib/profile-store";
import { useNow } from "@/lib/time";
import { compareTracked, type Tracker } from "@/lib/tracker";
import { useTracker } from "@/lib/tracker-store";
import type { ListingProject, SkillMap } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FilterPanel, type FacetOption } from "./filter-panel";
import { FullTeamRow, ProjectCard } from "./project-card";
import { StickyPanel } from "./sticky-panel";

interface ExplorerProps {
  projects: ListingProject[];
  skills: SkillMap;
  courseSkills: Record<string, string[]>;
  /** Topic id -> label, in display order. */
  topics: Record<string, string>;
  baselineAt: string;
}

const SORT_LABEL: Record<SortKey, string> = {
  match: "Best match",
  newest: "Newest",
  spots: "Most open spots",
};

function subscribeToLocation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

/** The query string, or null while prerendering (so the HTML shows the default list). */
function useLocationSearch(): string | null {
  return useSyncExternalStore(subscribeToLocation, () => window.location.search, () => null);
}

function sortProjects(
  list: ListingProject[],
  sort: SortKey,
  matches: Map<string, MatchResult> | null,
  /** Your list: follow-ups that are due first, then the newest change, open or full. */
  mine: { tracker: Tracker; now: number } | null,
): ListingProject[] {
  const sorted = [...list];
  if (mine) {
    return sorted.sort((a, b) => compareTracked(mine.tracker[a.id], mine.tracker[b.id], mine.now));
  }
  if (sort === "match" && matches) {
    sorted.sort((a, b) =>
      compareMatches(
        { result: matches.get(a.id)!, firstSeenAt: a.firstSeenAt },
        { result: matches.get(b.id)!, firstSeenAt: b.firstSeenAt },
      ),
    );
  } else if (sort === "spots") {
    sorted.sort((a, b) => (b.openSpots ?? -1) - (a.openSpots ?? -1));
  } else {
    sorted.sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt));
  }
  // Full teams always sink to the bottom (stable sort keeps the order above).
  return sorted.sort((a, b) => Number(a.status === "full") - Number(b.status === "full"));
}

export function ProjectExplorer({ projects, skills, courseSkills, topics, baselineAt }: ExplorerProps) {
  const search = useLocationSearch();
  const [chosen, setChosen] = useState<Filters | null>(null);
  const filters = chosen ?? (search ? parseFilters(search) : DEFAULT_FILTERS);

  const profile = useProfile();
  const now = useNow();
  const tracker = useTracker();
  const listCount = tracker ? projects.filter((p) => tracker[p.id]).length : null;

  // Your list keeps every team you saved or emailed, including ones that have filled up since.
  const pool = useMemo(
    () => (filters.mine ? projects.filter((p) => tracker?.[p.id]) : projects),
    [projects, filters.mine, tracker],
  );
  const applied = useMemo(() => (filters.mine ? { ...filters, openOnly: false } : filters), [filters]);

  const have = useMemo(
    () => (profile ? profileSkills(profile, courseSkills, skills) : null),
    [profile, courseSkills, skills],
  );
  const matches = useMemo(() => {
    if (!have) return null;
    return new Map(projects.map((p) => [p.id, matchProject(p.requiredSkills, p.preferredSkills, have, skills)]));
  }, [have, projects, skills]);

  const sort: SortKey = filters.sort ?? (matches ? "match" : "newest");
  const visible = useMemo(
    () =>
      sortProjects(
        pool.filter((p) => passes(p, applied)),
        sort,
        matches,
        // The list and the clock are both read in the browser, so `now` is set whenever `tracker` is.
        filters.mine && tracker ? { tracker, now: now ?? 0 } : null,
      ),
    [pool, applied, sort, matches, filters.mine, tracker, now],
  );

  const topicOptions: FacetOption[] = useMemo(() => {
    const counts = facetCounts(pool, applied, "topics");
    const order = Object.keys(topics);
    return order
      .filter((value) => pool.some((p) => p.topics.includes(value)))
      .map((value) => ({ value, count: counts.get(value) ?? 0 }))
      .sort((a, b) => b.count - a.count || order.indexOf(a.value) - order.indexOf(b.value));
  }, [pool, applied, topics]);

  const collegeOptions: FacetOption[] = useMemo(() => {
    const counts = facetCounts(pool, applied, "colleges");
    const all = [...new Set(pool.flatMap((p) => p.colleges))];
    return all
      .map((value) => ({ value, count: counts.get(value) ?? 0 }))
      .sort((a, b) => b.count - a.count || shortCollege(a.value).localeCompare(shortCollege(b.value)));
  }, [pool, applied]);

  const semesterOptions: FacetOption[] = useMemo(() => {
    const counts = facetCounts(pool, applied, "semesters");
    const all = [...new Set(pool.flatMap((p) => (p.semester ? [p.semester] : [])))];
    return all
      .sort((a, b) => semesterOrder(a) - semesterOrder(b))
      .map((value) => ({ value, count: counts.get(value) ?? 0 }));
  }, [pool, applied]);

  const beginnerCount = useMemo(() => toggleCount(pool, applied, "beginner"), [pool, applied]);

  function update(next: Filters) {
    // Keep the URL shareable; Next.js keeps its router in sync with replaceState.
    window.history.replaceState(null, "", `${window.location.pathname}${serializeFilters(next)}`);
    startTransition(() => {
      addTransitionType("filter"); // lets the cards glide to their new places
      setChosen(next);
    });
  }

  const panelProps = {
    filters,
    onChange: update,
    topics: topicOptions,
    topicLabels: topics,
    colleges: collegeOptions,
    semesters: semesterOptions,
    beginnerCount,
    // Your list shows full teams too, so the switch would only confuse there.
    showOpenToggle: !filters.mine,
  };
  const activeCount = activeFilterCount(filters);
  const chips = activeChips(filters, update, topics);

  return (
    <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      <aside aria-label="Filters" className="hidden lg:block lg:border-r lg:pr-8">
        <StickyPanel className="pb-6">
          <FilterPanel {...panelProps} />
        </StickyPanel>
      </aside>

      <div>
        <ListTabs mine={filters.mine} count={listCount} onChange={(mine) => update({ ...filters, mine })} />

        {/* Phones: [Filters] [Sort] on one row, count below. Desktop: count left, sort right. */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="order-1 lg:hidden">
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline" className="h-11 gap-2 px-4 lg:hidden">
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  Filters
                  {activeCount > 0 && (
                    <span className="rounded-none bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
                      {activeCount}
                    </span>
                  )}
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[88dvh]">
                <DrawerHeader className="text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
                  <DrawerTitle>Filters</DrawerTitle>
                  <DrawerDescription>Changes apply right away.</DrawerDescription>
                </DrawerHeader>
                <div className="overflow-y-auto px-4 pb-2">
                  <FilterPanel {...panelProps} />
                </div>
                <DrawerFooter className="border-t pb-[calc(1rem+env(safe-area-inset-bottom))]">
                  <DrawerClose asChild>
                    <Button className="h-12 text-base active:scale-[0.97]">
                      Show {visible.length} {visible.length === 1 ? "project" : "projects"}
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <p aria-live="polite" className="km-label order-3 basis-full text-muted-foreground lg:order-1 lg:basis-auto">
            <span className="text-foreground tabular-nums">{visible.length}</span>{" "}
            {visible.length === 1 ? "project" : "projects"}
          </p>

          <div className={filters.mine ? "hidden" : "order-2 ml-auto"}>
            <Label htmlFor="km-sort" className="sr-only">
              Sort projects
            </Label>
            <Select value={sort} onValueChange={(value) => update({ ...filters, sort: value as SortKey })}>
              <SelectTrigger id="km-sort" className="gap-2 bg-background px-3 data-[size=default]:h-11 lg:data-[size=default]:h-9">
                <span className="text-muted-foreground" aria-hidden="true">
                  Sort:
                </span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {(Object.keys(SORT_LABEL) as SortKey[])
                  .filter((key) => key !== "match" || matches)
                  .map((key) => (
                    <SelectItem key={key} value={key} className="py-2.5 lg:py-1.5">
                      {SORT_LABEL[key]}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {chips.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Active filters">
            {chips.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  onClick={chip.remove}
                  aria-label={`Remove filter: ${chip.label}`}
                  className="inline-flex h-9 items-center gap-1.5 border bg-background pr-2 pl-3 text-sm hover:border-border-strong active:scale-[0.97]"
                >
                  {chip.label}
                  <X className="size-3.5 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {profile && (
          <p className="mt-4 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
            Matching against the skills and courses you added.{" "}
            <span className="text-foreground">Many teams still take students who are eager to learn. Reach out.</span>{" "}
            <Link href="/match" className="km-link group inline-flex items-center gap-1 font-medium text-foreground">
              Edit my skills
              <ArrowRight
                className="size-3.5 transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </p>
        )}

        <h2 className="sr-only">Project list</h2>
        {visible.length > 0 ? (
          <ul className="mt-6 border-b">
            {visible.map((p, i) => (
              <ViewTransition
                key={p.id}
                name={`card-${p.id}`}
                update={{ filter: "card-move", default: "none" }}
                enter={{ filter: "card-enter", default: "none" }}
                exit={{ filter: "card-exit", default: "none" }}
                default="none"
              >
                <li>
                  {p.status === "open" ? (
                    <ProjectCard
                      project={p}
                      skills={skills}
                      have={have}
                      match={matches?.get(p.id) ?? null}
                      isNew={now !== null && isNewThisWeek(p.firstSeenAt, baselineAt, now)}
                      topicLabel={topics[p.topics.find((t) => filters.topics.includes(t)) ?? ""] ?? p.topicLabel}
                      index={i}
                      tracked={tracker?.[p.id] ?? null}
                      now={now}
                    />
                  ) : (
                    <FullTeamRow project={p} index={i} tracked={tracker?.[p.id] ?? null} now={now} />
                  )}
                </li>
              </ViewTransition>
            ))}
          </ul>
        ) : filters.mine && listCount === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed px-6 py-10 text-center">
            <p className="font-serif text-xl">Your list is empty.</p>
            <p className="mx-auto mt-2 max-w-[48ch] text-sm text-muted-foreground">
              Open a project and press “Save to my list”. After you email a team, mark it as emailed and your list
              says when to follow up. It stays on this device.
            </p>
            <Button variant="outline" className="mt-5 h-11 px-4 active:scale-[0.97]" onClick={() => update({ ...filters, mine: false })}>
              See all projects
            </Button>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed px-6 py-10 text-center">
            <p className="font-serif text-xl">No projects match these filters.</p>
            <p className="mx-auto mt-2 max-w-[48ch] text-sm text-muted-foreground">
              {applied.openOnly
                ? "Full teams are hidden right now. Turn off “Open teams only” to include them, or clear the filters."
                : "Try a shorter search or fewer filters."}
            </p>
            <Button
              variant="outline"
              className="mt-5 h-11 px-4 active:scale-[0.97]"
              onClick={() => update({ ...DEFAULT_FILTERS, mine: filters.mine, sort: filters.sort })}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** All projects | Your list (n). The count appears once the browser has read the list. */
function ListTabs({ mine, count, onChange }: { mine: boolean; count: number | null; onChange: (mine: boolean) => void }) {
  const tab = (on: boolean) =>
    cn(
      "km-label inline-flex min-h-11 items-center gap-2 border-b-2 transition-colors duration-[var(--dur-fast)]",
      on ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
    );
  return (
    <div role="group" aria-label="Which projects" className="mb-5 flex gap-6 border-b">
      <button type="button" aria-pressed={!mine} onClick={() => onChange(false)} className={tab(!mine)}>
        All projects
      </button>
      <button type="button" aria-pressed={mine} onClick={() => onChange(true)} className={tab(mine)}>
        <Bookmark className="size-3.5" aria-hidden="true" />
        Your list
        {count !== null && <span className="tabular-nums">{String(count).padStart(2, "0")}</span>}
      </button>
    </div>
  );
}

interface Chip {
  key: string;
  label: string;
  remove: () => void;
}

function activeChips(f: Filters, update: (next: Filters) => void, topics: Record<string, string>): Chip[] {
  const chips: Chip[] = [];
  if (f.q.trim()) chips.push({ key: "q", label: `“${f.q.trim()}”`, remove: () => update({ ...f, q: "" }) });
  if (!f.openOnly) chips.push({ key: "full", label: "Including full teams", remove: () => update({ ...f, openOnly: true }) });
  if (f.beginner) chips.push({ key: "beginner", label: "Beginner-friendly", remove: () => update({ ...f, beginner: false }) });
  for (const t of f.topics) {
    chips.push({ key: `t-${t}`, label: topics[t] ?? t, remove: () => update({ ...f, topics: f.topics.filter((x) => x !== t) }) });
  }
  for (const c of f.colleges) {
    chips.push({ key: `c-${c}`, label: shortCollege(c), remove: () => update({ ...f, colleges: f.colleges.filter((x) => x !== c) }) });
  }
  for (const s of f.semesters) {
    chips.push({ key: `s-${s}`, label: s, remove: () => update({ ...f, semesters: f.semesters.filter((x) => x !== s) }) });
  }
  return chips;
}
