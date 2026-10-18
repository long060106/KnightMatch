import { DrawRule } from "@/components/draw-rule";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { OpenTicker } from "@/components/open-ticker";
import { ProjectExplorer } from "@/components/project-explorer";
import { Scramble } from "@/components/scramble";
import { courseSkills, meta, projects, skillsUsedBy, toListing } from "@/lib/data";
import { shortCollege } from "@/lib/filters";

export default function HomePage() {
  const listing = projects.map(toListing);
  const open = listing.filter((p) => p.status === "open");

  return (
    <>
      <Hero
        openCount={open.length}
        totalCount={listing.length}
        openSpots={open.reduce((sum, p) => sum + (p.openSpots ?? 0), 0)}
        collegeCount={new Set(open.flatMap((p) => p.colleges)).size}
        openFirstSeen={open.map((p) => p.firstSeenAt)}
        lastRunAt={meta.last_run_at}
        baselineAt={meta.baseline_at}
      />
      <OpenTicker
        items={open.map((p) => ({
          id: p.id,
          title: p.title,
          college: p.colleges[0] ? shortCollege(p.colleges[0]) : null,
          openSpots: p.openSpots,
        }))}
      />
      <HowItWorks />
      <section
        id="projects"
        tabIndex={-1}
        aria-labelledby="projects-heading"
        className="mx-auto max-w-[1200px] scroll-mt-4 px-4 pt-8 pb-16 outline-none md:px-6 lg:pt-12"
      >
        <h2 id="projects-heading" className="km-label text-muted-foreground">
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
