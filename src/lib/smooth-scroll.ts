import type Lenis from "lenis";

/** The active Lenis instance, or null on phones / reduced motion (native scrolling). */
let current: Lenis | null = null;

export function setLenis(lenis: Lenis | null): void {
  current = lenis;
}

/** Scroll to an element smoothly when Lenis is on, natively otherwise, then move focus there. */
export function scrollToElement(target: HTMLElement, offset = -16): void {
  if (current) {
    current.scrollTo(target, { offset });
  } else {
    const top = target.getBoundingClientRect().top + window.scrollY + offset;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  }
  target.focus({ preventScroll: true });
}
