/**
 * Open spots as a share of the team: "8 / 20". KRSP's open spots are always team size minus the
 * members already on it, so the fraction says how much room is left. Three bands:
 * ≥ 70% open = plenty of room (green), 30–70% = filling up (yellow), < 30% = nearly full (red).
 */
export type SpotsLevel = "high" | "mid" | "low";

export function spotsLevel(open: number, teamSize: number): SpotsLevel {
  const share = teamSize > 0 ? open / teamSize : 0;
  if (share >= 0.7) return "high";
  if (share >= 0.3) return "mid";
  return "low";
}

/** Short words for each band, for screen readers and the legend. */
export const SPOTS_LEVEL_LABEL: Record<SpotsLevel, string> = {
  high: "plenty of room",
  mid: "filling up",
  low: "nearly full",
};

/** "8 / 20" with thin spaces, or just "8" when the team size is unknown. */
export function spotsFraction(open: number, teamSize: number | null): string {
  return teamSize ? `${open} / ${teamSize}` : String(open);
}
