"use client";

import { useInView } from "@/lib/use-in-view";
import { cn } from "@/lib/utils";

/** A hairline that draws itself from the left the first time it scrolls into view. */
export function DrawRule({ className, delay = 0 }: { className?: string; delay?: number }) {
  const [ref, inView] = useInView<HTMLDivElement>("0px 0px -5% 0px");
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-inview={inView ? "" : undefined}
      className={cn("km-rule", className)}
      style={{ transitionDelay: `${delay}ms` }}
    />
  );
}
