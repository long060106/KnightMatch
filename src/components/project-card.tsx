import { ArrowUpRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";
import { shortCollege } from "@/lib/filters";
import type { MatchResult } from "@/lib/match";
import type { ListingProject, SkillMap } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BeginnerNote, MatchMeter, NewBadge, SkillTag, SpotsBadge, type TagState } from "./project-bits";
import { RelativeTime } from "./relative-time";

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
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {!required.length && <span className="mr-1 text-sm text-muted-foreground">Nice to have</span>}
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

export function ProjectCard({ project, skills, match, have, isNew, topicLabel = project.topicLabel }: CardProps) {
  const titleId = `title-${project.id}`;
  // Known at build time, so only cards that will show a meter reserve space for it.
  const hasScoredRequirements = project.requiredSkills.some((id) => skills[id]?.counts);
  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "relative rounded-lg border bg-card p-4 md:p-5",
        "transition-[transform,border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]",
        "hover:-translate-y-0.5 hover:border-border-strong active:translate-y-0",
        "has-[a[data-card-link]:focus-visible]:outline-2 has-[a[data-card-link]:focus-visible]:outline-offset-2 has-[a[data-card-link]:focus-visible]:outline-ring",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 id={titleId} className="font-serif text-2xl leading-tight">
          <Link
            href={`/projects/${project.id}`}
            transitionTypes={[TO_DETAIL]}
            data-card-link
            className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none"
          >
            <ProjectTitle id={project.id} title={project.title} />
          </Link>
        </h3>
        {isNew && <NewBadge />}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {[topicLabel, project.colleges.map(shortCollege).join(", ")].filter(Boolean).join(" · ")}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {project.semester && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
            {project.semester}
          </span>
        )}
        <SpotsBadge status={project.status} openSpots={project.openSpots} />
        <BeginnerNote reason={project.beginnerReason} />
      </div>

      <SkillRow project={project} skills={skills} have={have} />

      <div className={cn(hasScoredRequirements && "km-match-slot")}>
        {match && match.total > 0 && (
          <div className="mt-3 flex items-center gap-3">
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

      <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          Checked <RelativeTime iso={project.lastCheckedAt} />
        </span>
        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-6 items-center gap-0.5 font-medium underline-offset-4 hover:text-foreground hover:underline"
        >
          Original KRSP listing
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </article>
  );
}

/** Full teams collapse to one quiet row: you can still read them, but they don't compete. */
export function FullTeamRow({ project }: { project: ListingProject }) {
  const titleId = `title-${project.id}`;
  return (
    <article
      aria-labelledby={titleId}
      className="relative flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border border-dashed px-4 py-3 transition-colors duration-[var(--dur-fast)] hover:border-border-strong has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring"
    >
      <h3 id={titleId} className="font-serif text-lg leading-snug text-foreground/80">
        <Link
          href={`/projects/${project.id}`}
          transitionTypes={[TO_DETAIL]}
          className="after:absolute after:inset-0 focus-visible:outline-none"
        >
          <ProjectTitle id={project.id} title={project.title} />
        </Link>
      </h3>
      <p className="flex gap-3 text-xs text-muted-foreground">
        <span>{project.colleges.map(shortCollege).join(", ")}</span>
        <span className="font-medium">Full team</span>
      </p>
    </article>
  );
}
