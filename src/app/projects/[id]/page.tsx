import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DrawRule } from "@/components/draw-rule";
import { JsonLd } from "@/components/json-ld";
import { ProjectTitle, TO_DETAIL } from "@/components/project-card";
import { BeginnerNote, SpotsBadge } from "@/components/project-bits";
import { ProgressControl } from "@/components/progress-tracker";
import {
  DetailNewBadge,
  DetectedSkills,
  MobileApplyBar,
  ProjectSidebar,
} from "@/components/project-detail-client";
import { Scramble } from "@/components/scramble";
import { StickyPanel } from "@/components/sticky-panel";
import { courseSkills, getProject, meta, projects, skills, topics } from "@/lib/data";
import { shortCollege } from "@/lib/filters";
import { absoluteUrl, pageMetadata, projectDescription } from "@/lib/seo";
import type { Project, SkillMap } from "@/lib/types";

// One prerendered page per project on the KRSP list, nothing generated on demand.
export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ id: p.id }));
}

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const project = getProject((await params).id);
  if (!project) return {};
  // The card comes from ./opengraph-image.tsx.
  return pageMetadata({
    title: project.title,
    description: projectDescription(project),
    path: `/projects/${project.id}`,
    siteImage: false,
  });
}

/** Only the skills this project mentions, plus their parents. */
function skillsFor(project: Project): SkillMap {
  const used: SkillMap = {};
  const add = (id: string) => {
    const skill = skills[id];
    if (!skill || used[id]) return;
    used[id] = skill;
    if (skill.parent) add(skill.parent);
  };
  [...project.required_skills, ...project.preferred_skills].forEach(add);
  // Course skills too, so "C/C++ from COP3502C" can count toward a parent like Programming.
  Object.values(courseSkills).flat().forEach(add);
  return used;
}

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="grid max-w-[68ch] gap-4 text-[1.0625rem] leading-relaxed">
      {text
        .split(/\n{2,}/)
        .filter((p) => p.trim())
        .map((paragraph, i) => (
          <p key={i} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
    </div>
  );
}

function SectionLabel({ id, text }: { id: string; text: string }) {
  return (
    <>
      <h2 id={id} className="text-sm font-medium text-muted-foreground">
        <Scramble text={text} />
      </h2>
      <DrawRule className="mt-3 mb-6" />
    </>
  );
}

export default async function ProjectPage({ params }: Params) {
  const project = getProject((await params).id);
  if (!project) notFound();

  const colleges = (project.affiliation ?? "").split("; ").filter(Boolean).map(shortCollege);
  const data = {
    id: project.id,
    title: project.title,
    url: project.url,
    status: project.status,
    semester: project.semester,
    leaderName: project.team_leader?.name ?? null,
    requiredSkills: project.required_skills,
    preferredSkills: project.preferred_skills,
    aiSkills: project.ai_skills,
    lastCheckedAt: project.last_checked_at,
    skills: skillsFor(project),
    courseSkills,
  };
  const leaders = [project.team_leader, ...project.co_leaders].filter((p) => p !== null);

  return (
    <article aria-labelledby="project-title" className="mx-auto max-w-[1200px] px-4 pt-4 pb-16 md:px-6 md:pt-6">
      <JsonLd
        data={{
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "All projects", item: absoluteUrl("/projects") },
            { "@type": "ListItem", position: 2, name: project.title, item: absoluteUrl(`/projects/${project.id}`) },
          ],
        }}
      />
      <Link
        href="/projects"
        transitionTypes={[TO_DETAIL]}
        className="km-link group inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft
          className="size-4 transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:-translate-x-0.5"
          aria-hidden="true"
        />
        All projects
      </Link>

      <header className="mt-4 md:mt-8">
        {/* Topics link to the list filtered by that topic; colleges are plain text. */}
        <p className="km-label flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
          {project.topics
            .filter((id) => id in topics)
            .map((id) => (
              <Link
                key={id}
                href={`/projects?topic=${id}`}
                className="km-link group inline-flex min-h-11 items-center gap-1 hover:text-foreground md:min-h-6"
              >
                {topics[id]}
                <ArrowRight
                  className="size-3.5 transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            ))}
          {colleges.length > 0 && <span>{colleges.join(", ")}</span>}
        </p>
        <div className="mt-2 flex flex-wrap items-start gap-x-4 gap-y-2">
          <h1
            id="project-title"
            className="max-w-[30ch] font-serif text-[clamp(1.75rem,1.1rem+2.4vw,2.75rem)] leading-[1.1] tracking-[-0.01em]"
          >
            <ProjectTitle id={project.id} title={project.title} />
          </h1>
          <div className="pt-2">
            <DetailNewBadge firstSeenAt={project.first_seen_at} baselineAt={meta.baseline_at} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {project.semester && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
              {project.semester}
            </span>
          )}
          <SpotsBadge status={project.status} openSpots={project.open_spots} teamSize={project.team_size} />
          <BeginnerNote reason={project.beginner_reason} />
        </div>
        <div className="mt-5">
          <ProgressControl projectId={project.id} />
        </div>
      </header>

      <DrawRule className="mt-8" />

      <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
        <div className="grid min-w-0 content-start gap-14">
          <section aria-labelledby="about-heading">
            <SectionLabel id="about-heading" text="About the project" />
            {project.description ? (
              <Paragraphs text={project.description} />
            ) : (
              <p className="text-muted-foreground">The team hasn&apos;t added a description. The KRSP listing may have more.</p>
            )}
          </section>

          <section aria-labelledby="quals-heading">
            <SectionLabel id="quals-heading" text="Who they're looking for" />
            <div className="grid gap-8 md:grid-cols-2">
              <div className="grid content-start gap-2">
                <h3 className="text-sm font-semibold">As written by the team</h3>
                {project.quals_raw ? (
                  <blockquote className="border-l-2 border-border-strong pl-4 text-[0.9375rem] leading-relaxed whitespace-pre-line text-foreground/90">
                    {project.quals_raw}
                  </blockquote>
                ) : (
                  <p className="text-sm text-muted-foreground">No qualifications listed on KRSP.</p>
                )}
              </div>
              <DetectedSkills data={data} />
            </div>
          </section>

          <section aria-labelledby="people-heading">
            <SectionLabel id="people-heading" text="People" />
            <dl className="grid gap-6 sm:grid-cols-2">
              {leaders.map((person, i) => (
                <div key={person.name}>
                  <dt className="text-sm text-muted-foreground">{i === 0 ? "Team leader" : "Co-leader"}</dt>
                  <dd className="mt-1">
                    <p className="font-medium">{person.name}</p>
                    {person.role && <p className="text-sm text-muted-foreground">{person.role}</p>}
                  </dd>
                </div>
              ))}
              {project.faculty_mentor && (
                <div>
                  <dt className="text-sm text-muted-foreground">Faculty mentor</dt>
                  <dd className="mt-1 font-medium">{project.faculty_mentor}</dd>
                </div>
              )}
            </dl>
            <p className="mt-6 text-sm text-muted-foreground">
              Contact details are on the KRSP listing. We don&apos;t copy them here.
            </p>
          </section>
        </div>

        <aside aria-label="Your match and how to apply">
          <MobileApplyBar open={project.status === "open"} />
          <StickyPanel>
            <ProjectSidebar data={data} />
          </StickyPanel>
        </aside>
      </div>
    </article>
  );
}
