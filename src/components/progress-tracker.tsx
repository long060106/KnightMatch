"use client";

import {
  ArrowDown,
  ArrowRight,
  Bookmark,
  CalendarPlus,
  CircleCheck,
  CircleMinus,
  MailCheck,
  MessageSquareReply,
  Repeat2,
  Send,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { scrollToElement } from "@/lib/smooth-scroll";
import { formatDate, formatRelative, useNow } from "@/lib/time";
import {
  STAGES,
  STAGE_LABEL,
  buildReminderIcs,
  followUpAt,
  followUpDue,
  type Stage,
  type TrackedProject,
} from "@/lib/tracker";
import { restoreEntry, setStage, useTracker } from "@/lib/tracker-store";
import { cn } from "@/lib/utils";

const STAGE_ICON: Record<Stage, LucideIcon> = {
  saved: Bookmark,
  emailed: Send,
  followed_up: Repeat2,
  heard_back: MessageSquareReply,
  joined: CircleCheck,
  not_this_time: CircleMinus,
};

const REMOVE = "remove";

/** Where the sidebar's follow-up step lives, so the header can jump to it. */
export const FOLLOW_UP_ID = "follow-up";

function chipText(entry: TrackedProject, now: number | null): string {
  if (now !== null && followUpDue(entry, now)) return "Follow up now";
  if (entry.stage === "emailed" && entry.emailedAt && now !== null) return `Emailed ${formatRelative(entry.emailedAt, now)}`;
  return STAGE_LABEL[entry.stage];
}

/** On a card: where the student is with this team. Honey only when there is something to do or to celebrate. */
export function TrackerChip({ entry, now }: { entry: TrackedProject; now: number | null }) {
  const Icon = STAGE_ICON[entry.stage];
  const due = now !== null && followUpDue(entry, now);
  return (
    <span
      className={cn(
        "km-label inline-flex shrink-0 items-center gap-1.5 border px-1.5 py-0.5",
        due ? "border-honey-ink/40 bg-honey-wash text-honey-ink" : entry.stage === "joined" ? "text-honey-ink" : "text-foreground",
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      <span className="sr-only">Your progress: </span>
      {chipText(entry, now)}
    </span>
  );
}

export interface ReminderTarget {
  projectId: string;
  projectTitle: string;
  krspUrl: string;
}

/** Makes the follow-up .ics in the browser and hands it to the student's calendar app. */
function downloadReminder({ projectId, projectTitle, krspUrl }: ReminderTarget, at: number) {
  const ics = buildReminderIcs({
    projectId,
    projectTitle,
    pageUrl: `${window.location.origin}/projects/${projectId}`,
    krspUrl,
    at,
    now: Date.now(),
  });
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `follow-up-${projectId}.ics`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ReminderButton({ target, at }: { target: ReminderTarget; at: number }) {
  const [saved, setSaved] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        className="h-11 justify-between gap-2 px-4 active:scale-[0.97]"
        onClick={() => {
          downloadReminder(target, at);
          setSaved(true);
        }}
      >
        <span className="inline-flex items-center gap-2">
          <CalendarPlus className="size-4" aria-hidden="true" />
          Remind me on {formatDate(new Date(at).toISOString())}
        </span>
        <span className="font-mono text-xs text-muted-foreground">.ics</span>
      </Button>
      <span aria-live="polite" className={cn("text-xs text-muted-foreground", !saved && "sr-only")}>
        {saved ? "Calendar file downloaded. Open it to add the reminder." : ""}
      </span>
    </>
  );
}

/**
 * Shown in an email dialog once the student opened or copied the email: one tap to mark it sent.
 * KnightMatch can't see their inbox, so it only asks; nothing is marked on its own.
 */
export function MarkSent({ target, stage }: { target: ReminderTarget; stage: "emailed" | "followed_up" }) {
  const tracker = useTracker();
  const entry = tracker?.[target.projectId];
  const [before, setBefore] = useState<{ entry: TrackedProject | undefined } | null>(null);
  const reached = entry !== undefined && STAGES.indexOf(entry.stage) >= STAGES.indexOf(stage);
  const verb = stage === "emailed" ? "emailed" : "followed up";
  const reminderAt = followUpAt(entry);

  if (tracker === null) return null;
  return (
    <div aria-live="polite" className="grid gap-3 border-l-2 border-honey px-4 py-1 text-sm">
      {before && reached ? (
        <>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <MailCheck className="size-4 text-honey-ink" aria-hidden="true" />
              Marked as {verb}
            </span>
            <button
              type="button"
              onClick={() => {
                restoreEntry(target.projectId, before.entry);
                setBefore(null);
              }}
              className="km-link inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground md:min-h-6"
            >
              Undo
            </button>
          </p>
          {reminderAt !== null && (
            <div className="grid gap-1.5 sm:justify-items-start">
              <p className="text-muted-foreground">No reply in a week? Get a nudge in your calendar.</p>
              <ReminderButton target={target} at={reminderAt} />
            </div>
          )}
        </>
      ) : reached ? (
        <p className="text-muted-foreground">
          Your progress: <span className="font-medium text-foreground">{STAGE_LABEL[entry.stage]}</span>
        </p>
      ) : (
        <div className="grid gap-2 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <p>
            <span className="font-semibold">Sent it?</span>{" "}
            <span className="text-muted-foreground">
              {stage === "emailed" ? "Mark it, and your list will say when to follow up." : "Mark it on your list."}
            </span>
          </p>
          <Button
            className="h-11 shrink-0 gap-2 px-4 font-semibold active:scale-[0.97]"
            onClick={() => {
              setBefore({ entry });
              setStage(target.projectId, stage);
            }}
          >
            <MailCheck className="size-4" aria-hidden="true" />
            Mark as {verb}
          </Button>
        </div>
      )}
    </div>
  );
}

/** Detail page header: save the project, then move it along (Saved → Emailed → … → Joined). */
export function ProgressControl({ projectId }: { projectId: string }) {
  const id = useId();
  const tracker = useTracker();
  const now = useNow();
  // Same height before the browser knows the list, so nothing below jumps.
  if (tracker === null) return <div className="h-11" aria-hidden="true" />;

  const entry = tracker[projectId];
  if (!entry) {
    return (
      <Button variant="outline" className="h-11 gap-2 px-4 active:scale-[0.97]" onClick={() => setStage(projectId, "saved")}>
        <Bookmark className="size-4" aria-hidden="true" />
        Save to my list
      </Button>
    );
  }

  const due = now !== null && followUpDue(entry, now);
  const nextAt = followUpAt(entry);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Label htmlFor={id} className="sr-only">
        Your progress with this team
      </Label>
      <Select
        value={entry.stage}
        onValueChange={(value) => (value === REMOVE ? restoreEntry(projectId, undefined) : setStage(projectId, value as Stage))}
      >
        <SelectTrigger id={id} className="gap-2 bg-background px-3 data-[size=default]:h-11">
          <span className="text-muted-foreground" aria-hidden="true">
            Progress:
          </span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {STAGES.map((stage) => {
            const Icon = STAGE_ICON[stage];
            return (
              <SelectItem key={stage} value={stage} className="py-2.5 lg:py-1.5">
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                {STAGE_LABEL[stage]}
              </SelectItem>
            );
          })}
          <SelectSeparator />
          <SelectItem value={REMOVE} className="py-2.5 text-muted-foreground lg:py-1.5">
            Remove from my list
          </SelectItem>
        </SelectContent>
      </Select>

      {due ? (
        <button
          type="button"
          onClick={() => {
            const step = document.getElementById(FOLLOW_UP_ID);
            if (step) scrollToElement(step);
          }}
          className="km-label inline-flex min-h-11 items-center gap-1.5 border border-honey-ink/40 bg-honey-wash px-2.5 text-honey-ink active:scale-[0.97]"
        >
          Time to follow up
          <ArrowDown className="size-3.5" aria-hidden="true" />
        </button>
      ) : (
        <p className="text-sm text-muted-foreground">
          {entry.stage === "emailed" && entry.emailedAt && nextAt !== null
            ? `Emailed ${formatDate(entry.emailedAt)} · follow up ${formatDate(new Date(nextAt).toISOString())}`
            : entry.stage === "followed_up" && entry.followedUpAt
              ? `Followed up ${formatDate(entry.followedUpAt)}`
              : null}
        </p>
      )}

      <Link
        href="/projects?list=mine"
        className="km-link group inline-flex min-h-11 items-center gap-1 text-sm font-medium md:min-h-6"
      >
        Your list
        <ArrowRight
          className="size-3.5 transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}
