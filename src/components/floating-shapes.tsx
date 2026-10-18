"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type V3 = [number, number, number];
/** A shape is a list of polylines; each polyline is drawn as connected line segments. */
type Wire = V3[][];

const TAU = Math.PI * 2;

/** 8 corners, 12 edges. */
function cube(): Wire {
  const corners: V3[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) corners.push([x, y, z]);
  const lines: Wire = [];
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      const diff = corners[i].filter((v, k) => v !== corners[j][k]).length;
      if (diff === 1) lines.push([corners[i], corners[j]]);
    }
  }
  return lines;
}

/**
 * Elliptic paraboloid y = x²/a² + z²/b²: rings of the same height are ellipses, the spokes are
 * parabolas. Opens upward; centered so it spins around its own middle.
 */
function paraboloid(): Wire {
  const a = 1.15;
  const b = 0.7;
  const h = 1.5;
  const rings = 6;
  const spokes = 12;
  const steps = 48;
  const point = (r: number, theta: number): V3 => [a * r * Math.cos(theta), -(h * r * r - h / 2), b * r * Math.sin(theta)];
  const lines: Wire = [];
  for (let k = 1; k <= rings; k++) {
    const r = k / rings;
    lines.push(Array.from({ length: steps + 1 }, (_, i) => point(r, (i / steps) * TAU)));
  }
  for (let s = 0; s < spokes; s++) {
    const theta = (s / spokes) * TAU;
    lines.push(Array.from({ length: 13 }, (_, i) => point(i / 12, theta)));
  }
  return lines;
}

/** Latitude rings and meridians of a unit sphere, stretched to an ellipsoid when the radii differ. */
function sphere([rx, ry, rz]: V3 = [1, 1, 1]): Wire {
  const lines: Wire = [];
  const steps = 48;
  for (let k = 1; k <= 6; k++) {
    const phi = -Math.PI / 2 + (Math.PI * k) / 7;
    lines.push(
      Array.from({ length: steps + 1 }, (_, i): V3 => {
        const t = (i / steps) * TAU;
        return [rx * Math.cos(phi) * Math.cos(t), ry * Math.sin(phi), rz * Math.cos(phi) * Math.sin(t)];
      }),
    );
  }
  for (let m = 0; m < 8; m++) {
    const theta = (m / 8) * Math.PI;
    lines.push(
      Array.from({ length: steps + 1 }, (_, i): V3 => {
        const t = (i / steps) * TAU;
        return [rx * Math.cos(t) * Math.cos(theta), ry * Math.sin(t), rz * Math.cos(t) * Math.sin(theta)];
      }),
    );
  }
  return lines;
}

/**
 * Hyperbolic paraboloid (saddle) y = (x² − z²) / 2 over a square: both families of grid lines are
 * parabolas, one opening up and one opening down.
 */
function saddle(): Wire {
  const n = 8;
  const steps = 24;
  const point = (x: number, z: number): V3 => [x, (z * z - x * x) * 0.55, z];
  const lines: Wire = [];
  for (let k = 0; k <= n; k++) {
    const c = -1 + (2 * k) / n;
    lines.push(Array.from({ length: steps + 1 }, (_, i) => point(-1 + (2 * i) / steps, c)));
    lines.push(Array.from({ length: steps + 1 }, (_, i) => point(c, -1 + (2 * i) / steps)));
  }
  return lines;
}

/**
 * Hyperboloid of one sheet, drawn the way it is built: straight lines between a bottom and a top
 * ring, each twisted by the same angle (both families, so they cross in a lattice), plus the two
 * rings and the narrow waist.
 */
function hyperboloid(): Wire {
  const r = 0.8;
  const h = 1;
  const twist = Math.PI / 3;
  const rulings = 18;
  const steps = 48;
  const ring = (radius: number, y: number) =>
    Array.from({ length: steps + 1 }, (_, i): V3 => {
      const t = (i / steps) * TAU;
      return [radius * Math.cos(t), y, radius * Math.sin(t)];
    });
  const lines: Wire = [ring(r, -h), ring(r, h), ring(r * Math.cos(twist / 2), 0)];
  for (let k = 0; k < rulings; k++) {
    const t = (k / rulings) * TAU;
    for (const dir of [1, -1]) {
      lines.push([
        [r * Math.cos(t), -h, r * Math.sin(t)],
        [r * Math.cos(t + dir * twist), h, r * Math.sin(t + dir * twist)],
      ]);
    }
  }
  return lines;
}

interface Body {
  wire: Wire;
  /** Resting place as a fraction of the canvas: [wide screens, narrow screens]. Edges are fine:
   *  the shape is clamped to stay whole inside the canvas. */
  home: [[number, number], [number, number]];
  /** How far it wanders, as a fraction of the canvas. */
  wander: [number, number];
  /** Radians per second along its path, and where on the path it starts. */
  pace: number;
  phase: number;
  /** Radians per second around x, y and z. */
  spin: V3;
  /** Size relative to the shared unit. */
  size: number;
  /** How strongly it follows the pointer (nearer things move more). */
  depth: number;
}

export type ShapeSet = "about" | "projects" | "match" | "places";

/**
 * Each page gets its own few shapes. `unit` scales them all (page headers are shorter than the
 * About hero, so their shapes are smaller). On phones the page shapes sit in the top-right corner,
 * above the headline, and `narrowWander` keeps them from drifting down onto it.
 */
const SETS: Record<ShapeSet, { unit: number; narrowWander?: number; bodies: Body[] }> = {
  about: {
    unit: 1,
    bodies: [
      { wire: cube(), home: [[0.55, 0.26], [0.86, 0.1]], wander: [0.06, 0.08], pace: 0.21, phase: 0.4, spin: [0.31, 0.47, 0.12], size: 0.82, depth: 1 },
      { wire: paraboloid(), home: [[0.8, 0.5], [0.12, 0.58]], wander: [0.16, 0.2], pace: 0.17, phase: 2.2, spin: [0.08, 0.36, 0.05], size: 1.1, depth: 0.6 },
      { wire: sphere(), home: [[0.67, 0.86], [0.86, 0.5]], wander: [0.07, 0.05], pace: 0.13, phase: 4.1, spin: [0.1, 0.28, 0.07], size: 1, depth: 1.4 },
    ],
  },
  projects: {
    unit: 0.72,
    narrowWander: 0.2,
    bodies: [
      { wire: saddle(), home: [[0.76, 0.42], [0.92, 0]], wander: [0.05, 0.1], pace: 0.15, phase: 1.1, spin: [0.12, 0.33, 0.04], size: 1, depth: 0.8 },
      { wire: sphere(), home: [[0.93, 0.7], [0.76, 0]], wander: [0.03, 0.08], pace: 0.12, phase: 3.6, spin: [0.1, 0.26, 0.06], size: 0.6, depth: 1.3 },
    ],
  },
  match: {
    unit: 0.72,
    narrowWander: 0.2,
    bodies: [
      { wire: paraboloid(), home: [[0.78, 0.45], [0.92, 0]], wander: [0.05, 0.1], pace: 0.16, phase: 2.6, spin: [0.09, 0.34, 0.05], size: 1, depth: 0.8 },
      { wire: sphere([1.35, 0.75, 0.9]), home: [[0.94, 0.78], [0.76, 0]], wander: [0.03, 0.07], pace: 0.13, phase: 0.8, spin: [0.14, 0.29, 0.09], size: 0.62, depth: 1.3 },
    ],
  },
  places: {
    unit: 0.72,
    narrowWander: 0.2,
    bodies: [
      { wire: hyperboloid(), home: [[0.8, 0.42], [0.92, 0]], wander: [0.05, 0.1], pace: 0.14, phase: 1.9, spin: [0.11, 0.3, 0.05], size: 1, depth: 0.8 },
      { wire: sphere([1.3, 0.8, 0.8]), home: [[0.95, 0.74], [0.76, 0]], wander: [0.03, 0.07], pace: 0.12, phase: 4.4, spin: [0.13, 0.27, 0.08], size: 0.55, depth: 1.3 },
    ],
  },
};

const FOCAL = 4;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const BUCKETS = 4;

/**
 * A few math surfaces (cube, paraboloids, sphere, ellipsoid, saddle, hyperboloid; which ones depends
 * on `set`) drawn as hairlines that turn slowly and drift around the page, a little with the pointer. Canvas 2D with a hand-made perspective projection, so it
 * adds no library. Lines on the far side of each shape are fainter, which is what makes them read
 * as solid. Ink color only (follows light/dark), decorative (aria-hidden).
 * It stops while off screen or in a background tab; reduced motion draws one still frame.
 */
export function FloatingShapes({ className, set = "about" }: { className?: string; set?: ShapeSet }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let width = 0;
    let height = 0;
    let ink = getComputedStyle(canvas).color;
    let frame = 0;
    let onScreen = true;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      const narrow = width < 768;
      const { unit: unitScale, narrowWander = 1, bodies } = SETS[set];
      const wanderScale = narrow ? narrowWander : 1;
      const unit = Math.min(Math.max(width * 0.085, 36), 118) * unitScale;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      ctx.lineJoin = "round";

      for (const body of bodies) {
        const [hx, hy] = body.home[narrow ? 1 : 0];
        const a = t * body.pace + body.phase;
        const scale = unit * body.size;
        // Keep the whole shape inside the canvas (its farthest corner is about 1.5 units out), so
        // nothing is ever cut off by the edge of the section.
        const reach = Math.min(scale * 1.5, width / 2, height / 2);
        const cx = clamp(width * (hx + body.wander[0] * wanderScale * Math.sin(a)) + pointer.x * 22 * body.depth, reach, width - reach);
        const cy = clamp(height * (hy + body.wander[1] * wanderScale * Math.cos(a * 0.8 + 1)) + pointer.y * 16 * body.depth, reach, height - reach);
        const [sx, sy, sz] = body.spin;
        const cosX = Math.cos(t * sx + body.phase);
        const sinX = Math.sin(t * sx + body.phase);
        const cosY = Math.cos(t * sy);
        const sinY = Math.sin(t * sy);
        const cosZ = Math.cos(t * sz);
        const sinZ = Math.sin(t * sz);

        // Each segment goes into one of a few brightness buckets by depth, so a shape costs a
        // handful of stroke() calls instead of one per segment.
        const buckets: number[][] = Array.from({ length: BUCKETS }, () => []);
        for (const line of body.wire) {
          let prev: V3 | null = null;
          for (const [x0, y0, z0] of line) {
            const y1 = y0 * cosX - z0 * sinX;
            const z1 = y0 * sinX + z0 * cosX;
            const x2 = x0 * cosY + z1 * sinY;
            const z2 = -x0 * sinY + z1 * cosY;
            const x3 = x2 * cosZ - y1 * sinZ;
            const y3 = x2 * sinZ + y1 * cosZ;
            const p = FOCAL / (FOCAL + z2);
            const px = cx + x3 * scale * p;
            const py = cy + y3 * scale * p;
            if (prev) {
              // z grows away from the viewer: bucket 0 is the nearest (brightest) quarter of depth.
              const far = Math.min(Math.max((prev[2] + z2) / 2 / 1.6 + 0.5, 0), 1);
              buckets[Math.min(Math.floor(far * BUCKETS), BUCKETS - 1)].push(prev[0], prev[1], px, py);
            }
            prev = [px, py, z2];
          }
        }
        buckets.forEach((segments, i) => {
          if (!segments.length) return;
          // 0.5 near … 0.1 far; fainter on phones, where the shapes sit behind the text.
          ctx.globalAlpha = (0.5 - (i * 0.4) / (BUCKETS - 1)) * (narrow ? 0.6 : 1);
          ctx.beginPath();
          for (let k = 0; k < segments.length; k += 4) {
            ctx.moveTo(segments[k], segments[k + 1]);
            ctx.lineTo(segments[k + 2], segments[k + 3]);
          }
          ctx.stroke();
        });
      }
      ctx.globalAlpha = 1;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) draw(2.5);
    };

    const start = performance.now();
    const schedule = () => {
      if (!frame && onScreen && !document.hidden && !reduced) frame = requestAnimationFrame(tick);
    };
    const tick = (now: number) => {
      frame = 0;
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      draw((now - start) / 1000 + 2.5);
      schedule();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) schedule();
      else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    visibility.observe(canvas);
    const onVisibility = () => schedule();
    const onMove = (event: PointerEvent) => {
      pointer.tx = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    // Light/dark switches change the ink color; pick it up without polling.
    const theme = new MutationObserver(() => {
      ink = getComputedStyle(canvas).color;
      if (reduced) draw(2.5);
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("visibilitychange", onVisibility);
    if (finePointer && !reduced) window.addEventListener("pointermove", onMove, { passive: true });

    resize();
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibility.disconnect();
      theme.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onMove);
    };
  }, [set]);

  return <canvas ref={canvasRef} aria-hidden="true" className={cn("block size-full text-foreground", className)} />;
}
