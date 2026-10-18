import { DrawRule } from "@/components/draw-rule";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { ProjectExplorer } from "@/components/project-explorer";
import { Scramble } from "@/components/scramble";
import { courseSkills, meta, projects, skillsUsedBy, toListing } from "@/lib/data";

export default function HomePage() {
  const listing = projects.map(toListing);
  const open = listing.filter((p) => p.status === "open");

  return (
    <>
      <Hero
        openCount={open.length}
        openFirstSeen={open.map((p) => p.firstSeenAt)}
        lastRunAt={meta.last_run_at}
        baselineAt={meta.baseline_at}
      />
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <DrawRule />
      </div>
      <HowItWorks />
      <section
        id="projects"
        tabIndex={-1}
        aria-labelledby="projects-heading"
        className="mx-auto max-w-[1200px] scroll-mt-4 px-4 pt-8 pb-16 outline-none md:px-6 lg:pt-12"
      >
        <h2 id="projects-heading" className="text-sm font-medium text-muted-foreground">
          <Scramble text="All projects" />
        </h2>
        <DrawRule className="mt-3 mb-6" />
        <ProjectExplorer
          projects={listing}
          skills={skillsUsedBy(listing)}
          courseSkills={courseSkills}
          baselineAt={meta.baseline_at}
        />
      </section>
    </>
  );
}
