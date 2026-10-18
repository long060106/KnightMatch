"use client";

import { ArrowUpRight, CalendarDays, Check, Copy, Mail, Timer, Users } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode, type RefObject } from "react";
import { useInView } from "@/lib/use-in-view";
import { cn } from "@/lib/utils";
import { Scramble } from "./scramble";

const STEPS = [
  {
    title: "Add what you already know",
    body: "Tick the skills you have and the UCF courses you've finished. It stays in this browser: no account, no email.",
  },
  {
    title: "See where you fit",
    body: "Every project shows how many of its listed requirements you meet. Skills come from the team's own words, and the original listing is always one click away.",
  },
  {
    title: "Reach out to the team leader",
    body: "KRSP teams recruit directly, so the first email matters. We help you draft it; you edit it and send it yourself.",
  },
  {
    title: "Check back often",
    body: "Teams open whenever they need people and close once they're full. We re-check the official list every day and mark what's new.",
  },
];

/** Same query as the CSS that pins the section (see globals.css). */
const PINNED_QUERY = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";

function subscribePinned(onChange: () => void) {
  const media = window.matchMedia(PINNED_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function usePinned(): boolean {
  return useSyncExternalStore(subscribePinned, () => window.matchMedia(PINNED_QUERY).matches, () => false);
}

/**
 * Writes scroll progress through the section (0..1) to the CSS variable --p every frame,
 * and returns the active step. React only re-renders when the step changes.
 */
function useStoryProgress(ref: RefObject<HTMLElement | null>, pinned: boolean): number {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !pinned) return;
    let frame = 0;
    let lastStep = -1;
    const measure = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const distance = rect.height - window.innerHeight;
      const p = distance > 0 ? Math.min(1, Math.max(0, -rect.top / distance)) : 1;
      el.style.setProperty("--p", p.toFixed(4));
      const next = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
      if (next !== lastStep) {
        lastStep = next;
        setStep(next);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      el.style.removeProperty("--p");
    };
  }, [ref, pinned]);

  return step;
}

interface ScrubProps {
  a: number;
  b: number;
  children: ReactNode;
  className?: string;
  /** "in" fades and lifts in, "fade" only fades (for layers stacked on top of each other), "out" fades away. */
  mode?: "in" | "fade" | "out";
}

/** Animates while scroll progress moves from `a` to `b` (fractions of the section). */
function Scrub({ a, b, children, className, mode = "in" }: ScrubProps) {
  const modeClass = { in: "km-scrub", fade: "km-scrub-fade", out: "km-scrub-out" }[mode];
  return (
    <span
      className={cn("inline-block", modeClass, className)}
      style={{ "--a": a, "--b": b } as CSSProperties}
    >
      {children}
    </span>
  );
}

const MISSING_TAG =
  "col-start-1 row-start-1 inline-flex items-center rounded-sm border border-dashed border-border-strong px-2 py-0.5 text-[0.8125rem] leading-5 text-muted-foreground";

function DemoTag({ label, a, b }: { label: string; a?: number; b?: number }) {
  if (a === undefined || b === undefined) {
    return <span className={MISSING_TAG}>{label}</span>;
  }
  // The ✓ shifts the label, so the two states never show at once: the dashed tag fades out
  // over the first half of the range, then the checked tag fades in over the second half.
  const mid = (a + b) / 2;
  return (
    // Both states share one grid cell, so the cell is as wide as the wider (checked) one.
    <span className="inline-grid">
      <Scrub a={a} b={mid} mode="out" className={MISSING_TAG}>
        {label}
      </Scrub>
      <Scrub
        a={mid}
        b={b}
        mode="fade"
        className="col-start-1 row-start-1 inline-flex items-center gap-1 rounded-sm border border-transparent bg-honey-wash px-2 py-0.5 text-[0.8125rem] leading-5 font-medium text-honey-ink"
      >
        <Check className="size-3.5" aria-hidden="true" />
        {label}
      </Scrub>
    </span>
  );
}

function MeterSegment({ a, b }: { a?: number; b?: number }) {
  return (
    <span className="h-2 w-5 overflow-hidden rounded-none bg-meter-off">
      {a !== undefined && b !== undefined && (
        <span className="km-scrub-fill block h-full rounded-none bg-meter-on" style={{ "--a": a, "--b": b } as CSSProperties} />
      )}
    </span>
  );
}

/** A miniature, fictional example of the product that assembles itself as you scroll. */
function StoryDemo() {
  return (
    <div className="grid gap-4" aria-hidden="true">
      {/* Phones show only the example card; the step text already explains the rest. */}
      <div className="hidden border bg-background p-4 lg:block">
        <Scrub a={0} b={0.04} className="km-label block text-muted-foreground">
          Your profile
        </Scrub>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Scrub a={0.02} b={0.08} className="rounded-none border bg-secondary px-2.5 py-0.5 text-sm">
            Python
          </Scrub>
          <Scrub a={0.07} b={0.13} className="rounded-none border bg-secondary px-2.5 py-0.5 font-mono text-xs leading-6">
            COP3502C
          </Scrub>
          <Scrub a={0.12} b={0.18} className="rounded-none border bg-secondary px-2.5 py-0.5 font-mono text-xs leading-6">
            STA2023
          </Scrub>
        </div>
      </div>

      <Scrub a={0.24} b={0.3} className="block border bg-background p-4">
        <span className="flex items-start justify-between gap-3">
          <span className="font-serif text-xl leading-snug">Example: Robot vision for safer walking aids</span>
          <Scrub a={0.82} b={0.88} className="km-label inline-flex shrink-0 items-center gap-1.5 border border-honey-ink/40 bg-honey-wash px-1.5 py-0.5 text-honey-ink">
            <span className="size-2 rounded-full bg-meter-on" />
            New
          </Scrub>
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">Engineering and Computer Science</span>
        <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 text-muted-foreground" />
            Fall 2026
          </span>
          <span className="relative inline-grid">
            <Scrub a={0.88} b={0.94} mode="out" className="col-start-1 row-start-1 inline-flex items-center gap-1.5">
              <Users className="size-4 text-muted-foreground" />2 spots open
            </Scrub>
            <Scrub
              a={0.88}
              b={0.94}
              mode="fade"
              className="col-start-1 row-start-1 inline-flex items-center gap-1.5 rounded-sm bg-urgent-wash px-2 py-0.5 font-medium text-urgent-ink"
            >
              <Timer className="size-4" />1 spot left
            </Scrub>
          </span>
        </span>
        <span className="mt-3 flex flex-wrap gap-1.5">
          <DemoTag label="C/C++" a={0.31} b={0.35} />
          <DemoTag label="Python" a={0.35} b={0.39} />
          <DemoTag label="Computer vision" />
          <DemoTag label="Embedded systems" />
        </span>
        <span className="mt-3 flex items-center gap-3">
          <span className="flex gap-1">
            <MeterSegment a={0.33} b={0.37} />
            <MeterSegment a={0.37} b={0.41} />
            <MeterSegment />
            <MeterSegment />
          </span>
          <Scrub a={0.4} b={0.46} className="text-sm">
            <span className="font-medium">You meet 2 of 4</span> listed requirements
          </Scrub>
        </span>
        <span className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <Scrub a={0.77} b={0.82} className="inline-flex items-center gap-1 font-medium text-foreground">
            <Check className="size-3.5 text-honey-ink" />
            Checked today
          </Scrub>
          <span className="inline-flex items-center gap-0.5">
            Original KRSP listing
            <ArrowUpRight className="size-3.5" />
          </span>
        </span>
      </Scrub>

      <Scrub a={0.5} b={0.56} className="hidden rounded-lg border bg-card p-4 text-sm lg:block">
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Mail className="size-4" />
          Your first email (draft)
        </span>
        <span className="mt-3 grid gap-1.5">
          <Scrub a={0.55} b={0.59} className="block text-muted-foreground">
            Subject: Joining the robot vision team
          </Scrub>
          <Scrub a={0.58} b={0.62} className="block">
            Hi Dr. Rivera,
          </Scrub>
          <Scrub a={0.61} b={0.67} className="block max-w-[52ch]">
            I&apos;m a sophomore in Computer Science. I&apos;ve finished COP3502C and use Python, and I&apos;d love to help with
            the robot vision project this fall.
          </Scrub>
        </span>
        <Scrub a={0.67} b={0.72} className="mt-3 flex gap-2">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium">
            <Copy className="size-3.5" />
            Copy
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
            Open in email app
          </span>
        </Scrub>
      </Scrub>
    </div>
  );
}

function ProgressRail() {
  return (
    <div aria-hidden="true" className="km-rail absolute top-0 bottom-0 left-0 hidden w-[3px] flex-col gap-2">
      {STEPS.map((_, i) => (
        <span key={i} className="relative flex-1 overflow-hidden rounded-none bg-meter-off">
          <span className="km-rail-fill absolute inset-0 origin-top bg-foreground" style={{ "--i": i } as CSSProperties} />
        </span>
      ))}
    </div>
  );
}

function StepItem({ index, active, title, body }: { index: number; active: boolean; title: string; body: string }) {
  const [ref, inView] = useInView<HTMLLIElement>();
  return (
    <li ref={ref} className="km-step" data-active={active ? "" : undefined} data-inview={inView ? "" : undefined}>
      <p className="km-step-number font-serif leading-none tracking-tight" aria-hidden="true">
        <Scramble text={`0${index + 1}`} replayKey={active ? `on-${index}` : "off"} />
      </p>
      <h3 className="mt-1 font-serif text-xl leading-tight lg:mt-6 lg:text-4xl">{title}</h3>
      <p className="mt-2 max-w-[46ch] text-[0.9375rem] text-muted-foreground lg:mt-3 lg:text-lg">{body}</p>
    </li>
  );
}

function StepList({ active }: { active: number }) {
  return (
    <ol className="km-steps mt-5 grid gap-7">
      {STEPS.map((s, i) => (
        <StepItem key={s.title} index={i} active={i === active} title={s.title} body={s.body} />
      ))}
    </ol>
  );
}

/**
 * "How KnightMatch works": on wide screens the section pins and scroll walks through steps 01 to 04
 * while the demo assembles itself. On phones, tablets and with reduced motion it is a plain list.
 * Returning students (who already added skills) get a collapsed version instead (CSS, no layout shift).
 */
export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const pinned = usePinned();
  const step = useStoryProgress(ref, pinned);

  return (
    <>
      <section ref={ref} id="how-it-works" aria-labelledby="how-title" className="km-story">
        <div className="km-story-pin">
          <div className="mx-auto grid w-full max-w-[1200px] items-center gap-10 px-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <div className="order-1 lg:order-2">
              <h2 id="how-title" className="km-label text-muted-foreground">
                <Scramble text="How KnightMatch works" />
              </h2>
              <StepList active={step} />
            </div>
            <div className="relative order-2 lg:order-1 lg:pl-8">
              <ProgressRail />
              <StoryDemo />
            </div>
          </div>
        </div>
      </section>

      <details className="km-story-compact mx-auto max-w-[1200px] px-4 md:px-6">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-muted-foreground hover:text-foreground">
          How KnightMatch works
        </summary>
        <ol className="mt-2 mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-lg border bg-card p-4">
              <p className="font-serif text-2xl leading-none">0{i + 1}</p>
              <p className="mt-2 font-medium">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </details>
    </>
  );
}
