import { cn } from "@/lib/utils";

/** A chess knight, drawn for KnightMatch (not a UCF mark). The honey base is the one gold touch. */
export function KnightMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-6", className)}>
      <path
        d="M7.6 18.6 8.7 14c-.9.3-2.4.3-3.1-.6L4.7 11.7l3.5-5 .7-2.5 1.9 1.4c4.5 0 7.1 3.6 6.8 8.2l-.6 4.8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="9.4" cy="8.7" r="0.85" fill="currentColor" />
      <rect x="5.6" y="19.2" width="12.8" height="2.4" rx="1.2" fill="var(--honey)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <KnightMark />
      <span className="font-serif text-2xl leading-none">KnightMatch</span>
    </span>
  );
}
