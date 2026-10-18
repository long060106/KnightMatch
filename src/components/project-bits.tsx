/** Small presentational pieces shared by project cards and the detail page. */

import { Check, Sprout, Timer, Users } from "lucide-react";
import type { BeginnerReason, ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NewBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-honey-wash px-2 py-0.5 text-xs font-semibold text-honey-ink">
      <span className="relative flex size-2" aria-hidden="true">
        <span className="km-pulse-ring absolute inset-0 rounded-full bg-meter-on" />
        <span className="relative size-2 rounded-full bg-meter-on" />
      </span>
      New
    </span>
  );
}

export function SpotsBadge({ status, openSpots }: { status: ProjectStatus; openSpots: number | null }) {
  if (status === "full") {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Users className="size-4" aria-hidden="true" />
        Full team
      </span>
    );
  }
  if (openSpots === null) return null;
  if (openSpots === 1) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-urgent-wash px-2 py-0.5 font-medium text-urgent-ink">
        <Timer className="size-4" aria-hidden="true" />1 spot left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <Users className="size-4 text-muted-foreground" aria-hidden="true" />
      {openSpots} spots open
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

/** have = honey wash + check; missing = dashed outline, never red or an X. */
export function SkillTag({ label, state }: { label: string; state: TagState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[0.8125rem] leading-5 transition-colors duration-[var(--dur-base)]",
        state === "have" && "border-transparent bg-honey-wash font-medium text-honey-ink",
        state === "missing" && "border-dashed border-border-strong text-muted-foreground",
        state === "neutral" && "border-border bg-secondary text-foreground",
      )}
    >
      {state === "have" && <Check className="size-3.5" aria-hidden="true" />}
      {label}
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
        <span key={i} className={cn("h-2 overflow-hidden rounded-full bg-meter-off", total > 6 ? "w-3" : "w-5")}>
          <span
            className="block h-full origin-left rounded-full bg-meter-on transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)]"
            style={{ transform: `scaleX(${i < met ? 1 : 0})`, transitionDelay: `${i * 40}ms` }}
          />
        </span>
      ))}
    </span>
  );
}
