/**
 * Students type codes many ways: "COP3502C", "cop 3502", "cop3502". Compare without spaces and
 * require every typed word, so both codes and course names ("computer science") work.
 * Returns 1 (show) or 0 (hide), the shape cmdk's `filter` prop expects.
 */
export function courseFilter(value: string, search: string): number {
  const lower = value.toLowerCase();
  const haystack = `${lower} ${lower.replace(/\s+/g, "")}`;
  const words = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 1;
  return words.every((w) => haystack.includes(w)) || haystack.includes(words.join("")) ? 1 : 0;
}
