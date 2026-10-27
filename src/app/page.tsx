import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DrawRule } from "@/components/draw-rule";
import { Hero, RecruitingNow } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { JsonLd } from "@/components/json-ld";
import { LegacyListRedirect } from "@/components/legacy-list-redirect";
import { OpenTicker } from "@/components/open-ticker";
import { Button } from "@/components/ui/button";
import { WireSphere } from "@/components/wire-sphere";
import { meta, projects, toListing } from "@/lib/data";
import { shortCollege } from "@/lib/filters";
import { absoluteUrl, DEFAULT_TITLE, pageMetadata, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ description: SITE_DESCRIPTION, path: "/" });

/**
 * The introduction: what KnightMatch is for, the proof that teams are recruiting, and how it works.
 * The list itself lives on /projects.
 */
export default function HomePage() {
  const listing = projects.map(toListing);
  const open = listing.filter((p) => p.status === "open");

  return (
    <>
      <JsonLd
        data={{ "@type": "WebSite", name: SITE_NAME, alternateName: DEFAULT_TITLE, url: absoluteUrl("/"), description: SITE_DESCRIPTION }}
      />
      <LegacyListRedirect />
      <Hero totalCount={listing.length} lastRunAt={meta.last_run_at} />
      <RecruitingNow
        openCount={open.length}
        totalCount={listing.length}
        openSpots={open.reduce((sum, p) => sum + (p.openSpots ?? 0), 0)}
        collegeCount={new Set(open.flatMap((p) => p.colleges)).size}
        openFirstSeen={open.map((p) => p.firstSeenAt)}
        baselineAt={meta.baseline_at}
      />
      <OpenTicker
        items={open.map((p) => ({
          id: p.id,
          title: p.title,
          college: p.colleges[0] ? shortCollege(p.colleges[0]) : null,
          openSpots: p.openSpots,
          teamSize: p.teamSize,
        }))}
      />
      <HowItWorks />

      {/* Closing call to action: the one next step, as large as a headline. */}
      <section aria-labelledby="cta-title" className="mx-auto max-w-[1200px] px-4 pt-20 pb-24 md:px-6 md:pt-28 md:pb-32">
        <DrawRule />
        <div className="grid gap-8 pt-10 md:pt-14 lg:grid-cols-12 lg:items-end lg:gap-0">
          <h2
            id="cta-title"
            className="font-serif text-[clamp(2.75rem,1.5rem+5vw,5.5rem)] leading-[0.9] tracking-[-0.01em] uppercase lg:col-span-8"
          >
            See all {listing.length} projects
          </h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 lg:col-span-4 lg:justify-end">
            <div className="mb-6 hidden basis-full justify-end lg:flex">
              <WireSphere meridians={7} parallels={5} seconds={10} className="w-28 text-foreground/40" />
            </div>
            <Button asChild className="h-12 px-6 text-base font-semibold active:scale-[0.97]">
              <Link href="/projects">Browse projects</Link>
            </Button>
            <Link
              href="/match"
              className="km-label group inline-flex min-h-11 items-center gap-1.5 underline decoration-border-strong underline-offset-[6px] hover:decoration-foreground"
            >
              Match me first
              <ArrowRight
                className="size-3.5 transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
