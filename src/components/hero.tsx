"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Fragment, type CSSProperties, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { isNewThisWeek } from "@/lib/filters";
import { useProfile } from "@/lib/profile-store";
import { scrollToElement } from "@/lib/smooth-scroll";
import { useNow } from "@/lib/time";
import { useInView } from "@/lib/use-in-view";
import { cn } from "@/lib/utils";
import { DrawRule } from "./draw-rule";
import { HoverScramble } from "./hover-scramble";
import { RelativeTime } from "./relative-time";
import { Scramble } from "./scramble";
import { WireSphere } from "./wire-sphere";

/** Three rows from 1024px (left aligned, the globe fills the space on the right); wraps freely below. */
const HEADLINE: string[][] = [
  ["Find", "the", "research"],
  ["team", "that’s"],
  ["looking", "for", "you."],
];

/** Each word rises out of its own mask, one after another (CSS only, so it runs before hydration). */
function RisingHeadline() {
  let i = 0;
  return HEADLINE.map((line, l) => (
    <Fragment key={l}>
      {l > 0 && " "}
      <span className="km-headline-line">
        {line.map((word, w) => (
          <Fragment key={w}>
            {w > 0 && " "}
            <span className="km-word-mask">
              <span className="km-word" style={{ "--i": i++ } as CSSProperties}>
                {word}
              </span>
            </span>
          </Fragment>
        ))}
      </span>
    </Fragment>
  ));
}

/** One cell per listed team: honey = still recruiting, outline = full. Open cells fill in one by one. */
function TeamGrid({ open, total }: { open: number; total: number }) {
  return (
    <div aria-hidden="true" className="grid grid-cols-14 gap-1 sm:gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn("aspect-square rounded-none", i < open ? "km-cell bg-meter-on" : "border border-border-strong")}
          style={i < open ? ({ "--i": i } as CSSProperties) : undefined}
        />
      ))}
    </div>
  );
}

function LegendSwatch({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-2.5 rounded-none", open ? "bg-meter-on" : "border border-border-strong")}
    />
  );
}

interface HeroProps {
  totalCount: number;
  lastRunAt: string;
}

/** Scrolls smoothly to a section and keeps the hash in the URL, like a normal anchor would. */
function jumpTo(id: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    scrollToElement(target);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
  };
}

/**
 * The title page: one screen tall, with only three things to read. The headline, one sentence on
 * what the site does, and the main action. Everything else (numbers, the list) waits below.
 */
export function Hero({ totalCount, lastRunAt }: HeroProps) {
  const profile = useProfile();

  return (
    <section
      aria-labelledby="hero-title"
      className="mx-auto flex min-h-[calc(100svh-8rem)] max-w-[1200px] flex-col px-4 md:min-h-[calc(100svh-4rem)] md:px-6"
    >
      {/* Dateline: what this is and how fresh it is, small and quiet so the headline leads. */}
      <div className="km-label flex flex-wrap items-center justify-between gap-x-6 gap-y-1 pt-5 pb-3 text-muted-foreground md:pt-6">
        <p className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-foreground" aria-hidden="true" />
          <span>
            Unofficial<span className="sm:hidden"> ·</span>
            <span className="hidden sm:inline"> guide to</span> Knight Research Scholars
          </span>
        </p>
        <p>
          Re-checked daily · Last check <RelativeTime iso={lastRunAt} className="text-foreground" />
        </p>
      </div>
      <DrawRule />

      <div className="relative isolate flex flex-1 flex-col justify-center py-16 md:py-20">
        {/* A slowly turning wireframe globe behind the headline: the type sits over it, like a title
            over a cover image. Faint ink only, so the words stay the loudest thing on screen. */}
        <div
          aria-hidden="true"
          className="km-hero-in pointer-events-none absolute top-6 right-0 -z-10 w-[72vw] max-w-[620px] text-foreground/20 md:top-1/2 md:w-[52vw] md:-translate-y-1/2 lg:right-[4%] lg:w-[46vw]"
          style={{ "--d": "300ms" } as CSSProperties}
        >
          <WireSphere className="w-full" />
        </div>
        <h1 id="hero-title" className="km-headline font-serif leading-[0.9] tracking-[-0.01em] uppercase">
          <RisingHeadline />
        </h1>

        <div className="mt-10 grid gap-8 md:mt-14 lg:grid-cols-12 lg:items-end lg:gap-0">
          <p
            className="km-hero-in km-lead max-w-[40ch] text-muted-foreground lg:col-span-5"
            style={{ "--d": "520ms" } as CSSProperties}
          >
            See which UCF research teams fit the skills and courses you already have, then email them.
          </p>
          <div
            className="km-hero-in flex flex-wrap items-center gap-x-6 gap-y-1 lg:col-span-6 lg:col-start-7 lg:justify-end"
            style={{ "--d": "620ms" } as CSSProperties}
          >
            <Button asChild className="h-12 px-6 text-base font-semibold active:scale-[0.97]">
              <Link href="/match">{profile ? "Update my skills and courses" : "Add my skills and courses"}</Link>
            </Button>
            <Link
              href="/match#resume"
              className="group inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline decoration-border-strong underline-offset-[6px] hover:text-foreground hover:decoration-foreground"
            >
              or upload your resume
              <ArrowRight
                className="size-3.5 transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </div>

      {/* Foot of the title page: a nudge to scroll, and the shortcut for people who just want the list. */}
      <DrawRule />
      <div className="km-label flex items-center justify-between gap-6 py-3 text-muted-foreground">
        <a
          href="#recruiting"
          onClick={jumpTo("recruiting")}
          className="group inline-flex min-h-11 items-center gap-2 hover:text-foreground"
        >
          <ArrowDown className="km-nudge size-3.5" aria-hidden="true" />
          <HoverScramble text="Scroll" />
        </a>
        <Link
          href="/projects"
          className="group inline-flex min-h-11 items-center gap-1.5 text-foreground underline decoration-border-strong underline-offset-[6px] hover:decoration-foreground"
        >
          <HoverScramble text={`Browse all ${totalCount} projects`} />
          <ArrowRight
            className="size-3.5 transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </section>
  );
}

interface RecruitingProps {
  openCount: number;
  totalCount: number;
  openSpots: number;
  collegeCount: number;
  openFirstSeen: string[];
  baselineAt: string;
}

/**
 * The proof, on its own screen below the title page: how many teams are recruiting, shown huge,
 * and one cell per listed team. The cells fill in when the section scrolls into view.
 */
export function RecruitingNow({
  openCount,
  totalCount,
  openSpots,
  collegeCount,
  openFirstSeen,
  baselineAt,
}: RecruitingProps) {
  const now = useNow();
  const newCount = now === null ? 0 : openFirstSeen.filter((t) => isNewThisWeek(t, baselineAt, now)).length;
  const [cellsRef, cellsInView] = useInView<HTMLDivElement>("0px 0px -15% 0px");

  return (
    <section
      id="recruiting"
      aria-labelledby="recruiting-title"
      className="mx-auto max-w-[1200px] scroll-mt-4 px-4 py-20 md:px-6 md:py-28 lg:py-32"
    >
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-0">
        <div className="lg:col-span-5 lg:pr-14">
          <h2 id="recruiting-title" className="km-label text-muted-foreground">
            <Scramble text="Recruiting right now" />
          </h2>
          <p className="mt-8 font-serif text-[clamp(8rem,5rem+10vw,13rem)] leading-[0.74] tracking-[-0.02em]">
            <Scramble text={String(openCount)} />
          </p>
          <p className="km-lead mt-8 max-w-[32ch]">
            of the {totalCount} Knight Research Scholars teams have open spots for undergrads.
          </p>
          <p className="km-label mt-6 text-muted-foreground">
            <span className="text-foreground">{openSpots}</span> {openSpots === 1 ? "spot" : "spots"} ·{" "}
            <span className="text-foreground">{collegeCount}</span> {collegeCount === 1 ? "college" : "colleges"}
            {newCount > 0 && (
              <>
                {" "}
                · <span className="text-honey-ink">{newCount} new this week</span>
              </>
            )}
          </p>
        </div>

        <div className="relative lg:col-span-7 lg:flex lg:flex-col lg:justify-end lg:pl-14">
          <DrawRule vertical delay={200} className="absolute inset-y-0 left-0 hidden lg:block" />
          <div ref={cellsRef} data-inview={cellsInView ? "" : undefined} className="km-cells">
            <TeamGrid open={openCount} total={totalCount} />
          </div>
          <p className="km-label mt-4 flex gap-4 text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <LegendSwatch open />
              Recruiting
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LegendSwatch open={false} />
              Full
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
