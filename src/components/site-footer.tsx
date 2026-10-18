import { ArrowUpRight } from "lucide-react";
import { DrawRule } from "./draw-rule";

export function SiteFooter() {
  return (
    <footer>
      <DrawRule />
      <div className="mx-auto grid max-w-[1200px] gap-2 px-4 py-8 text-sm text-muted-foreground md:px-6">
        <p className="font-medium text-foreground">Not affiliated with UCF.</p>
        <p className="max-w-[70ch]">
          KnightMatch is a student-built tool. Project details come from the public{" "}
          <a
            href="https://knight.research.ucf.edu/project-list/"
            className="km-link inline-flex items-center gap-0.5 font-medium text-foreground"
          >
            Knight Research Scholars Program list
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>{" "}
          and are re-checked every day. The original listing is always the source of truth.
        </p>
      </div>
    </footer>
  );
}
