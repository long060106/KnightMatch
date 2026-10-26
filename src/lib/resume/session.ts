/**
 * The last resume text read in this tab, kept in memory only (never in localStorage), so the email
 * coach can reuse a resume picked on Match me without asking for the file again. It is gone after a
 * reload or when the tab closes.
 */

let lastText: string | null = null;

export function rememberResume(text: string): void {
  lastText = text.trim() || null;
}

export function rememberedResume(): string | null {
  return lastText;
}

export function forgetResume(): void {
  lastText = null;
}
