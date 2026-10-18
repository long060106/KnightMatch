"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import type { SkillInfo, SkillMap } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface SkillGroup {
  id: string;
  label: string;
  skillIds: string[];
}

interface SkillPickerProps {
  skills: SkillMap;
  groups: SkillGroup[];
  popular: string[];
  /** Skills the student ticked. */
  selected: Set<string>;
  /** Skills the student has through a course or a more specific skill, with the reason. */
  impliedBy: Map<string, string>;
  onToggle: (id: string) => void;
}

const MAX_SEARCH_RESULTS = 30;

function SkillChip({
  skill,
  on,
  via,
  onToggle,
}: {
  skill: SkillInfo;
  on: boolean;
  via?: string;
  onToggle: (id: string) => void;
}) {
  const implied = !on && via !== undefined;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onToggle(skill.id)}
      title={implied ? `Included through ${via}` : undefined}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-none border px-3 text-sm transition-[background-color,border-color,color,transform] duration-[var(--dur-fast)] active:scale-[0.97] lg:min-h-9",
        on && "border-transparent bg-honey-wash font-medium text-honey-ink",
        implied && "border-dashed border-meter-on bg-card text-honey-ink",
        !on && !implied && "border-input bg-card hover:border-foreground",
      )}
    >
      {(on || implied) && <Check className="size-3.5" aria-hidden="true" />}
      {skill.label}
      {implied && <span className="sr-only"> (included through {via})</span>}
    </button>
  );
}

export function SkillPicker({ skills, groups, popular, selected, impliedBy, onToggle }: SkillPickerProps) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [seeded, setSeeded] = useState(false);
  if (!seeded && selected.size > 0) {
    // When a saved profile loads, open the groups that already have something ticked.
    setSeeded(true);
    setOpen(new Set(groups.filter((g) => g.skillIds.some((id) => selected.has(id))).map((g) => g.id)));
  }

  const chip = (id: string) => (
    <SkillChip key={id} skill={skills[id]} on={selected.has(id)} via={impliedBy.get(id)} onToggle={onToggle} />
  );

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const found = words.length
    ? groups
        .flatMap((g) => g.skillIds)
        .filter((id) => words.every((w) => skills[id].label.toLowerCase().includes(w)))
        .slice(0, MAX_SEARCH_RESULTS)
    : [];

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <label htmlFor={searchId} className="text-sm font-semibold">
          Skills you have
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a skill, e.g. Python or wet lab"
            autoComplete="off"
            className="h-11 bg-card pl-9 text-base md:text-sm"
          />
        </div>
      </div>

      {words.length > 0 ? (
        found.length > 0 ? (
          <div className="flex flex-wrap gap-2">{found.map(chip)}</div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No skill called “{query.trim()}” yet. Try a broader word, like “lab”, “data” or “design”.
          </p>
        )
      ) : (
        <>
          <div className="grid gap-2">
            <p className="text-sm text-muted-foreground">Most asked for right now</p>
            <div className="flex flex-wrap gap-2">{popular.map(chip)}</div>
          </div>
          <div className="grid divide-y border-y">
            {groups.map((group) => {
              const count = group.skillIds.filter((id) => selected.has(id)).length;
              return (
                <details
                  key={group.id}
                  open={open.has(group.id)}
                  onToggle={(e) => {
                    const isOpen = e.currentTarget.open;
                    setOpen((prev) => {
                      if (prev.has(group.id) === isOpen) return prev;
                      const next = new Set(prev);
                      if (isOpen) next.add(group.id);
                      else next.delete(group.id);
                      return next;
                    });
                  }}
                  className="group"
                >
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    <span>
                      {group.label}
                      {count > 0 && <span className="ml-2 font-normal text-honey-ink">{count} added</span>}
                    </span>
                    <ChevronDown
                      className="size-4 text-muted-foreground transition-transform duration-[var(--dur-base)] group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="flex flex-wrap gap-2 pt-1 pb-4">{group.skillIds.map(chip)}</div>
                </details>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
