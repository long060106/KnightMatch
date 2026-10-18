"use client";

import Image from "next/image";
import { useRef, type CSSProperties, type PointerEvent } from "react";

const COLS = 8;
const ROWS = 10;
const MAX_TILT = 5; // degrees

/** Same order every render (no Math.random, so server and browser agree): a scattered 0…1. */
function scatter(i: number): number {
  return ((i * 37 + 11) % (COLS * ROWS)) / (COLS * ROWS);
}

/**
 * The developer photo. On load the picture is uncovered tile by tile, in the same square cells as
 * the team grid on the home page (CSS only, so it plays from the prerendered HTML). With a mouse
 * the frame leans toward the pointer while the photo inside and the outline behind it slide the
 * other way, which gives it depth. Square corners, hairlines, no shadows, like the rest of the site.
 * Reduced motion: the photo just appears and stays still.
 */
export function Portrait() {
  const frameRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const lean = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const el = frameRef.current;
    if (!el) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--px", x.toFixed(3));
      el.style.setProperty("--py", y.toFixed(3));
    });
  };
  const settle = () => {
    const el = frameRef.current;
    cancelAnimationFrame(frame.current);
    el?.style.setProperty("--px", "0");
    el?.style.setProperty("--py", "0");
  };

  return (
    <figure
      onPointerMove={lean}
      onPointerLeave={settle}
      className="relative mx-auto w-full max-w-[340px] lg:mx-0 lg:ml-auto"
      style={{ "--tilt": `${MAX_TILT}deg` } as CSSProperties}
    >
      <div ref={frameRef} className="km-portrait relative">
        {/* An empty outline behind the photo, offset down and right. */}
        <div aria-hidden="true" className="km-portrait-outline absolute inset-0 border border-border-strong" />

        <div className="relative aspect-[4/5] overflow-hidden bg-card">
          <Image
            src="/long-nguyen.jpg"
            alt="Black-and-white portrait of Long Nguyen standing beside a stone column at night."
            width={1000}
            height={1333}
            sizes="340px"
            unoptimized
            preload
            className="km-portrait-img size-full object-cover object-[50%_58%]"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid grid-cols-8 grid-rows-10">
            {Array.from({ length: COLS * ROWS }, (_, i) => (
              <span key={i} className="km-tile" style={{ "--d": `${Math.round(scatter(i) * 900)}ms` } as CSSProperties} />
            ))}
          </div>
        </div>

        {/* Crop marks at the corners, like a print proof. */}
        <span aria-hidden="true" className="absolute -top-2.5 -left-2.5 size-4 border-t border-l border-foreground" />
        <span aria-hidden="true" className="absolute -top-2.5 -right-2.5 size-4 border-t border-r border-foreground" />
        <span aria-hidden="true" className="absolute -bottom-2.5 -left-2.5 size-4 border-b border-l border-foreground" />
        <span aria-hidden="true" className="absolute -right-2.5 -bottom-2.5 size-4 border-r border-b border-foreground" />
      </div>
      <figcaption className="km-label mt-6 flex items-center justify-between gap-4 text-muted-foreground">
        <span>Fig. 1</span>
        <span className="text-foreground">Long Nguyen</span>
      </figcaption>
    </figure>
  );
}
