/**
 * The 1200 × 630 card that link previews show (Discord, GroupMe, iMessage, X, search results).
 * Drawn once per page at build time, always on light paper: previews don't follow the reader's theme.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { clip } from "./seo";

export const OG_SIZE = { width: 1200, height: 630 };

// Light-theme tokens from src/app/globals.css.
const PAPER = "#FAFAF9";
export const OG_INK = "#1C1917";
const GRAPHITE = "#57534E";
const RULE = "#E7E5E4";

/** Spots colors (light theme), the same bands as src/lib/spots.ts. */
export const OG_SPOTS_COLOR = { high: "#15803D", mid: "#A16207", low: "#B91C1C" } as const;
export const OG_HONEY_INK = "#8A6100";

// Satori reads woff but not woff2, so the fonts come from Fontsource rather than next/font.
function fontFile(pkg: string, file: string) {
  return readFile(join(process.cwd(), "node_modules/@fontsource", pkg, "files", file));
}

let assets: Promise<[Buffer, Buffer, string]> | undefined;

function loadAssets() {
  assets ??= Promise.all([
    fontFile("newsreader", "newsreader-latin-400-normal.woff"),
    fontFile("ibm-plex-mono", "ibm-plex-mono-latin-500-normal.woff"),
    // The knight PNG is black on transparent, so it can be drawn as is on paper.
    readFile(join(process.cwd(), "public/knight-mark.png")).then((png) => `data:image/png;base64,${png.toString("base64")}`),
  ]);
  return assets;
}

export interface OgStat {
  value: string;
  caption: string;
  color: string;
  /** Fills a short bar beside the number (open share of the team), so the band reads without color. */
  share?: number;
}

const MONO = { fontFamily: "Plex Mono", textTransform: "uppercase", letterSpacing: 1.4, color: GRAPHITE } as const;

/** Big type for short titles, smaller for long ones; four lines at most. */
function titleSize(title: string): number {
  if (title.length <= 50) return 70;
  if (title.length <= 90) return 62;
  return 52;
}

/** `stat` is a big number (good news); `note` is a quiet line in its place, like "Full team of 5". */
export async function ogCard({
  label,
  title,
  footer,
  stat,
  note,
}: {
  label: string;
  title: string;
  footer: string;
  stat?: OgStat;
  note?: string;
}): Promise<ImageResponse> {
  const [newsreader, plexMono, knight] = await loadAssets();
  const text = clip(title, 160);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: PAPER,
          color: OG_INK,
          padding: "60px 72px 52px",
          fontFamily: "Newsreader",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws plain img tags */}
            <img src={knight} width={44} height={44} alt="" />
            <span style={{ fontSize: 36 }}>KnightMatch</span>
          </div>
          <span style={{ ...MONO, fontSize: 22 }}>{label}</span>
        </div>
        {/* Hairlines are 2px here: previews shrink the card to about 500px wide. */}
        <div style={{ display: "flex", height: 2, background: RULE, marginTop: 28 }} />

        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            fontSize: titleSize(text),
            lineHeight: 1.1,
            letterSpacing: -0.6,
          }}
        >
          {text}
        </div>

        {stat && (
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 32 }}>
            <span style={{ fontSize: 64, lineHeight: 1, color: stat.color }}>{stat.value}</span>
            {stat.share !== undefined && (
              <div style={{ display: "flex", width: 160, height: 10, background: RULE }}>
                <div style={{ display: "flex", width: `${Math.round(stat.share * 100)}%`, background: stat.color }} />
              </div>
            )}
            <span style={{ ...MONO, fontSize: 22 }}>{stat.caption}</span>
          </div>
        )}
        {!stat && note && (
          <div style={{ display: "flex", marginBottom: 32, ...MONO, fontSize: 24 }}>
            {note}
          </div>
        )}

        <div style={{ display: "flex", height: 2, background: RULE }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22, ...MONO, fontSize: 20 }}>
          <span>{footer}</span>
          <span>Not affiliated with UCF</span>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Newsreader", data: newsreader, weight: 400, style: "normal" },
        { name: "Plex Mono", data: plexMono, weight: 500, style: "normal" },
      ],
    },
  );
}
