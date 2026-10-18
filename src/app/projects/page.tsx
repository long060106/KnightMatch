import type { Metadata } from "next";
import { DrawRule } from "@/components/draw-rule";
import { ProjectExplorer } from "@/components/project-explorer";
import { RelativeTime } from "@/components/relative-time";
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
      className="mx-auto max-w-[1200px] px-4 pt-10 pb-16 md:px-6 md:pt-14"
    >
      <p className="km-label text-muted-foreground">
        Knight Research Scholars · Last check <RelativeTime iso={meta.last_run_at} className="text-foreground" />
      </p>
      <h1
        id="projects-heading"
        className="mt-5 font-serif text-[clamp(3rem,2rem+5vw,6rem)] leading-[0.9] tracking-[-0.01em] uppercase"
      >
        All projects
      </h1>
      <DrawRule className="mt-8 mb-8 md:mt-10" />
      <ProjectExplorer
        projects={listing}
        skills={skillsUsedBy(listing)}
        courseSkills={courseSkills}
        topics={topics}
        baselineAt={meta.baseline_at}
      />
    </section>
  );
}
