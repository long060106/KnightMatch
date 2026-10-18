"use client";

import { ShieldCheck } from "lucide-react";
import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import type { ResumeHit, ScanResult } from "@/lib/resume/scan";
import type { Course, SkillMap } from "@/lib/types";

const WIDE_QUERY = "(min-width: 768px)";

function subscribeWide(onChange: () => void) {
  const media = window.matchMedia(WIDE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Dialog from tablet width up, bottom sheet on phones (same split as the rest of the site). */
function useWide(): boolean {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE_QUERY).matches, () => true);
}

export interface ResumePicks {
  courses: string[];
  skills: string[];
}

interface ResumeReviewProps {
  open: boolean;
  found: ScanResult;
  skills: SkillMap;
  courses: Course[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (picks: ResumePicks) => void;
  /** Where focus goes when the sheet closes (it opens without a trigger button). */
  returnFocus: () => void;
  /** What the student gave us, for the privacy line. */
  source: "file" | "text";
}

function Snippet({ hit }: { hit: ResumeHit }) {
  const [start, end] = hit.hit;
  return (
    <span className="text-xs leading-relaxed break-words text-muted-foreground">
      “{hit.snippet.slice(0, start)}
      <mark className="rounded-[3px] bg-honey-wash px-0.5 text-foreground">{hit.snippet.slice(start, end)}</mark>
      {hit.snippet.slice(end)}”
    </span>
  );
}

function Row({
  id,
  checked,
  onToggle,
  children,
}: {
  id: string;
  checked: boolean;
  onToggle: (on: boolean) => void;
  children: ReactNode;
}) {
  return (
    <li className="flex min-h-11 items-start gap-3 py-2">
      <Checkbox id={id} className="mt-0.5" checked={checked} onCheckedChange={(value) => onToggle(value === true)} />
      <Label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-1 font-normal">
        {children}
      </Label>
    </li>
  );
}

/** Lets the student check every course and skill found in their resume before anything is saved. */
export function ResumeReview({
  open,
  found,
  skills,
  courses,
  onOpenChange,
  onConfirm,
  returnFocus,
  source,
}: ResumeReviewProps) {
  const wide = useWide();
  const baseId = useId();
  const titleOf = new Map(courses.map((c) => [c.code, c.title]));
  // Soft skills and training never count toward a match, so they start unticked.
  const [off, setOff] = useState<Set<string>>(
    () => new Set(found.skills.filter((s) => !s.counts).map((s) => `skill:${s.id}`)),
  );
  const isOn = (key: string) => !off.has(key);
  const setOn = (key: string, on: boolean) =>
    setOff((prev) => {
      const next = new Set(prev);
      if (on) next.delete(key);
      else next.add(key);
      return next;
    });

  const picks: ResumePicks = {
    courses: found.courses.filter((c) => isOn(`course:${c.id}`)).map((c) => c.id),
    skills: found.skills.filter((s) => isOn(`skill:${s.id}`)).map((s) => s.id),
  };
  const count = picks.courses.length + picks.skills.length;

  const onCloseAutoFocus = (event: Event) => {
    event.preventDefault();
    returnFocus();
  };

  const title = "Review what we found";
  const description = "Untick anything that isn't right. Only what you keep is saved, in this browser.";

  const body = (
    <div className="grid gap-6">
      {found.courses.length > 0 && (
        <section aria-labelledby={`${baseId}-courses`}>
          <h3 id={`${baseId}-courses`} className="text-sm font-semibold">
            Courses <span className="font-normal text-muted-foreground tabular-nums">{found.courses.length}</span>
          </h3>
          <ul className="mt-1 divide-y">
            {found.courses.map((hit) => (
              <Row
                key={hit.id}
                id={`${baseId}-c-${hit.id}`}
                checked={isOn(`course:${hit.id}`)}
                onToggle={(on) => setOn(`course:${hit.id}`, on)}
              >
                <span className="text-sm leading-snug">
                  <span className="font-mono text-xs">{hit.id}</span> {titleOf.get(hit.id)}
                </span>
                <Snippet hit={hit} />
              </Row>
            ))}
          </ul>
        </section>
      )}
      {found.skills.length > 0 && (
        <section aria-labelledby={`${baseId}-skills`}>
          <h3 id={`${baseId}-skills`} className="text-sm font-semibold">
            Skills <span className="font-normal text-muted-foreground tabular-nums">{found.skills.length}</span>
          </h3>
          <ul className="mt-1 divide-y">
            {found.skills.map((hit) => (
              <Row
                key={hit.id}
                id={`${baseId}-s-${hit.id}`}
                checked={isOn(`skill:${hit.id}`)}
                onToggle={(on) => setOn(`skill:${hit.id}`, on)}
              >
                <span className="flex flex-wrap items-baseline gap-x-2 text-sm leading-snug">
                  {skills[hit.id]?.label ?? hit.id}
                  {!hit.counts && <span className="text-xs text-muted-foreground">doesn&apos;t count toward matching</span>}
                </span>
                <Snippet hit={hit} />
              </Row>
            ))}
          </ul>
        </section>
      )}
    </div>
  );

  const footer = (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground md:justify-start">
        <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
        Your {source} never left this device.
      </p>
      <div className="flex flex-col-reverse gap-2 md:flex-row md:items-center">
        <Button variant="outline" onClick={() => onOpenChange(false)} className="h-11 px-4 active:scale-[0.97]">
          Cancel
        </Button>
        <Button
          disabled={count === 0}
          onClick={() => onConfirm(picks)}
          className="h-12 px-5 text-base font-semibold active:scale-[0.97] md:h-11"
        >
          {count === 0 ? "Nothing selected" : `Add ${count} to my profile`}
        </Button>
      </div>
    </div>
  );

  if (wide) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          data-lenis-prevent
          onCloseAutoFocus={onCloseAutoFocus}
          className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl flex-col gap-0 p-0 sm:max-w-xl"
        >
          <DialogHeader className="border-b p-6 pb-4 text-left">
            <DialogTitle className="font-serif text-2xl">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">{body}</div>
          <div className="border-t px-6 py-4">{footer}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent data-lenis-prevent onCloseAutoFocus={onCloseAutoFocus} className="max-h-[88dvh]">
        <DrawerHeader className="text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
          <DrawerTitle className="font-serif text-xl">{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2">{body}</div>
        <div className="border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{footer}</div>
      </DrawerContent>
    </Drawer>
  );
}
