import { cn } from "@/lib/utils";

/**
 * The chess knight (not a UCF mark). The PNG is only a mask: the shape is painted in the current
 * text color, so it turns white in dark mode and ink in light mode with no second file.
 */
export function KnightMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-8 bg-current [mask:url(/knight-mark.png)_center/contain_no-repeat] [-webkit-mask:url(/knight-mark.png)_center/contain_no-repeat]",
        className,
      )}
    />
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
