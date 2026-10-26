import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { DrawRule } from "@/components/draw-rule";
import { FloatingShapes } from "@/components/floating-shapes";
import { ProjectExplorer } from "@/components/project-explorer";
import { LastCheck } from "@/components/last-check";
import { RisingWords } from "@/components/rising-words";
import { courseSkills, meta, projects, skillsUsedBy, toListing, topics } from "@/lib/data";

export const metadata: Metadata = {
  title: "All projects",
  description: "Every Knight Research Scholars project at UCF, with filters for topic, college, semester and open spots.",
};

/** The tool itself: filters and the full list. The home page only introduces it. */
export default function ProjectsPage() {
  const listing = projects.map(toListing);

  return (
    <section
      id="projects"
      data-grid-quiet
      aria-labelledby="projects-heading"
      className="mx-auto max-w-[1200px] px-4 pt-16 pb-16 md:px-6 md:pt-14"
    >
      <div className="relative isolate">
        <div
          aria-hidden="true"
          className="km-page-fade pointer-events-none absolute inset-x-0 -top-16 -bottom-10 md:-top-14 -z-10"
          style={{ "--d": "350ms" } as CSSProperties}
        >
          <FloatingShapes set="projects" />
        </div>
        <p className="km-page-in km-label text-muted-foreground">
          Knight Research Scholars · Last check <LastCheck iso={meta.last_run_at} className="text-foreground" />
        </p>
        <h1
          id="projects-heading"
          className="mt-5 font-serif text-[clamp(3rem,2rem+5vw,6rem)] leading-[0.9] tracking-[-0.01em] uppercase"
        >
          <RisingWords text="All projects" />
        </h1>
      </div>
      <DrawRule className="mt-8 mb-8 md:mt-10" />
      <div className="km-page-in" style={{ "--d": "380ms" } as CSSProperties}>
        <ProjectExplorer
          projects={listing}
          skills={skillsUsedBy(listing)}
          courseSkills={courseSkills}
          topics={topics}
          baselineAt={meta.baseline_at}
        />
      </div>
    </section>
  );
}
