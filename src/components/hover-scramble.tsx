"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/use-in-view";
import { randomLike } from "./scramble";

const DURATION_MS = 480;
const FRAME_MS = 40;

/**
 * Label text that shuffles into random characters and settles back, left to right, whenever the
 * link or button around it is hovered or focused. Meant for mono labels (every glyph is the same
 * width, so nothing shifts). Screen readers get the real text; the shuffled copy is aria-hidden.
 * Reduced motion: no effect.
 */
export function HoverScramble({ text }: { text: string }) {
  const root = useRef<HTMLSpanElement>(null);
  const visual = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = visual.current;
    const host = root.current?.closest<HTMLElement>("a, button");
    if (!el || !host) return;
    const chars = [...text];
    let frame = 0;
    let running = false;

    const run = () => {
      if (running || prefersReducedMotion()) return;
      running = true;
      const start = performance.now();
      let lastSwap = -FRAME_MS;
      const tick = (now: number) => {
        const elapsed = now - start;
        if (elapsed >= DURATION_MS) {
          el.textContent = text;
          running = false;
          return;
        }
        if (elapsed - lastSwap >= FRAME_MS) {
          lastSwap = elapsed;
          el.textContent = chars
            .map((ch, i) => (elapsed >= 100 + (i / chars.length) * (DURATION_MS - 100) ? ch : randomLike(ch)))
            .join("");
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    host.addEventListener("pointerenter", run);
    host.addEventListener("focus", run);
    return () => {
      host.removeEventListener("pointerenter", run);
      host.removeEventListener("focus", run);
      cancelAnimationFrame(frame);
      running = false;
      el.textContent = text;
    };
  }, [text]);

  return (
    <span ref={root}>
      <span className="sr-only">{text}</span>
      <span ref={visual} aria-hidden="true" className="whitespace-pre">
        {text}
      </span>
    </span>
  );
}
