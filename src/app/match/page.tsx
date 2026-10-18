import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { DrawRule } from "@/components/draw-rule";
import { FloatingShapes } from "@/components/floating-shapes";
import { MatchWorkbench } from "@/components/match-workbench";
import { RisingWords } from "@/components/rising-words";
import type { SkillGroup } from "@/components/skill-picker";
import { courseSkills, courses, meta, projects, skillCategories, skills, toListing } from "@/lib/data";

export const metadata: Metadata = {
  title: "Match me",
  description:
    "Add the skills and UCF courses you already have and see how each open Knight Research Scholars project lines up.",
};

/** Soft skills and after-joining training never count toward a match, so they are not offered. */
const HIDDEN_CATEGORIES = new Set(["soft", "training"]);
const POPULAR_COUNT = 10;

export default function MatchPage() {
  const open = projects.map(toListing).filter((p) => p.status === "open");

  const groups: SkillGroup[] = Object.entries(skillCategories)
    .filter(([id]) => !HIDDEN_CATEGORIES.has(id))
    .map(([id, label]) => ({
      id,
      label,
      skillIds: Object.values(skills)
        .filter((s) => s.category === id && s.counts)
        .map((s) => s.id),
    }))
    .filter((g) => g.skillIds.length > 0);

  // What open projects ask for most: required counts double, nice-to-have once.
  const demand = new Map<string, number>();
  for (const p of open) {
    for (const id of p.requiredSkills) if (skills[id]?.counts) demand.set(id, (demand.get(id) ?? 0) + 2);
    for (const id of p.preferredSkills) if (skills[id]?.counts) demand.set(id, (demand.get(id) ?? 0) + 1);
  }
  const popular = [...demand.entries()]
    .sort((a, b) => b[1] - a[1] || skills[a[0]].label.localeCompare(skills[b[0]].label))
    .slice(0, POPULAR_COUNT)
    .map(([id]) => id);

  return (
    <div className="mx-auto max-w-[1200px] px-4 md:px-6">
      <header className="relative isolate pt-16 pb-6 md:pt-14 md:pb-8">
        <div
          aria-hidden="true"
          className="km-page-fade pointer-events-none absolute inset-0 -z-10"
          style={{ "--d": "350ms" } as CSSProperties}
        >
          <FloatingShapes set="match" />
        </div>
        <h1 className="max-w-[22ch] font-serif text-[clamp(2rem,1.2rem+3.2vw,3.25rem)] leading-[1.06] tracking-[-0.015em]">
          <RisingWords text="Add what you already know." />
        </h1>
        <p
          className="km-page-in mt-4 max-w-[62ch] text-base leading-relaxed text-muted-foreground md:text-lg"
          style={{ "--d": "300ms" } as CSSProperties}
        >
          Tick your skills and the UCF courses you&apos;ve finished. Each open project then shows how many of its listed
          requirements you meet, using the team&apos;s own words. Nothing leaves this browser: no account, no email.
        </p>
      </header>
      <DrawRule />
      {/* Fade only: the workbench holds the fixed "See N matches" button on phones. */}
      <div className="km-page-fade" style={{ "--d": "420ms" } as CSSProperties}>
        <MatchWorkbench
          projects={open}
          skills={skills}
          groups={groups}
          popular={popular}
          courses={courses}
          courseSkills={courseSkills}
          baselineAt={meta.baseline_at}
        />
      </div>
    </div>
  );
}
