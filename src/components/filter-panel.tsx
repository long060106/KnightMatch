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
  topics: FacetOption[];
  topicLabels: Record<string, string>;
  colleges: FacetOption[];
  semesters: FacetOption[];
  beginnerCount: number;
}

const SEARCH_DELAY_MS = 250;
const TOPICS_SHOWN = 6;

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
      <Label htmlFor={id} className="km-label text-muted-foreground">
        Search
      </Label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id={id}
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Topic, skill or keyword"
          autoComplete="off"
          className="h-11 bg-background pl-9 text-base md:text-sm"
        />
      </div>
    </div>
  );
}

/**
 * A group of toggles drawn as a ruled list: square marker, label, count. Hairlines instead of
 * pills; a filled honey square means the filter is on (shape, not only color).
 */
function ChipGroup({
  legend,
  options,
  selected,
  format,
  onToggle,
  limit,
}: {
  legend: string;
  options: FacetOption[];
  selected: string[];
  format?: (value: string) => string;
  onToggle: (value: string) => void;
  /** Show only the first `limit` options (plus any selected ones) until "Show all" is pressed. */
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  // Options with no projects under the current filters are hidden (unless already selected);
  // they come back when e.g. full teams are included.
  const visible = options.filter((o) => o.count > 0 || selected.includes(o.value));
  if (!visible.length) return null;
  const collapsible = limit !== undefined && visible.length > limit + 1;
  const shown =
    collapsible && !expanded ? visible.filter((o, i) => i < limit || selected.includes(o.value)) : visible;
  return (
    <fieldset>
      <legend className="km-label mb-2 text-muted-foreground">{legend}</legend>
      <ul className="border-t">
        {shown.map((option) => {
          const on = selected.includes(option.value);
          return (
            <li key={option.value}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(option.value)}
                className={cn(
                  "group flex min-h-11 w-full items-center gap-3 border-b py-2 text-left text-sm leading-snug transition-colors duration-[var(--dur-fast)] lg:min-h-9",
                  on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-3 shrink-0 items-center justify-center border transition-colors duration-[var(--dur-fast)]",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border-strong group-hover:border-foreground",
                  )}
                >
                  {on && <Check className="size-2.5" strokeWidth={3} />}
                </span>
                <span className="flex-1">{format ? format(option.value) : option.value}</span>
                <span className="font-mono text-xs tabular-nums">{String(option.count).padStart(2, "0")}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {collapsible && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="km-label mt-1 inline-flex min-h-11 items-center text-muted-foreground underline decoration-border-strong underline-offset-[6px] hover:text-foreground hover:decoration-foreground lg:min-h-9"
        >
          {expanded ? "Show fewer" : `Show all ${visible.length}`}
        </button>
      )}
    </fieldset>
  );
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FilterPanel({ filters, onChange, topics, topicLabels, colleges, semesters, beginnerCount }: FilterPanelProps) {
  const openId = useId();
  const beginnerId = useId();
  const active = activeFilterCount(filters) > 0;

  return (
    <div className="grid gap-6">
      <SearchField value={filters.q} onCommit={(q) => onChange({ ...filters, q })} />

      <div className="grid border-y">
        <div className="flex min-h-11 items-center justify-between gap-3 border-b lg:min-h-10">
          <Label htmlFor={openId} className="cursor-pointer text-sm font-normal">
            Open teams only
          </Label>
          <Switch id={openId} checked={filters.openOnly} onCheckedChange={(openOnly) => onChange({ ...filters, openOnly })} />
        </div>
        <div className="flex min-h-11 items-start gap-3 py-2.5 lg:min-h-10">
          <Checkbox
            id={beginnerId}
            className="mt-0.5"
            checked={filters.beginner}
            onCheckedChange={(checked) => onChange({ ...filters, beginner: checked === true })}
          />
          <Label htmlFor={beginnerId} className="flex flex-1 cursor-pointer flex-col items-start gap-0.5 text-sm font-normal">
            <span className="flex w-full justify-between gap-3">
              Beginner-friendly <span className="font-mono text-xs text-muted-foreground tabular-nums">{String(beginnerCount).padStart(2, "0")}</span>
            </span>
            <span className="text-xs text-muted-foreground">No experience required, or no specific skills listed</span>
          </Label>
        </div>
      </div>

      <ChipGroup
        legend="Topic"
        options={topics}
        selected={filters.topics}
        format={(id) => topicLabels[id] ?? id}
        onToggle={(value) => onChange({ ...filters, topics: toggle(filters.topics, value) })}
        limit={TOPICS_SHOWN}
      />
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
          className="km-label inline-flex h-11 items-center gap-2 justify-self-start text-muted-foreground hover:text-foreground active:scale-[0.97]"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}
