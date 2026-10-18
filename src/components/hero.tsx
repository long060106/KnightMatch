"use client";

import { ArrowDown } from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { isNewThisWeek } from "@/lib/filters";
import { useProfile } from "@/lib/profile-store";
import { scrollToElement } from "@/lib/smooth-scroll";
import { useNow } from "@/lib/time";
import { RelativeTime } from "./relative-time";
import { Scramble } from "./scramble";

interface HeroProps {
  openCount: number;
  openFirstSeen: string[];
  lastRunAt: string;
  baselineAt: string;
}

function skipToProjects(event: MouseEvent<HTMLAnchorElement>) {
  const target = document.getElementById("projects");
  if (!target) return;
  event.preventDefault();
  scrollToElement(target);
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#projects`);
}

export function Hero({ openCount, openFirstSeen, lastRunAt, baselineAt }: HeroProps) {
  const profile = useProfile();
  const now = useNow();
  const newCount = now === null ? 0 : openFirstSeen.filter((t) => isNewThisWeek(t, baselineAt, now)).length;

  return (
    <section className="mx-auto max-w-[1200px] px-4 pt-10 pb-8 md:px-6 md:pt-14 md:pb-10">
      <h1 className="max-w-[24ch] font-serif text-[clamp(2rem,1.2rem+3.2vw,3.25rem)] leading-[1.06] font-medium tracking-[-0.015em]">
        <Scramble text={String(openCount)} /> Knight Research Scholars {openCount === 1 ? "team is" : "teams are"}{" "}
        recruiting undergrads right now.
      </h1>
      <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-muted-foreground md:mt-5 md:text-lg">
        See which ones fit the skills and courses you already have, or filter by college and semester. Teams fill
        up on a rolling basis, so we re-check the official list every day.{" "}
        {newCount > 0 && (
          <span className="text-foreground">
            {newCount} opened this week.{" "}
          </span>
        )}
        Last check: <RelativeTime iso={lastRunAt} className="text-foreground" />.
      </p>
      <div className="mt-6 flex flex-wrap items-start gap-x-6 gap-y-1 md:mt-7">
        <div className="grid justify-items-start">
          <Button asChild className="h-12 px-5 text-base font-semibold active:scale-[0.97]">
            <Link href="/match">{profile ? "Update my skills and courses" : "Add my skills and courses"}</Link>
          </Button>
          <Link
            href="/match#resume"
            className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            or upload your resume
          </Link>
        </div>
        <a
          href="#projects"
          onClick={skipToProjects}
          className="inline-flex min-h-12 items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Skip to projects
          <ArrowDown className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
