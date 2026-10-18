"use client";

import { useEffect, useRef } from "react";

/**
 * The page's hairline grid (styles in globals.css, `.km-grid`). With a mouse or trackpad, a
 * brighter patch of grid follows the pointer. Touch screens just get the still grid.
 */
export function BackgroundGrid() {
  const ref = useRef<HTMLDivElement>(null);

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

  return <div ref={ref} aria-hidden="true" className="km-grid" />;
}
