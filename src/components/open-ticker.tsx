"use client";

import { ArrowRight, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { useOnScreen } from "@/lib/use-in-view";
import { DrawRule } from "./draw-rule";
import { SpotsFraction } from "./project-bits";

export interface TickerItem {
  id: string;
  title: string;
  college: string | null;
  openSpots: number | null;
  teamSize: number | null;
}

function TickerRow({ items, copy }: { items: TickerItem[]; copy: boolean }) {
  return (
    <ul className={copy ? "km-ticker-copy flex shrink-0" : "flex shrink-0"} aria-hidden={copy || undefined}>
      {items.map((p) => (
        <li key={p.id} className="flex items-center">
          <Link
            href={`/projects/${p.id}`}
            tabIndex={copy ? -1 : undefined}
            className="group flex items-baseline gap-3 px-5 py-4 whitespace-nowrap md:px-7 md:py-5"
          >
            <span className="font-serif text-lg underline decoration-border-strong decoration-1 underline-offset-4 transition-[text-decoration-color] duration-[var(--dur-fast)] group-hover:decoration-foreground md:text-2xl">
              {p.title}
            </span>
            <ArrowRight
              aria-hidden="true"
              className="size-4 shrink-0 self-center text-muted-foreground transition-[translate,color] duration-[var(--dur-base)] group-hover:translate-x-0.5 group-hover:text-foreground"
            />
            {p.college && <span className="km-label text-muted-foreground">{p.college}</span>}
            {p.openSpots !== null && (
              <SpotsFraction openSpots={p.openSpots} teamSize={p.teamSize} suffix="open" bar={false} className="km-label" />
            )}
          </Link>
          <span aria-hidden="true" className="size-1 rounded-full bg-border-strong" />
        </li>
      ))}
    </ul>
  );
}

/**
 * A slow, endless band of the teams that are recruiting, so the variety shows at a glance.
 * Pauses on hover, on keyboard focus, off screen and with its own button. With reduced motion
 * it stands still and scrolls sideways instead.
 */
export function OpenTicker({ items }: { items: TickerItem[] }) {
  const [paused, setPaused] = useState(false);
  const [ref, onScreen] = useOnScreen<HTMLElement>();
  if (items.length === 0) return null;

  return (
    <section
      ref={ref}
      aria-label="Teams recruiting right now"
      className="km-ticker relative"
      data-paused={paused || !onScreen ? "" : undefined}
    >
      <DrawRule className="absolute inset-x-0 top-0" />
      <div className="km-ticker-viewport overflow-hidden pr-14">
        <div className="km-ticker-track flex w-max" style={{ "--n": items.length } as CSSProperties}>
          <TickerRow items={items} copy={false} />
          <TickerRow items={items} copy />
        </div>
      </div>
      <div className="km-ticker-toggle absolute inset-y-0 right-0 flex items-center bg-background pr-2 pl-1 md:pr-4">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Play the moving list of teams" : "Pause the moving list of teams"}
          className="inline-flex size-11 items-center justify-center rounded-none text-muted-foreground transition-colors duration-[var(--dur-fast)] hover:bg-muted hover:text-foreground"
        >
          {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
        </button>
      </div>
      <DrawRule className="absolute inset-x-0 bottom-0" delay={150} />
    </section>
  );
}
