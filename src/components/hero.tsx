"use client";

import { ArrowDown } from "lucide-react";
import Link from "next/link";
import { Fragment, type CSSProperties, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { isNewThisWeek } from "@/lib/filters";
import { useProfile } from "@/lib/profile-store";
import { scrollToElement } from "@/lib/smooth-scroll";
import { useNow } from "@/lib/time";
import { cn } from "@/lib/utils";
import { DrawRule } from "./draw-rule";
import { RelativeTime } from "./relative-time";
import { Scramble } from "./scramble";

interface HeroProps {
  openCount: number;
  totalCount: number;
  openSpots: number;
  collegeCount: number;
  openFirstSeen: string[];
  lastRunAt: string;
  baselineAt: string;
}

/** Two lines that run edge to edge from 1024px; "rule" is the hairline that stretches to fill line one. */
const HEADLINE: string[][] = [
  ["Find", "the", "rule", "research", "team"],
  ["that’s", "looking", "for", "you."],
];

function skipToProjects(event: MouseEvent<HTMLAnchorElement>) {
  const target = document.getElementById("projects");
  if (!target) return;
  event.preventDefault();
  scrollToElement(target);
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#projects`);
}

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
            {word === "rule" ? (
              <span className="km-headline-rule" aria-hidden="true" />
            ) : (
              <span className="km-word-mask">
                <span className="km-word" style={{ "--i": i++ } as CSSProperties}>
                  {word}
                </span>
              </span>
            )}
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
          className={cn("aspect-square rounded-[3px]", i < open ? "km-cell bg-meter-on" : "border border-border-strong")}
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
      className={cn("size-2.5 rounded-[2px]", open ? "bg-meter-on" : "border border-border-strong")}
    />
  );
}

export function Hero({
  openCount,
  totalCount,
  openSpots,
  collegeCount,
  openFirstSeen,
  lastRunAt,
  baselineAt,
}: HeroProps) {
  const profile = useProfile();
  const now = useNow();
  const newCount = now === null ? 0 : openFirstSeen.filter((t) => isNewThisWeek(t, baselineAt, now)).length;

  return (
    <section aria-labelledby="hero-title" className="mx-auto max-w-[1200px] px-4 md:px-6">
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

      <h1
        id="hero-title"
        className="km-headline pt-10 font-serif leading-[0.9] tracking-[-0.01em] uppercase md:pt-14 lg:pt-12"
      >
        <RisingHeadline />
      </h1>

      <div className="grid gap-10 pt-8 pb-12 md:gap-12 md:pt-12 md:pb-16 lg:grid-cols-12 lg:gap-0 lg:pt-14 lg:pb-14">
        <div className="lg:col-span-6 lg:pr-14">
          <p
            className="km-hero-in km-lead max-w-[46ch] text-muted-foreground"
            style={{ "--d": "520ms" } as CSSProperties}
          >
            Add the skills and courses you already have. We&apos;ll show how well you fit each open Knight Research
            Scholars project and help you email the team.
          </p>
          <div
            className="km-hero-in mt-8 flex flex-wrap items-start gap-x-8 gap-y-1"
            style={{ "--d": "620ms" } as CSSProperties}
          >
            <div className="grid justify-items-start">
              <Button asChild className="h-12 px-6 text-base font-semibold active:scale-[0.97]">
                <Link href="/match">{profile ? "Update my skills and courses" : "Add my skills and courses"}</Link>
              </Button>
              <Link
                href="/match#resume"
                className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline decoration-border-strong underline-offset-[6px] hover:text-foreground hover:decoration-foreground"
              >
                or upload your resume
              </Link>
            </div>
            <a
              href="#projects"
              onClick={skipToProjects}
              className="km-label group inline-flex min-h-12 items-center gap-1.5 underline decoration-border-strong underline-offset-[6px] hover:decoration-foreground"
            >
              Browse all {totalCount} projects
              <ArrowDown
                className="size-3.5 transition-transform duration-[var(--dur-fast)] ease-[var(--ease-out)] group-hover:translate-y-0.5"
                aria-hidden="true"
              />
            </a>
          </div>
        </div>

        <aside aria-label="Teams recruiting right now" className="relative lg:col-span-5 lg:col-start-8 lg:pl-14">
          <DrawRule className="mb-8 lg:hidden" />
          <DrawRule vertical delay={200} className="absolute inset-y-0 left-0 hidden lg:block" />
          <p className="km-label text-muted-foreground">Recruiting right now</p>
          <p className="mt-6 flex items-end gap-4">
            <span className="font-serif text-[clamp(6rem,4.5rem+4vw,8.5rem)] leading-[0.74] tracking-[-0.02em]">
              <Scramble text={String(openCount)} />
            </span>
            <span className="km-lead">
              of {totalCount} teams have
              <br />
              open spots for undergrads
            </span>
          </p>
          <div className="mt-7">
            <TeamGrid open={openCount} total={totalCount} />
          </div>
          <div className="km-label mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-muted-foreground">
            <p className="flex gap-4">
              <span className="inline-flex items-center gap-1.5">
                <LegendSwatch open />
                Recruiting
              </span>
              <span className="inline-flex items-center gap-1.5">
                <LegendSwatch open={false} />
                Full
              </span>
            </p>
            <p>
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
        </aside>
      </div>
    </section>
  );
}
