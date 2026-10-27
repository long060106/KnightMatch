import { getProject, projects, topics } from "@/lib/data";
import { shortCollege } from "@/lib/filters";
import { OG_INK, OG_SIZE, OG_SPOTS_COLOR, ogCard, type OgStat } from "@/lib/og-card";
import { spotsFraction, spotsLevel } from "@/lib/spots";
import type { Project } from "@/lib/types";

// One share image per project, drawn at build time like the page itself.
export const alt = "A Knight Research Scholars project on KnightMatch";
export const size = OG_SIZE;
export const contentType = "image/png";
export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ id: p.id }));
}

/** Same rules as SpotsFraction: the band color and bar only when the team size is known. */
function spotsStat({ status, open_spots: open, team_size: teamSize }: Project): OgStat | undefined {
  if (status === "full" || open === null) return undefined;
  return {
    value: spotsFraction(open, teamSize),
    caption: "spots open",
    color: teamSize ? OG_SPOTS_COLOR[spotsLevel(open, teamSize)] : OG_INK,
    share: teamSize ? Math.min(open / teamSize, 1) : undefined,
  };
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const project = getProject((await params).id);
  if (!project) return new Response("Not found", { status: 404 });

  const colleges = (project.affiliation ?? "").split("; ").filter(Boolean).map(shortCollege);
  const topic = project.topics.find((id) => id in topics);

  return ogCard({
    label: topic ? topics[topic] : "Research project",
    title: project.title,
    footer: [colleges[0], project.semester].filter(Boolean).join(" · ") || "Knight Research Scholars",
    stat: spotsStat(project),
    // Full teams stay quiet, like their one-line rows on the site.
    note:
      project.status === "full" ? (project.team_size ? `Full team of ${project.team_size}` : "Full team") : undefined,
  });
}
