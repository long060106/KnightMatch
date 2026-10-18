import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { DrawRule } from "@/components/draw-rule";
import { FloatingShapes } from "@/components/floating-shapes";
import { RisingWords } from "@/components/rising-words";
import { Scramble } from "@/components/scramble";
import { Button } from "@/components/ui/button";
import { otherPlaces } from "@/lib/data";
import type { PlaceLink, PlaceSection } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Other places to look",
  description:
    "Official UCF pages for finding undergraduate research beyond KRSP: the Office of Undergraduate Research, course credit, paid positions, college labs and summer programs.",
};

function host(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

function checkedOn(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** One whole-row link: title, what you'll find there, and where it goes. */
function PlaceRow({ link, compact }: { link: PlaceLink; compact?: boolean }) {
  return (
    <li>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group grid min-h-11 content-center gap-y-1 px-3 py-3 transition-colors duration-[var(--dur-fast)] hover:bg-card"
      >
        {/* The ↗ follows the title, like every other link that leaves the site. */}
        <span className="font-medium">
          <span className="km-link group-hover:decoration-foreground">{link.title}</span>
          <ArrowUpRight
            className="ml-1 inline size-4 -translate-y-px text-muted-foreground transition-[translate,color] duration-[var(--dur-fast)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
            aria-hidden="true"
          />
        </span>
        <span className="text-sm text-muted-foreground">
          {!compact && <span className="block max-w-[60ch]">{link.description}</span>}
          <span className="text-xs">{host(link.url)}</span>
        </span>
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </li>
  );
}

function Callout({ callout }: { callout: NonNullable<PlaceSection["callout"]> }) {
  const [workshop, mentor, positions] = callout.steps;
  return (
    <div className="mt-6 rounded-lg border bg-card p-5 md:p-6">
      <h3 className="font-serif text-2xl">{callout.title}</h3>
      <p className="mt-2 max-w-[66ch] text-muted-foreground">{callout.body}</p>
      <p className="mt-5 text-sm font-semibold">Get access through OUR</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {[workshop, mentor].map((step) => (
          <Button key={step.url} asChild variant="outline" className="h-11 gap-1.5 px-4 active:scale-[0.97]">
            <a href={step.url} target="_blank" rel="noopener noreferrer">
              {step.label}
              <ArrowUpRight className="size-4" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Button>
        ))}
      </div>
      <p className="mt-5 text-sm text-muted-foreground">
        Already have access?{" "}
        <a
          href={positions.url}
          target="_blank"
          rel="noopener noreferrer"
          className="km-link inline-flex min-h-11 items-center gap-0.5 font-medium text-foreground"
        >
          {positions.label}
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </p>
    </div>
  );
}

export default function OtherPlacesPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-20 md:px-6">
      <header className="relative isolate pt-16 pb-6 md:pt-14 md:pb-8">
        <div
          aria-hidden="true"
          className="km-page-fade pointer-events-none absolute inset-0 -z-10"
          style={{ "--d": "350ms" } as CSSProperties}
        >
          <FloatingShapes set="places" />
        </div>
        <h1 className="max-w-[22ch] font-serif text-[clamp(2rem,1.2rem+3.2vw,3.25rem)] leading-[1.06] tracking-[-0.015em]">
          <RisingWords text="Other places to look." />
        </h1>
        <p
          className="km-page-in mt-4 max-w-[62ch] text-base leading-relaxed text-muted-foreground md:text-lg"
          style={{ "--d": "300ms" } as CSSProperties}
        >
          KRSP is one way in. These official pages cover the rest: advice, course credit, paid positions, college labs
          and summer programs. We only link to them, so each site always has the latest details.
        </p>
        <p className="km-page-in mt-3 text-sm text-muted-foreground" style={{ "--d": "380ms" } as CSSProperties}>
          Links checked on {checkedOn(otherPlaces.checked_on)}.</p>
      </header>

      <div className="grid gap-16">
        {otherPlaces.sections.map((section, i) => {
          const compact = section.id === "colleges";
          return (
            <section
              key={section.id}
              aria-labelledby={`${section.id}-heading`}
              className="km-page-in"
              // The first two sections are on screen at load: they follow the header one by one.
              style={{ "--d": `${460 + Math.min(i, 2) * 120}ms` } as CSSProperties}
            >
              <p className="text-sm font-medium text-muted-foreground" aria-hidden="true">
                <Scramble text={section.label} />
              </p>
              <DrawRule className="mt-3" />
              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-12">
                <div>
                  <h2 id={`${section.id}-heading`} className="font-serif text-2xl leading-snug">
                    {section.title}
                  </h2>
                  <p className="mt-2 text-muted-foreground">{section.intro}</p>
                </div>
                <div>
                  <ul className={cn("-mx-3 grid", compact ? "gap-0 sm:grid-cols-2" : "gap-1")}>
                    {section.links.map((link) => (
                      <PlaceRow key={link.url} link={link} compact={compact} />
                    ))}
                  </ul>
                  {section.callout && <Callout callout={section.callout} />}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
