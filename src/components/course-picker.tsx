"use client";

import { Command as CommandPrimitive } from "cmdk";
import { Search, X } from "lucide-react";
import { useState } from "react";
import { courseFilter } from "@/lib/course-search";
import type { Course, SkillMap } from "@/lib/types";

interface CoursePickerProps {
  courses: Course[];
  skills: SkillMap;
  selected: string[];
  onAdd: (code: string) => void;
  onRemove: (code: string) => void;
}

/** Search the mapped UCF courses by code or name (cmdk handles the keyboard and ARIA combobox). */
export function CoursePicker({ courses, skills, selected, onAdd, onRemove }: CoursePickerProps) {
  const [query, setQuery] = useState("");
  const titleOf = new Map(courses.map((c) => [c.code, c.title]));

  return (
    <div className="grid gap-3">
      <p className="text-sm font-semibold" aria-hidden="true">
        UCF courses you&apos;ve finished
      </p>
      <CommandPrimitive label="UCF courses you've finished" filter={courseFilter} className="grid gap-1">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <CommandPrimitive.Input
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder="Code or name, e.g. COP3502C"
            className="h-11 w-full rounded-md border border-input bg-card pr-3 pl-9 text-base outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:text-sm"
          />
        </div>
        {query.trim() && (
          <CommandPrimitive.List data-lenis-prevent className="max-h-72 overflow-y-auto overscroll-contain rounded-md border bg-popover p-1">
            <CommandPrimitive.Empty className="px-3 py-4 text-sm text-muted-foreground">
              No mapped course matches “{query.trim()}”. You can still tick its skills below.
            </CommandPrimitive.Empty>
            {courses.map((course) => {
              const taken = selected.includes(course.code);
              return (
                <CommandPrimitive.Item
                  key={course.code}
                  value={`${course.code} ${course.title}`}
                  disabled={taken}
                  onSelect={() => {
                    onAdd(course.code);
                    setQuery("");
                  }}
                  className="grid min-h-11 cursor-pointer grid-cols-[auto_1fr] items-center gap-x-3 rounded-sm px-2 py-1.5 text-sm data-[disabled=true]:cursor-default data-[disabled=true]:opacity-50 data-[selected=true]:bg-muted"
                >
                  <span className="font-mono text-xs">{course.code}</span>
                  <span>
                    {course.title}
                    {taken && <span className="text-muted-foreground"> (added)</span>}
                  </span>
                  <span className="col-start-2 text-xs text-muted-foreground">
                    Counts as {course.skills.map((id) => skills[id]?.label ?? id).join(", ")}
                  </span>
                </CommandPrimitive.Item>
              );
            })}
          </CommandPrimitive.List>
        )}
      </CommandPrimitive>

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Courses you added">
          {selected.map((code) => (
            <li key={code}>
              <button
                type="button"
                onClick={() => onRemove(code)}
                title={titleOf.get(code)}
                aria-label={`Remove ${code}${titleOf.get(code) ? `, ${titleOf.get(code)}` : ""}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-card pr-2.5 pl-3 transition-colors duration-[var(--dur-fast)] hover:border-border-strong active:scale-[0.97] lg:min-h-9"
              >
                <span className="font-mono text-xs">{code}</span>
                <X className="size-3.5 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        {courses.length} common UCF courses mapped so far. Missing one? Tick its skills below.
      </p>
    </div>
  );
}
