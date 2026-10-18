"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/** Both icons render; CSS shows the right one, so there is no flash or hydration mismatch. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Switch between light and dark mode"
      className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors duration-[var(--dur-fast)] hover:bg-accent hover:text-foreground active:scale-[0.97]"
    >
      <Sun className="size-5 dark:hidden" aria-hidden="true" />
      <Moon className="hidden size-5 dark:block" aria-hidden="true" />
    </button>
  );
}
