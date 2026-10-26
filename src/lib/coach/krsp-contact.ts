/**
 * The team leader's email, read from the live KRSP project page when a student asks for it.
 * It is never written to data/ or the repo (see scraper/knightmatch_scraper/privacy.py): KRSP stays
 * the source, and a leader who changes or removes their address is reflected right away.
 */

export const KRSP_PROJECT_PREFIX = "https://knight.research.ucf.edu/krsp-project/";

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/** The first email in the "Team Leader" row of a KRSP project page, or null. */
export function leaderEmailFrom(html: string): string | null {
  const rows = html.split(/<div[^>]*class="[^"]*\bproject-record-row\b[^"]*"[^>]*>/i).slice(1);
  const leaderRow = rows.find((row) => {
    const dt = row.match(/<dt[^>]*>([\s\S]*?)<\/dt>/i);
    return dt && /^team leaders?$/i.test(dt[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
  });
  if (!leaderRow) return null;
  const block = leaderRow.match(/class="[^"]*\bproject-person-email\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
  if (!block) return null;
  const href = block[1].match(/href="mailto:([^"?]+)/i)?.[1];
  const shown = block[1].replace(/<[^>]+>/g, "").trim();
  const email = decodeURIComponent(href ?? shown).trim();
  return EMAIL.test(email) ? email : null;
}
