/**
 * What search engines and link previews read: page descriptions, canonical addresses, the Open
 * Graph / X card fields and the JSON-LD blocks. The share images themselves are drawn in og-card.tsx.
 */

import type { Metadata } from "next";
import { shortCollege } from "./filters";
import type { Project } from "./types";

/** Vercel sets this at build time, and it follows a custom domain if one is ever added. */
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://knight-match.vercel.app";

export const SITE_NAME = "KnightMatch";
export const DEFAULT_TITLE = "KnightMatch: UCF research projects you can join";
export const SITE_DESCRIPTION =
  "Search the Knight Research Scholars Program projects, see which ones match the skills and courses you already have, and find out when new teams open.";

/** Search results cut descriptions at about this many characters. */
const DESCRIPTION_CHARS = 160;

/** Shortens text to `max` characters at a word boundary, ending with "…" when anything was cut. */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  // Keep the last word when the cut lands right after it; otherwise back up to the previous space.
  const space = /\s/.test(text[max - 1]) ? cut.length : cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[\s,;:.–-]+$/, "")}…`;
}

// A short label that opens a line, like "Project Overview:", "BACKGROUND:" or "Subject:".
const LEAD_LABEL = /^(?:[A-Za-z&/-]+ ){0,2}[A-Za-z&/-]+:\s*/;

/** A KRSP description as one plain line: no headings, no line breaks, cut at a word. */
export function summarize(text: string, max: number): string {
  const flat = text
    .split("\n")
    .map((line) => line.trim().replace(LEAD_LABEL, ""))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");
  return clip(flat, max);
}

/** "2 of 4 spots open", "Full team", or null when KRSP doesn't say. */
export function spotsSentence(project: Pick<Project, "status" | "open_spots" | "team_size">): string | null {
  if (project.status === "full") return "Full team";
  const open = project.open_spots;
  if (open === null) return null;
  if (project.team_size) return `${open} of ${project.team_size} spots open`;
  return `${open} ${open === 1 ? "spot" : "spots"} open`;
}

/** College, semester and spots up front, then as much of the description as still fits. */
export function projectDescription(project: Project): string {
  const colleges = (project.affiliation ?? "").split("; ").filter(Boolean).map(shortCollege);
  const where = [colleges.join(", "), project.semester].filter(Boolean).join(", ");
  const lead = [where, spotsSentence(project)]
    .filter(Boolean)
    .map((part) => `${part}.`)
    .join(" ");
  const room = DESCRIPTION_CHARS - lead.length - 1;
  const summary = room >= 40 ? summarize(project.description, room) : "";
  return [lead, summary].filter(Boolean).join(" ") || DEFAULT_TITLE;
}

// The site-wide card from src/app/opengraph-image.tsx.
const SITE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: DEFAULT_TITLE };

/**
 * Title, description and canonical address, plus the same title and description for link previews.
 * Every page sets its own: Next.js merges `openGraph` shallowly, so a page that left it out would
 * show the home page's title in its preview, and one that set it would lose the inherited image.
 * Pages with their own opengraph-image file pass `siteImage: false`, or this card would replace it.
 */
export function pageMetadata({
  title,
  description,
  path,
  siteImage = true,
}: {
  title?: string;
  description: string;
  path: string;
  siteImage?: boolean;
}): Metadata {
  const shareTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const images = siteImage ? { images: [SITE_IMAGE] } : {};
  return {
    ...(title !== undefined && { title }),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: path,
      title: shareTitle,
      description,
      ...images,
    },
    twitter: { card: "summary_large_image", title: shareTitle, description, ...images },
  };
}

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
