import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { ViewTransition, type ReactNode } from "react";
import { shortCollege } from "@/lib/filters";
import type { MatchResult } from "@/lib/match";
import type { ListingProject, SkillMap } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MatchMeter, NewBadge, SkillTag, SpotsFraction, type TagState } from "./project-bits";
import { LastCheck } from "./last-check";

const MAX_TAGS = 4;

interface CardProps {
  project: ListingProject;
  skills: SkillMap;
  /** null when the student has not added skills yet. */
  match: MatchResult | null;
  have: Set<string> | null;
  isNew: boolean;
  /** Overrides the project's first topic, e.g. with the topic the list is filtered by. */
  topicLabel?: string | null;
}

/** Navigation type set by card links; only these navigations morph the title. */
export const TO_DETAIL = "to-detail";

/**
 * Shared by card and detail page so the title can morph between them. The morph only runs for
 * card clicks (type "to-detail"), not when e.g. the Projects and Match pages swap, which both
 * show the same titles.
 */
export function ProjectTitle({ id, title }: { id: string; title: string }) {
  return (
    <ViewTransition name={`title-${id}`} share={{ [TO_DETAIL]: "title-morph", default: "none" }} default="none">
      <span>{title}</span>
    </ViewTransition>
  );
}

function tagState(id: string, have: Set<string> | null): TagState {
  if (!have) return "neutral";
  return have.has(id) ? "have" : "missing";
}

function SkillRow({ project, skills, have }: Pick<CardProps, "project" | "skills" | "have">) {
  const required = project.requiredSkills.filter((id) => skills[id]?.counts);
  const preferred = project.preferredSkills.filter((id) => skills[id]?.counts);
  const ids = required.length ? required : preferred;
  if (!ids.length) return null;
  const shown = ids.slice(0, MAX_TAGS);
  const hidden = ids.length - shown.length;
  return (
    <div className="km-dots mt-5 flex flex-wrap items-center gap-x-2 gap-y-1">
      {!required.length && <span className="km-label mr-1 text-muted-foreground">Nice to have</span>}
      {shown.map((id) => (
        <SkillTag
          key={id}
          label={skills[id].label}
          // Missing nice-to-haves stay neutral: they are never a gap.
          state={required.length ? tagState(id, have) : have?.has(id) ? "have" : "neutral"}
        />
      ))}
      {hidden > 0 && <span className="text-sm text-muted-foreground">+{hidden} more</span>}
    </div>
  );
}

/** Two-digit running number in the list ("01", "02"…), like an index in a printed catalogue. */
function indexLabel(index: number | undefined): string | null {
  return index === undefined ? null : String(index + 1).padStart(2, "0");
}

/**
 * Option A of the clickability rules: anything that opens another page has a hairline underline
 * and an arrow; things you can't click never do. The row also lightens a touch on hover.
 */
const TITLE_LINK =
  "underline decoration-border-strong decoration-1 underline-offset-[0.14em] transition-[text-decoration-color] duration-[var(--dur-fast)] group-hover:decoration-foreground";
const TITLE_ARROW =
  "ml-[0.2em] inline size-[0.6em] -translate-y-[0.04em] align-baseline text-muted-foreground transition-[translate,color] duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:translate-x-1 group-hover:text-foreground motion-reduce:transition-none";
const ROW_WASH =
  "before:absolute before:inset-y-0 before:-inset-x-3 before:-z-10 before:bg-foreground/[0.03] before:opacity-0 before:transition-opacity before:duration-[var(--dur-fast)] hover:before:opacity-100";

/** The hairline above a row that draws itself across on hover (the row's border stays underneath). */
function HoverRule() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 -top-px h-px origin-left scale-x-0 bg-foreground transition-transform duration-[var(--dur-move)] ease-[var(--ease-out)] group-hover:scale-x-100 motion-reduce:transition-none"
    />
  );
}

/**
 * One open project as a ruled row: running number and topic, the title large in the display serif,
 * the skills below it, and a right-hand column of facts set as mono labels (college, semester,
 * spots). No box: hairlines separate the rows.
 */
export function ProjectCard({
  project,
  skills,
  match,
  have,
  isNew,
  topicLabel = project.topicLabel,
  index,
}: CardProps & { index?: number }) {
  const titleId = `title-${project.id}`;
  // Known at build time, so only cards that will show a meter reserve space for it.
  const hasScoredRequirements = project.requiredSkills.some((id) => skills[id]?.counts);
  const number = indexLabel(index);
  const facts: { label: string; value: ReactNode }[] = [
    { label: "College", value: project.colleges.map(shortCollege).join(", ") },
    ...(project.semester ? [{ label: "Semester", value: project.semester }] : []),
    ...(project.status === "full"
      ? [{ label: "Spots", value: "Full team" }]
      : project.openSpots !== null
        ? [
            {
              label: "Open spots",
              value: <SpotsFraction openSpots={project.openSpots} teamSize={project.teamSize} className="flex-row-reverse" />,
            },
          ]
        : []),
    ...(project.beginnerReason ? [{ label: "Experience", value: "None needed" }] : []),
  ];
  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "group relative isolate grid gap-x-10 gap-y-6 border-t py-6 md:grid-cols-[minmax(0,1fr)_15rem] md:py-8",
        ROW_WASH,
        "has-[a[data-card-link]:focus-visible]:outline-2 has-[a[data-card-link]:focus-visible]:outline-offset-4 has-[a[data-card-link]:focus-visible]:outline-ring",
      )}
    >
      <HoverRule />
      <div className="min-w-0">
        <p className="km-label flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
          {number && <span className="text-foreground tabular-nums">{number}</span>}
          {number && topicLabel && <span aria-hidden="true">—</span>}
          {topicLabel && <span>{topicLabel}</span>}
          {isNew && <NewBadge />}
        </p>
        <h3 id={titleId} className="mt-4 font-serif text-[1.75rem] leading-[1.08] tracking-[-0.01em] md:text-[2.125rem]">
          <Link
            href={`/projects/${project.id}`}
            transitionTypes={[TO_DETAIL]}
            data-card-link
            className={cn(TITLE_LINK, "after:absolute after:inset-0 focus-visible:outline-none")}
          >
            <ProjectTitle id={project.id} title={project.title} />
            <ArrowRight aria-hidden="true" className={TITLE_ARROW} />
          </Link>
        </h3>

        <SkillRow project={project} skills={skills} have={have} />

        <div className={cn(hasScoredRequirements && "km-match-slot")}>
          {match && match.total > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <MatchMeter met={match.met.length} total={match.total} />
              <p className="text-sm">
                <span className="font-medium">
                  You meet {match.met.length} of {match.total}
                </span>{" "}
                listed {match.total === 1 ? "requirement" : "requirements"}
                {match.preferredMet.length > 0 && (
                  <span className="text-muted-foreground">, plus {match.preferredMet.length} nice-to-have</span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="km-label flex flex-col gap-6 text-muted-foreground">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2.5">
          {facts.map((fact) => (
            <div key={fact.label} className="contents">
              <dt>{fact.label}</dt>
              <dd className="text-right text-foreground">{fact.value}</dd>
            </div>
          ))}
        </dl>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 md:mt-auto">
          <span>
            Checked <LastCheck iso={project.lastCheckedAt} />
          </span>
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-0.5 underline decoration-border-strong underline-offset-[5px] hover:text-foreground hover:decoration-foreground md:min-h-6"
          >
            KRSP listing
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
            <span className="sr-only">(original page, opens in a new tab)</span>
          </a>
        </div>
      </div>
    </article>
  );
}

/** Full teams collapse to one quiet row: you can still read them, but they don't compete. */
export function FullTeamRow({ project, index }: { project: ListingProject; index?: number }) {
  const titleId = `title-${project.id}`;
  const number = indexLabel(index);
  return (
    <article
      aria-labelledby={titleId}
      className="group relative isolate grid items-baseline gap-x-10 gap-y-1 border-t py-4 before:absolute before:inset-y-0 before:-inset-x-3 before:-z-10 before:bg-foreground/[0.03] before:opacity-0 before:transition-opacity before:duration-[var(--dur-fast)] hover:before:opacity-100 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-ring md:grid-cols-[minmax(0,1fr)_15rem]"
    >
      <HoverRule />
      <h3 id={titleId} className="flex items-baseline gap-4 font-serif text-xl leading-snug text-foreground/70">
        {number && <span className="km-label text-muted-foreground tabular-nums">{number}</span>}
        <Link
          href={`/projects/${project.id}`}
          transitionTypes={[TO_DETAIL]}
          className={cn(TITLE_LINK, "after:absolute after:inset-0 focus-visible:outline-none")}
        >
          <ProjectTitle id={project.id} title={project.title} />
          <ArrowRight aria-hidden="true" className={TITLE_ARROW} />
        </Link>
      </h3>
      <p className="km-label flex justify-between gap-4 text-muted-foreground">
        <span>{project.colleges.map(shortCollege).join(", ")}</span>
        <span>Full team</span>
      </p>
    </article>
  );
}
