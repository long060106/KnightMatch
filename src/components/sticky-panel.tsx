"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A sidebar that stays in view on wide screens without ever getting its own scrollbar.
 *
 * If it fits the screen, it sticks `gap` px from the top. If it's taller, its sticky top
 * becomes negative so it scrolls along with the page until its last item is on screen and
 * then sticks there: everything stays reachable with normal page scrolling.
 * Must be the direct child of a grid/flex item that is as tall as the content column.
 */
export function StickyPanel({ children, className, gap = 24 }: { children: ReactNode; className?: string; gap?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      el.style.top = `${Math.min(gap, window.innerHeight - el.offsetHeight - gap)}px`;
    };
    const resize = new ResizeObserver(update);
    resize.observe(el);
    window.addEventListener("resize", update);
    update();
    return () => {
      resize.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [gap]);

  return (
    <div ref={ref} className={cn("lg:sticky", className)} style={{ top: gap }}>
      {children}
    </div>
  );
}
