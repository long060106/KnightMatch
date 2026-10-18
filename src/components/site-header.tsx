import Link from "next/link";
import { DrawRule } from "./draw-rule";
import { Logo } from "./logo";
import { HeaderNav } from "./main-nav";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="relative">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="-ml-1 rounded-md px-1 py-2" aria-label="KnightMatch home">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <HeaderNav />
          <ThemeToggle />
        </div>
      </div>
      <DrawRule className="absolute inset-x-0 bottom-0" />
    </header>
  );
}
