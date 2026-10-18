"use client";

import { useInView } from "@/lib/use-in-view";
import { cn } from "@/lib/utils";

interface DrawRuleProps {
  className?: string;
  delay?: number;
  /** Draws top to bottom instead of left to right (a column rule). */
  vertical?: boolean;
}

/** A hairline that draws itself the first time it scrolls into view. */
export function DrawRule({ className, delay = 0, vertical = false }: DrawRuleProps) {
  const [ref, inView] = useInView<HTMLDivElement>("0px 0px -5% 0px");
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-inview={inView ? "" : undefined}
      className={cn(vertical ? "km-rule-v" : "km-rule", className)}
      style={{ transitionDelay: `${delay}ms` }}
    />
  );
}
