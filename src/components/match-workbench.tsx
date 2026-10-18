"use client";

import { ArrowDown, RotateCcw } from "lucide-react";
import Link from "next/link";
import { ViewTransition, addTransitionType, startTransition, useEffect, useMemo, useState } from "react";
import { isNewThisWeek } from "@/lib/filters";
import { compareMatches, matchProject, matchRatio, profileSkills } from "@/lib/match";
import { saveProfile, useProfile } from "@/lib/profile-store";
import { scrollToElement } from "@/lib/smooth-scroll";
import { useNow } from "@/lib/time";
import type { Course, ListingProject, Profile, SkillMap } from "@/lib/types";
import { useOnScreen } from "@/lib/use-in-view";
import { CoursePicker } from "./course-picker";
import { DrawRule } from "./draw-rule";
import { ProjectCard } from "./project-card";
import type { ResumePicks } from "./resume-review";
import { ResumeUpload } from "./resume-upload";
import { Scramble } from "./scramble";
import { SkillPicker, type SkillGroup } from "./skill-picker";
import { StickyPanel } from "./sticky-panel";

interface WorkbenchProps {
  projects: ListingProject[];
  skills: SkillMap;
  groups: SkillGroup[];
  popular: string[];
  courses: Course[];
  courseSkills: Record<string, string[]>;
  baselineAt: string;
}

const EMPTY: Profile = { skills: [], courses: [], updatedAt: "" };
const UNDO_MS = 6000;

/** The last bulk change, kept for a few seconds so it can be undone. */
interface UndoState {
  previous: Profile;
  message: string;
  /** Where the change was made, so the Undo shows up next to it. */
  from: "clear" | "resume";
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Why a skill counts as "have" without being ticked: a course, or a more specific skill. */
function reasons(profile: Profile, courseSkills: Record<string, string[]>, skills: SkillMap): Map<string, string> {
  const via = new Map<string, string>();
  for (const code of profile.courses) {
    for (const id of courseSkills[code] ?? []) {
      if (!via.has(id)) via.set(id, code);
      const parent = skills[id]?.parent;
      if (parent && !via.has(parent)) via.set(parent, code);
    }
  }
  for (const id of profile.skills) {
    const parent = skills[id]?.parent;
    if (parent && !via.has(parent)) via.set(parent, skills[id].label);
  }
  return via;
}

export function MatchWorkbench({ projects, skills, groups, popular, courses, courseSkills, baselineAt }: WorkbenchProps) {
  const stored = useProfile();
  const [edits, setEdits] = useState<Profile | null>(null);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const profile = edits ?? stored ?? EMPTY;
  const now = useNow();

  // Save after React has shown the change, so the cards glide first and storage follows.
  useEffect(() => {
    if (edits) saveProfile(edits);
  }, [edits]);

  useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(() => setUndo(null), UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [undo]);

  function change(next: Omit<Profile, "updatedAt">) {
    startTransition(() => {
      addTransitionType("filter"); // same glide as the Projects page filters
      setEdits({ ...next, updatedAt: new Date().toISOString() });
    });
  }

  function addFromResume(picks: ResumePicks) {
    const courses = picks.courses.filter((code) => !profile.courses.includes(code));
    const skills = picks.skills.filter((id) => !profile.skills.includes(id));
    const added = courses.length + skills.length;
    if (added === 0) return;
    setUndo({ previous: profile, message: `Added ${added} from your resume`, from: "resume" });
    change({ ...profile, courses: [...profile.courses, ...courses], skills: [...profile.skills, ...skills] });
  }

  const undoLine = (state: UndoState) => (
    <div className="flex min-h-11 flex-wrap items-center gap-x-2 text-sm">
      <span className="text-muted-foreground">{state.message}</span>
      <span className="text-muted-foreground" aria-hidden="true">
        ·
      </span>
      <button
        type="button"
        onClick={() => {
          change(state.previous);
          setUndo(null);
        }}
        className="inline-flex min-h-11 items-center font-medium underline underline-offset-4 hover:text-honey-ink"
      >
        Undo
      </button>
    </div>
  );

  const hasProfile = profile.skills.length > 0 || profile.courses.length > 0;
  const have = useMemo(() => profileSkills(profile, courseSkills, skills), [profile, courseSkills, skills]);
  const via = useMemo(() => reasons(profile, courseSkills, skills), [profile, courseSkills, skills]);
  const selected = useMemo(() => new Set(profile.skills), [profile.skills]);

  const ranked = useMemo(() => {
    const rows = projects.map((p) => ({
      project: p,
      result: matchProject(p.requiredSkills, p.preferredSkills, have, skills),
    }));
    if (!hasProfile) return rows;
    return rows.sort((a, b) =>
      compareMatches(
        { result: a.result, firstSeenAt: a.project.firstSeenAt },
        { result: b.result, firstSeenAt: b.project.firstSeenAt },
      ),
    );
  }, [projects, have, skills, hasProfile]);

  const full = ranked.filter((r) => r.result.total > 0 && matchRatio(r.result) === 1).length;
  const partial = ranked.filter((r) => r.result.met.length > 0 && matchRatio(r.result) < 1).length;
  const noSkillsListed = ranked.filter((r) => r.result.total === 0).length;
  const doors = full + partial + noSkillsListed;

  const [resultsRef, resultsOnScreen] = useOnScreen<HTMLElement>("0px 0px -40% 0px");

  return (
    <>
      <div className="grid gap-10 py-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-12">
        <section aria-labelledby="profile-heading">
          <StickyPanel className="grid gap-8 lg:pb-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="profile-heading" className="text-sm font-medium text-muted-foreground">
                <Scramble text="Your profile" />
              </h2>
              <p className="text-xs text-muted-foreground">Saved in this browser only</p>
            </div>

            <ResumeUpload
              profile={profile}
              skills={skills}
              courses={courses}
              onAdd={addFromResume}
              undo={undo?.from === "resume" ? undoLine(undo) : null}
            />

            <CoursePicker
              courses={courses}
              skills={skills}
              selected={profile.courses}
              onAdd={(code) => change({ ...profile, courses: [...profile.courses, code] })}
              onRemove={(code) => change({ ...profile, courses: profile.courses.filter((c) => c !== code) })}
            />

            <SkillPicker
              skills={skills}
              groups={groups}
              popular={popular}
              selected={selected}
              impliedBy={via}
              onToggle={(id) => change({ ...profile, skills: toggle(profile.skills, id) })}
            />

            {(hasProfile || undo?.from === "clear") && (
              <div className="flex min-h-11 flex-wrap items-center gap-3 text-sm" aria-live="polite">
                {undo?.from === "clear" ? (
                  undoLine(undo)
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setUndo({ previous: profile, message: "Cleared your profile", from: "clear" });
                      change(EMPTY);
                    }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 font-medium text-muted-foreground hover:bg-accent hover:text-foreground active:scale-[0.97]"
                  >
                    <RotateCcw className="size-4" aria-hidden="true" />
                    Clear my profile
                  </button>
                )}
              </div>
            )}
          </StickyPanel>
        </section>

        <section
          ref={resultsRef}
          id="matches"
          tabIndex={-1}
          aria-labelledby="matches-heading"
          className="scroll-mt-4 outline-none"
        >
          <h2 id="matches-heading" className="text-sm font-medium text-muted-foreground">
            <Scramble text="Your matches" />
          </h2>
          <DrawRule className="mt-3" />
          <div aria-live="polite" className="mt-4 grid gap-1">
            {hasProfile ? (
              <>
                <p className="font-serif text-2xl leading-snug">
                  {full > 0
                    ? `You meet every listed requirement for ${full} ${full === 1 ? "project" : "projects"}.`
                    : partial > 0
                      ? `You're partway there on ${partial} ${partial === 1 ? "project" : "projects"}.`
                      : "Every team below is still worth a look."}
                </p>
                <p className="text-muted-foreground">
                  {full > 0 && partial > 0 && `${partial} more ${partial === 1 ? "is" : "are"} partway there. `}
                  {noSkillsListed > 0 &&
                    `${noSkillsListed} ${noSkillsListed === 1 ? "team lists" : "teams list"} no specific skills, so anyone can reach out. `}
                  <span className="text-foreground">Many teams still take students who are eager to learn. Reach out.</span>
                </p>
              </>
            ) : (
              <>
                <p className="font-serif text-2xl leading-snug">Add a course or a skill to see your matches.</p>
                <p className="text-muted-foreground">
                  Until then, here are all {projects.length} open projects, newest first.
                </p>
              </>
            )}
          </div>

          <ul className="mt-6 border-b">
            {ranked.map(({ project, result }, i) => (
              <ViewTransition
                key={project.id}
                name={`card-${project.id}`}
                update={{ filter: "card-move", default: "none" }}
                default="none"
              >
                <li>
                  <ProjectCard
                    project={project}
                    skills={skills}
                    have={hasProfile ? have : null}
                    match={hasProfile ? result : null}
                    isNew={now !== null && isNewThisWeek(project.firstSeenAt, baselineAt, now)}
                    index={i}
                  />
                </li>
              </ViewTransition>
            ))}
          </ul>
          <p className="mt-6 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            Looking for full teams too?
            <Link
              href="/?full=1"
              className="inline-flex min-h-11 items-center font-medium text-foreground underline underline-offset-4 hover:text-honey-ink"
            >
              Browse every project
            </Link>
          </p>
        </section>
      </div>

      {/* Phones: the list sits below a long form, so offer a shortcut until it is on screen. */}
      {hasProfile && !resultsOnScreen && (
        <div className="fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 lg:hidden">
          <button
            type="button"
            onClick={() => {
              const target = document.getElementById("matches");
              if (target) scrollToElement(target);
            }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-base font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_rgb(0_0_0/0.35)] active:scale-[0.97]"
          >
            See {doors} {doors === 1 ? "match" : "matches"}
            <ArrowDown className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
