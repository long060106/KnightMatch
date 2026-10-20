/** Small presentational pieces shared by project cards and the detail page. */

import { Check, Sprout, Users } from "lucide-react";
import { SPOTS_LEVEL_LABEL, spotsFraction, spotsLevel, type SpotsLevel } from "@/lib/spots";
import type { BeginnerReason, ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NewBadge() {
  return (
    <span className="km-label inline-flex shrink-0 items-center gap-1.5 border border-honey-ink/40 bg-honey-wash px-1.5 py-0.5 text-honey-ink">
      <span className="relative flex size-2" aria-hidden="true">
        <span className="km-pulse-ring absolute inset-0 rounded-full bg-meter-on" />
        <span className="relative size-2 rounded-full bg-meter-on" />
      </span>
      New
    </span>
  );
}

const SPOTS_TEXT: Record<SpotsLevel, string> = {
  high: "text-spots-high",
  mid: "text-spots-mid",
  low: "text-spots-low",
};

/**
 * "8 / 20" in the band's color (green ≥70% open, yellow 30–70%, red <30%) with a short bar whose
 * length is the open share, so the band reads without color too. Screen readers hear
 * "8 of 20 spots open, filling up".
 */
export function SpotsFraction({
  openSpots,
  teamSize,
  suffix,
  bar = true,
  className,
}: {
  openSpots: number;
  teamSize: number | null;
  /** Visible words after the number, e.g. "spots open". */
  suffix?: string;
  bar?: boolean;
  className?: string;
}) {
  const level = teamSize ? spotsLevel(openSpots, teamSize) : null;
  const share = teamSize ? Math.min(openSpots / teamSize, 1) : 0;
  return (
    <span className={cn("inline-flex items-center gap-2 tabular-nums", level && SPOTS_TEXT[level], className)}>
      <span aria-hidden="true">
        {spotsFraction(openSpots, teamSize)}
        {suffix && ` ${suffix}`}
      </span>
      <span className="sr-only">
        {teamSize ? `${openSpots} of ${teamSize}` : openSpots} {openSpots === 1 ? "spot" : "spots"} open
        {level && `, ${SPOTS_LEVEL_LABEL[level]}`}
      </span>
      {bar && level && (
        <span aria-hidden="true" className="relative h-1 w-8 shrink-0 bg-meter-off">
          <span className="absolute inset-0 origin-left bg-current" style={{ transform: `scaleX(${share})` }} />
        </span>
      )}
    </span>
  );
}

export function SpotsBadge({
  status,
  openSpots,
  teamSize,
}: {
  status: ProjectStatus;
  openSpots: number | null;
  teamSize: number | null;
}) {
  if (status === "full") {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Users className="size-4" aria-hidden="true" />
        {teamSize ? `Full team of ${teamSize}` : "Full team"}
      </span>
    );
  }
  if (openSpots === null) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Users className="size-4 text-muted-foreground" aria-hidden="true" />
      <SpotsFraction openSpots={openSpots} teamSize={teamSize} suffix="spots open" />
    </span>
  );
}

export const BEGINNER_LABEL: Record<Exclude<BeginnerReason, null>, string> = {
  explicit: "No experience required",
  no_required_skills: "No specific skills listed",
};

export function BeginnerNote({ reason }: { reason: BeginnerReason }) {
  if (!reason) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <Sprout className="size-4" aria-hidden="true" />
      {BEGINNER_LABEL[reason]}
    </span>
  );
}

export type TagState = "neutral" | "have" | "missing";

/**
 * Skills are plain text, never boxes, so they can't be mistaken for buttons (they aren't clickable).
 * have = honey ink + check; missing = muted with a hollow ring (never red or an X); neutral = plain.
 * `ai`: found by the AI step rather than the word list, marked so students know to check the wording.
 * Put tags in a `km-dots` row to get the "·" separators.
 */
export function SkillTag({ label, state, ai = false }: { label: string; state: TagState; ai?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm leading-6 transition-colors duration-[var(--dur-base)]",
        state === "have" && "font-medium text-honey-ink",
        state === "missing" && "text-muted-foreground",
        state === "neutral" && "text-foreground/85",
      )}
    >
      {state === "have" && <Check className="size-3.5" aria-hidden="true" />}
      {state === "missing" && <span className="size-2.5 rounded-full border border-current" aria-hidden="true" />}
      {label}
      {ai && (
        <span className="ml-0.5 font-mono text-[0.625rem] tracking-wide text-muted-foreground" aria-hidden="true">
          AI
        </span>
      )}
      {ai && <span className="sr-only"> (found by AI)</span>}
      {state === "have" && <span className="sr-only"> (you have this)</span>}
      {state === "missing" && <span className="sr-only"> (not in your profile yet)</span>}
    </span>
  );
}

/** One segment per listed requirement; filled segments slide in left to right. */
export function MatchMeter({ met, total, className }: { met: number; total: number; className?: string }) {
  return (
    <span className={cn("flex shrink-0 gap-1", className)} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn("h-2 overflow-hidden rounded-none bg-meter-off", total > 6 ? "w-3" : "w-5")}>
          <span
            className="block h-full origin-left rounded-none bg-meter-on transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)]"
            style={{ transform: `scaleX(${i < met ? 1 : 0})`, transitionDelay: `${i * 40}ms` }}
          />
        </span>
      ))}
    </span>
  );
}
