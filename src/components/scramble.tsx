"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion, useInView } from "@/lib/use-in-view";
import { cn } from "@/lib/utils";

const DIGITS = "0123456789";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DURATION_MS = 650;
const FRAME_MS = 45; // swap glyphs every ~3 frames so it reads as "decoding", not noise

function randomLike(ch: string): string {
  const set = /\d/.test(ch) ? DIGITS : /[A-Z]/.test(ch) ? UPPER : /[a-z]/.test(ch) ? LOWER : null;
  return set ? set[Math.floor(Math.random() * set.length)] : ch;
}

interface ScrambleProps {
  text: string;
  className?: string;
  /** Replays the decode whenever this value changes (after the first time in view). */
  replayKey?: string | number;
}

/**
 * Text that "decodes" from random characters, left to right, the first time it scrolls into view.
 * Screen readers get the real text; the animated copy is aria-hidden. Width is locked while it
 * runs so nothing around it shifts. Reduced motion: the text simply appears.
 */
export function Scramble({ text, className, replayKey }: ScrambleProps) {
  const [ref, inView] = useInView<HTMLSpanElement>("0px 0px -5% 0px");
  const visual = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = visual.current;
    if (!el || !inView || prefersReducedMotion()) return;
    const width = el.getBoundingClientRect().width;
    el.style.width = `${width}px`;
    const chars = [...text];
    const start = performance.now();
    let frame = 0;
    let lastSwap = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed - lastSwap >= FRAME_MS || elapsed >= DURATION_MS) {
        lastSwap = elapsed;
        el.textContent = chars
          .map((ch, i) => {
            const settleAt = 120 + (i / Math.max(1, chars.length)) * (DURATION_MS - 120);
            return elapsed >= settleAt ? ch : randomLike(ch);
          })
          .join("");
      }
      if (elapsed < DURATION_MS) {
        frame = requestAnimationFrame(tick);
      } else {
        el.textContent = text;
        el.style.width = "";
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      el.textContent = text;
      el.style.width = "";
    };
  }, [inView, text, replayKey]);

  return (
    <span ref={ref} className={cn("relative inline-block", className)}>
      <span className="sr-only">{text}</span>
      <span ref={visual} aria-hidden="true" className="inline-block whitespace-pre tabular-nums">
        {text}
      </span>
    </span>
  );
}
