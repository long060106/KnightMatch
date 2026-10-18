"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * The page's hairline grid (styles in globals.css, `.km-grid`). With a mouse or trackpad, a
 * brighter patch of grid follows the pointer. Touch screens just get the still grid.
 *
 * Dense, ruled content (the project lists) is marked `data-grid-quiet`: while one fills the middle
 * of the screen the grid fades out, so its lines never cross the content's own hairlines.
 */
export function BackgroundGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
    };
    const move = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      el.dataset.active = "";
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const leave = () => delete el.dataset.active;
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  // Re-run per page: the marked sections belong to the page, the grid to the layout.
  useEffect(() => {
    const el = ref.current;
    const quiet = document.querySelectorAll("[data-grid-quiet]");
    if (!el || !quiet.length) return;
    const inBand = new Set<Element>();
    // The band is the middle 40% of the screen: the grid goes once a list is what you're reading.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target);
          else inBand.delete(entry.target);
        }
        if (inBand.size) el.dataset.quiet = "";
        else delete el.dataset.quiet;
      },
      { rootMargin: "-30% 0px -30% 0px" },
    );
    quiet.forEach((q) => observer.observe(q));
    return () => {
      observer.disconnect();
      delete el.dataset.quiet;
    };
  }, [pathname]);

  return <div ref={ref} aria-hidden="true" className="km-grid" />;
}
