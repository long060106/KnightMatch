"use client";

import { Check, RotateCcw, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_FILTERS, activeFilterCount, shortCollege, type Filters } from "@/lib/filters";
import { cn } from "@/lib/utils";

export interface FacetOption {
  value: string;
  count: number;
}

interface FilterPanelProps {
  filters: Filters;
  onChange: (next: Filters) => void;
  colleges: FacetOption[];
  semesters: FacetOption[];
  beginnerCount: number;
}

const SEARCH_DELAY_MS = 250;

/** Typing updates the list after a short pause, so cards don't reshuffle on every key. */
function SearchField({ value, onCommit }: { value: string; onCommit: (q: string) => void }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    // The query changed elsewhere (e.g. a removed chip): show it.
    setLastValue(value);
    setDraft(value);
  }
  const commit = useRef(onCommit);
  useEffect(() => {
    commit.current = onCommit;
  });
  useEffect(() => {
    if (draft === value) return;
    const timer = window.setTimeout(() => commit.current(draft), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [draft, value]);

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Search</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id={id}
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Topic, skill or keyword"
          autoComplete="off"
          className="h-11 bg-card pl-9 text-base md:text-sm"
        />
      </div>
    </div>
  );
}

/**
 * A group of toggle chips. Chips wrap side by side, so the whole panel stays short enough to fit
 * the screen without a scrollbar of its own.
 */
function ChipGroup({
  legend,
  options,
  selected,
  format,
  onToggle,
}: {
  legend: string;
  options: FacetOption[];
  selected: string[];
  format?: (value: string) => string;
  onToggle: (value: string) => void;
}) {
  // Options with no projects under the current filters are hidden (unless already selected);
  // they come back when e.g. full teams are included.
  const visible = options.filter((o) => o.count > 0 || selected.includes(o.value));
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {visible.map((option) => {
          const on = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(option.value)}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1 text-left text-sm leading-snug transition-[background-color,border-color,color,transform] duration-[var(--dur-fast)] active:scale-[0.97] lg:min-h-9",
                on ? "border-transparent bg-honey-wash font-medium text-honey-ink" : "bg-card hover:border-border-strong",
              )}
            >
              {on && <Check className="size-3.5 shrink-0" aria-hidden="true" />}
              <span>{format ? format(option.value) : option.value}</span>
              <span className={cn("tabular-nums", on ? "text-honey-ink/80" : "text-muted-foreground")}>{option.count}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FilterPanel({ filters, onChange, colleges, semesters, beginnerCount }: FilterPanelProps) {
  const openId = useId();
  const beginnerId = useId();
  const active = activeFilterCount(filters) > 0;

  return (
    <div className="grid gap-5">
      <SearchField value={filters.q} onCommit={(q) => onChange({ ...filters, q })} />

      <div className="grid gap-1">
        <div className="flex min-h-11 items-center justify-between gap-3 lg:min-h-9">
          <Label htmlFor={openId} className="cursor-pointer text-sm font-normal">
            Open teams only
          </Label>
          <Switch id={openId} checked={filters.openOnly} onCheckedChange={(openOnly) => onChange({ ...filters, openOnly })} />
        </div>
        <div className="flex min-h-11 items-start gap-3 py-1 lg:min-h-9">
          <Checkbox
            id={beginnerId}
            className="mt-0.5"
            checked={filters.beginner}
            onCheckedChange={(checked) => onChange({ ...filters, beginner: checked === true })}
          />
          <Label htmlFor={beginnerId} className="flex flex-1 cursor-pointer flex-col items-start gap-0.5 text-sm font-normal">
            <span className="flex w-full justify-between gap-3">
              Beginner-friendly <span className="text-muted-foreground tabular-nums">{beginnerCount}</span>
            </span>
            <span className="text-xs text-muted-foreground">No experience required, or no specific skills listed</span>
          </Label>
        </div>
      </div>

      <ChipGroup
        legend="College"
        options={colleges}
        selected={filters.colleges}
        format={shortCollege}
        onToggle={(value) => onChange({ ...filters, colleges: toggle(filters.colleges, value) })}
      />
      <ChipGroup
        legend="Semester"
        options={semesters}
        selected={filters.semesters}
        onToggle={(value) => onChange({ ...filters, semesters: toggle(filters.semesters, value) })}
      />

      {active && (
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}
          className="inline-flex h-11 items-center gap-2 justify-self-start rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground active:scale-[0.97]"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}
