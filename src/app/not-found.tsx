import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-14 pb-24 md:px-6 md:pt-20">
      <p className="text-sm font-medium text-muted-foreground">Page not found</p>
      <h1 className="mt-3 max-w-[22ch] font-serif text-[clamp(2rem,1.2rem+3.2vw,3.25rem)] leading-[1.06] tracking-[-0.015em]">
        This page isn&apos;t on KnightMatch.
      </h1>
      <p className="mt-4 max-w-[60ch] text-lg text-muted-foreground">
        If it was a project, the team may have been taken off the KRSP list. If you typed the address, check it for a
        typo.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Button asChild className="h-12 px-5 text-base font-semibold active:scale-[0.97]">
          <Link href="/projects">Browse open projects</Link>
        </Button>
        <Button asChild variant="outline" className="h-12 px-5 text-base active:scale-[0.97]">
          <Link href="/match">Match me</Link>
        </Button>
      </div>
    </div>
  );
}
