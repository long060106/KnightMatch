"use client";

import { Compass, LayoutList, ListChecks, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { HoverScramble } from "./hover-scramble";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ITEMS: NavItem[] = [
  { href: "/", label: "Projects", icon: LayoutList },
  { href: "/match", label: "Match me", icon: ListChecks },
  { href: "/other-places", label: "Other places", icon: Compass },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" || pathname.startsWith("/projects") : pathname.startsWith(href);
}

/** Header links from 768px up. */
export function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden md:block">
      <ul className="flex items-center gap-1">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "km-label inline-flex h-11 items-center gap-2 rounded-md px-3 transition-colors duration-[var(--dur-fast)]",
                  active ? "text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {/* The dot marks where you are (shape, not only color). */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 rounded-full bg-foreground transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)]",
                    active ? "scale-100" : "scale-0",
                  )}
                />
                <HoverScramble text={item.label} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Bottom tab bar below 768px: thumb-reachable, icon + label, safe-area aware. */
export function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-[var(--dur-fast)]",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-[var(--dur-fast)]",
                    active && "bg-honey-wash text-honey-ink",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
