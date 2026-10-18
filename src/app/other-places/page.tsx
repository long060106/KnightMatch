import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { DrawRule } from "@/components/draw-rule";
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
        className={cn(
          "group grid min-h-11 grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-lg px-3 py-3 transition-colors duration-[var(--dur-fast)] hover:bg-card",
          compact ? "items-center" : "items-start",
        )}
      >
        <span className="font-medium underline-offset-4 group-hover:underline">{link.title}</span>
        <ArrowUpRight
          className="row-span-2 mt-1 size-4 text-muted-foreground transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
          aria-hidden="true"
        />
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
          className="inline-flex min-h-11 items-center gap-0.5 font-medium text-foreground underline underline-offset-4 hover:text-honey-ink"
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
      <header className="pt-10 pb-6 md:pt-14 md:pb-8">
        <h1 className="max-w-[22ch] font-serif text-[clamp(2rem,1.2rem+3.2vw,3.25rem)] leading-[1.06] tracking-[-0.015em]">
          Other places to look.
        </h1>
        <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-muted-foreground md:text-lg">
          KRSP is one way in. These official pages cover the rest: advice, course credit, paid positions, college labs
          and summer programs. We only link to them, so each site always has the latest details.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Links checked on {checkedOn(otherPlaces.checked_on)}.</p>
      </header>

      <div className="grid gap-16">
        {otherPlaces.sections.map((section) => {
          const compact = section.id === "colleges";
          return (
            <section key={section.id} aria-labelledby={`${section.id}-heading`}>
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
