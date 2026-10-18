import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface WireSphereProps {
  className?: string;
  /** Lines of longitude; they turn around the vertical axis. */
  meridians?: number;
  /** Lines of latitude, drawn as flat ellipses so the sphere reads as seen from slightly above. */
  parallels?: number;
  /** Seconds for one half turn (a meridian going from facing you to facing away). */
  seconds?: number;
}

const R = 96;

/**
 * A wireframe globe in hairlines that slowly spins. Pure SVG + CSS, so it runs from the prerendered
 * HTML: each meridian is a circle squashed with scaleX, and the scale swings 1 → -1 → 1 with an
 * ease-in-out curve, which is close enough to cos(angle) to read as rotation. Meridians are offset
 * along that cycle. Ink color only (currentColor), decorative (aria-hidden).
 * Reduced motion: it holds still at the same spread of angles.
 */
export function WireSphere({ className, meridians = 9, parallels = 7, seconds = 14 }: WireSphereProps) {
  const lats = Array.from({ length: parallels }, (_, i) => -90 + (180 / (parallels + 1)) * (i + 1));
  return (
    <svg
      viewBox="-100 -100 200 200"
      aria-hidden="true"
      className={cn("km-sphere overflow-visible", className)}
      style={{ "--spin": `${seconds * 2}s` } as CSSProperties}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke">
        {lats.map((lat) => {
          const phi = (lat * Math.PI) / 180;
          const rx = R * Math.cos(phi);
          return (
            <ellipse
              key={lat}
              cx="0"
              cy={(-R * Math.sin(phi)).toFixed(2)}
              rx={rx.toFixed(2)}
              ry={(rx * 0.22).toFixed(2)}
              vectorEffect="non-scaling-stroke"
              className="km-sphere-lat"
            />
          );
        })}
        {Array.from({ length: meridians }, (_, k) => {
          // Spread over half a turn: a meridian at θ and θ + 180° are the same circle.
          const theta = (k / meridians) * Math.PI;
          return (
            <circle
              key={k}
              r={R}
              vectorEffect="non-scaling-stroke"
              className="km-sphere-meridian"
              style={
                {
                  transform: `scaleX(${Math.cos(theta).toFixed(4)})`,
                  "--k": k / meridians,
                } as CSSProperties
              }
            />
          );
        })}
        <circle r={R} vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}
