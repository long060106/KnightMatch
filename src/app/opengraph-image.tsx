import { meta, projects } from "@/lib/data";
import { OG_HONEY_INK, OG_SIZE, ogCard } from "@/lib/og-card";

// The site-wide share image. Pages without their own (everything but a project) use this one.
export const alt = "KnightMatch: UCF research projects you can join";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  const open = projects.filter((p) => p.status === "open").length;
  return ogCard({
    label: "Knight Research Scholars",
    title: "UCF research projects you can join",
    footer: `${meta.counts.listed} projects · checked every hour`,
    stat: { value: String(open), caption: open === 1 ? "team recruiting now" : "teams recruiting now", color: OG_HONEY_INK },
  });
}
