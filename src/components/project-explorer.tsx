"use client";

import { SlidersHorizontal, X } from "lucide-react";
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
import type { ListingProject, SkillMap } from "@/lib/types";
import { FilterPanel, type FacetOption } from "./filter-panel";
import { FullTeamRow, ProjectCard } from "./project-card";

interface ExplorerProps {
  projects: ListingProject[];
  skills: SkillMap;
  courseSkills: Record<string, string[]>;
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
): ListingProject[] {
  const sorted = [...list];
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

export function ProjectExplorer({ projects, skills, courseSkills, baselineAt }: ExplorerProps) {
  const search = useLocationSearch();
  const [chosen, setChosen] = useState<Filters | null>(null);
  const filters = chosen ?? (search ? parseFilters(search) : DEFAULT_FILTERS);

  const profile = useProfile();
  const now = useNow();

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
    () => sortProjects(projects.filter((p) => passes(p, filters)), sort, matches),
    [projects, filters, sort, matches],
  );

  const collegeOptions: FacetOption[] = useMemo(() => {
    const counts = facetCounts(projects, filters, "colleges");
    const all = [...new Set(projects.flatMap((p) => p.colleges))];
    return all
      .map((value) => ({ value, count: counts.get(value) ?? 0 }))
      .sort((a, b) => b.count - a.count || shortCollege(a.value).localeCompare(shortCollege(b.value)));
  }, [projects, filters]);

  const semesterOptions: FacetOption[] = useMemo(() => {
    const counts = facetCounts(projects, filters, "semesters");
    const all = [...new Set(projects.flatMap((p) => (p.semester ? [p.semester] : [])))];
    return all
      .sort((a, b) => semesterOrder(a) - semesterOrder(b))
      .map((value) => ({ value, count: counts.get(value) ?? 0 }));
  }, [projects, filters]);

  const beginnerCount = useMemo(() => toggleCount(projects, filters, "beginner"), [projects, filters]);

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
    colleges: collegeOptions,
    semesters: semesterOptions,
    beginnerCount,
  };
  const activeCount = activeFilterCount(filters);
  const chips = activeChips(filters, update);

  return (
    <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      <aside aria-label="Filters" className="hidden lg:block">
        {/* Never taller than the screen: if the filters don't fit, the sidebar scrolls on its own,
            so the last group (Semester) is always reachable. data-lenis-prevent = native wheel here. */}
        <div
          data-lenis-prevent
          className="sticky top-6 -m-1 max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain p-1 pb-6 [scrollbar-width:thin]"
        >
          <FilterPanel {...panelProps} />
        </div>
      </aside>

      <div>
        {/* Phones: [Filters] [Sort] on one row, count below. Desktop: count left, sort right. */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="order-1 lg:hidden">
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline" className="h-11 gap-2 px-4 lg:hidden">
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  Filters
                  {activeCount > 0 && (
                    <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
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

          <p aria-live="polite" className="order-3 basis-full text-sm text-muted-foreground lg:order-1 lg:basis-auto">
            <span className="font-semibold text-foreground tabular-nums">{visible.length}</span>{" "}
            {visible.length === 1 ? "project" : "projects"}
          </p>

          <div className="order-2 ml-auto">
            <Label htmlFor="km-sort" className="sr-only">
              Sort projects
            </Label>
            <Select value={sort} onValueChange={(value) => update({ ...filters, sort: value as SortKey })}>
              <SelectTrigger id="km-sort" className="gap-2 bg-card px-3 data-[size=default]:h-11 lg:data-[size=default]:h-9">
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
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border bg-card pr-2 pl-3 text-sm hover:border-border-strong active:scale-[0.97]"
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
            <Link href="/match" className="font-medium text-foreground underline underline-offset-4 hover:text-honey-ink">
              Edit my skills
            </Link>
          </p>
        )}

        {visible.length > 0 ? (
          <ul className="mt-4 grid gap-3">
            {visible.map((p) => (
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
                    />
                  ) : (
                    <FullTeamRow project={p} />
                  )}
                </li>
              </ViewTransition>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed px-6 py-10 text-center">
            <p className="font-serif text-xl">No projects match these filters.</p>
            <p className="mx-auto mt-2 max-w-[48ch] text-sm text-muted-foreground">
              {filters.openOnly
                ? "Full teams are hidden right now. Turn off “Open teams only” to include them, or clear the filters."
                : "Try a shorter search or fewer filters."}
            </p>
            <Button
              variant="outline"
              className="mt-5 h-11 px-4 active:scale-[0.97]"
              onClick={() => update({ ...DEFAULT_FILTERS, sort: filters.sort })}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface Chip {
  key: string;
  label: string;
  remove: () => void;
}

function activeChips(f: Filters, update: (next: Filters) => void): Chip[] {
  const chips: Chip[] = [];
  if (f.q.trim()) chips.push({ key: "q", label: `“${f.q.trim()}”`, remove: () => update({ ...f, q: "" }) });
  if (!f.openOnly) chips.push({ key: "full", label: "Including full teams", remove: () => update({ ...f, openOnly: true }) });
  if (f.beginner) chips.push({ key: "beginner", label: "Beginner-friendly", remove: () => update({ ...f, beginner: false }) });
  for (const c of f.colleges) {
    chips.push({ key: `c-${c}`, label: shortCollege(c), remove: () => update({ ...f, colleges: f.colleges.filter((x) => x !== c) }) });
  }
  for (const s of f.semesters) {
    chips.push({ key: `s-${s}`, label: s, remove: () => update({ ...f, semesters: f.semesters.filter((x) => x !== s) }) });
  }
  return chips;
}
