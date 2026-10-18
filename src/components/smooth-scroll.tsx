"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { setLenis } from "@/lib/smooth-scroll";

/**
 * Inertial scrolling (Lenis), only where it feels right: wide screens with a mouse or trackpad,
 * and only when the visitor has not asked for reduced motion. Phones keep native scrolling.
 * Lenis still scrolls the real window, so position: sticky, anchors and Back all keep working.
 */
const QUERY = "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

export function SmoothScroll() {
  useEffect(() => {
    const media = window.matchMedia(QUERY);
    let lenis: Lenis | null = null;

    const apply = () => {
      if (media.matches && !lenis) {
        lenis = new Lenis({ autoRaf: true, lerp: 0.1, allowNestedScroll: true, stopInertiaOnNavigate: true });
        setLenis(lenis);
      } else if (!media.matches && lenis) {
        lenis.destroy();
        lenis = null;
        setLenis(null);
      }
    };

    apply();
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
      lenis?.destroy();
      setLenis(null);
    };
  }, []);

  return null;
}
