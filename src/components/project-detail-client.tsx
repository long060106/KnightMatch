"use client";

import { ArrowDown, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { listToText } from "@/lib/email-template";
import { isNewThisWeek } from "@/lib/filters";
import { matchProject, profileSkills, type MatchResult } from "@/lib/match";
import { useProfile } from "@/lib/profile-store";
import { scrollToElement } from "@/lib/smooth-scroll";
import { useNow } from "@/lib/time";
import type { SkillMap } from "@/lib/types";
import { EmailDraftDialog } from "./email-draft-dialog";
import { MatchMeter, NewBadge, SkillTag } from "./project-bits";
import { RelativeTime } from "./relative-time";

interface DetailData {
  title: string;
  url: string;
  status: "open" | "full";
  semester: string | null;
  leaderName: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  /** Skills the AI step added for wording the word list missed. */
  aiSkills: string[];
  lastCheckedAt: string;
  skills: SkillMap;
  courseSkills: Record<string, string[]>;
}

/** The student's match against this project, or null before they add anything. */
function useProjectMatch(data: DetailData) {
  const profile = useProfile();
  return useMemo(() => {
    if (!profile) return null;
    const have = profileSkills(profile, data.courseSkills, data.skills);
    const result = matchProject(data.requiredSkills, data.preferredSkills, have, data.skills);
    return { profile, have, result };
  }, [profile, data]);
}

export function DetailNewBadge({ firstSeenAt, baselineAt }: { firstSeenAt: string; baselineAt: string }) {
  const now = useNow();
  return now !== null && isNewThisWeek(firstSeenAt, baselineAt, now) ? <NewBadge /> : null;
}

/** Skills we found in the qualifications text, colored by what the student already has. */
export function DetectedSkills({ data }: { data: DetailData }) {
  const match = useProjectMatch(data);
  const have = match?.have ?? null;
  const { skills } = data;
  const all = [...data.requiredSkills, ...data.preferredSkills];
  const required = data.requiredSkills.filter((id) => skills[id]?.counts);
  const preferred = data.preferredSkills.filter((id) => skills[id]?.counts);
  const soft = all.filter((id) => skills[id]?.category === "soft");
  const training = all.filter((id) => skills[id]?.category === "training");
  const tools = all.filter((id) => skills[id] && !skills[id].counts && !["soft", "training"].includes(skills[id].category));

  const group = (title: string, ids: string[], state: (id: string) => "have" | "missing" | "neutral", note?: string) =>
    ids.length > 0 && (
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {note && <p className="-mt-1 text-xs text-muted-foreground">{note}</p>}
        <div className="flex flex-wrap gap-1.5">
          {ids.map((id) => (
            <SkillTag key={id} label={skills[id].label} state={state(id)} ai={data.aiSkills.includes(id)} />
          ))}
        </div>
      </div>
    );

  return (
    <div className="grid content-start gap-5">
      {required.length > 0 ? (
        group("Required", required, (id) => (!have ? "neutral" : have.has(id) ? "have" : "missing"))
      ) : (
        <p className="text-sm">
          <span className="font-semibold">No specific skills listed.</span>{" "}
          <span className="text-muted-foreground">Anyone interested can reach out.</span>
        </p>
      )}
      {group("Nice to have", preferred, (id) => (have?.has(id) ? "have" : "neutral"))}
      {group("Also mentioned", [...soft, ...tools], () => "neutral")}
      {group("Training you complete after joining", training, () => "neutral", "Teams walk new members through these.")}
      <p className="border-t pt-3 text-xs text-muted-foreground">
        Skills and topics are detected automatically (word list, plus AI for wording the list misses). The original
        wording on KRSP is what counts.
      </p>
    </div>
  );
}

function MatchSummary({ result, skills }: { result: MatchResult; skills: SkillMap }) {
  if (result.total === 0) {
    return <p className="text-sm">This team lists no specific skills, so anyone can reach out.</p>;
  }
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-3">
        <MatchMeter met={result.met.length} total={result.total} />
        <p className="text-sm">
          <span className="font-medium">
            You meet {result.met.length} of {result.total}
          </span>{" "}
          listed {result.total === 1 ? "requirement" : "requirements"}
        </p>
      </div>
      {result.missing.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Skills to pick up: {listToText(result.missing.map((id) => skills[id]?.label ?? id))}
        </p>
      )}
    </div>
  );
}

/** Match + How to apply. Sticky beside the content on wide screens. */
export function ProjectSidebar({ data }: { data: DetailData }) {
  const match = useProjectMatch(data);
  const leader = data.leaderName?.split(",")[0] ?? "the team leader";

  const emailInput = useMemo(() => {
    const result = match?.result;
    const matched = result ? [...result.met, ...result.preferredMet] : [];
    const projectSkills = new Set([...data.requiredSkills, ...data.preferredSkills]);
    const relevantCourses =
      match?.profile.courses.filter((code) =>
        (data.courseSkills[code] ?? []).some((id) => projectSkills.has(id) || projectSkills.has(data.skills[id]?.parent ?? "")),
      ) ?? [];
    return {
      projectTitle: data.title,
      leaderName: data.leaderName,
      semester: data.semester,
      matchedSkills: matched.map((id) => data.skills[id]?.label ?? id),
      relevantCourses,
    };
  }, [match, data]);

  return (
    <div className="grid gap-4">
      <section aria-labelledby="your-match" className="rounded-lg border bg-card p-5">
        <h2 id="your-match" className="text-sm font-medium text-muted-foreground">
          Your match
        </h2>
        <div className="mt-3">
          {match ? (
            <>
              <MatchSummary result={match.result} skills={data.skills} />
              <p className="mt-3 text-sm">Many teams still take students who are eager to learn. Reach out.</p>
            </>
          ) : (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">
                Add the skills and courses you have to see how this project lines up.
              </p>
              <Button asChild variant="outline" className="h-11 active:scale-[0.97]">
                <Link href="/match">Add my skills and courses</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <section id="apply" tabIndex={-1} aria-labelledby="apply-heading" className="scroll-mt-4 rounded-lg border bg-card p-5 outline-none">
        <h2 id="apply-heading" className="font-serif text-2xl">
          {data.status === "open" ? "How to apply" : "This team is full right now"}
        </h2>
        {data.status === "open" ? (
          <ol className="mt-4 grid gap-4 text-sm">
            <li className="grid grid-cols-[1.75rem_1fr] gap-x-2">
              <span className="font-serif text-lg leading-5 text-muted-foreground">1</span>
              <div className="grid gap-2">
                <p>
                  Open the listing on KRSP and find {leader}&apos;s email. KRSP teams recruit directly, so you contact
                  them yourself.
                </p>
                <Button asChild variant="outline" className="h-11 justify-between active:scale-[0.97]">
                  <a href={data.url} target="_blank" rel="noopener noreferrer">
                    Open the KRSP listing
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </Button>
              </div>
            </li>
            <li className="grid grid-cols-[1.75rem_1fr] gap-x-2">
              <span className="font-serif text-lg leading-5 text-muted-foreground">2</span>
              <div className="grid gap-2">
                <p>Send a short first email. We&apos;ll draft one from your profile; you edit it and send it.</p>
                <EmailDraftDialog input={emailInput} leaderName={data.leaderName} krspUrl={data.url} />
              </div>
            </li>
            <li className="grid grid-cols-[1.75rem_1fr] gap-x-2">
              <span className="font-serif text-lg leading-5 text-muted-foreground">3</span>
              <p>No reply after a week? Send one polite follow-up. Teams get busy.</p>
            </li>
          </ol>
        ) : (
          <div className="mt-3 grid gap-3 text-sm">
            <p className="text-muted-foreground">
              KRSP moves a team back to open when spots free up, and we re-check the list every day. You can still
              read about the project and keep it in mind.
            </p>
            <Button asChild variant="outline" className="h-11 justify-between active:scale-[0.97]">
              <a href={data.url} target="_blank" rel="noopener noreferrer">
                Open the KRSP listing
                <ArrowUpRight className="size-4" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
          </div>
        )}
        <p className="mt-5 border-t pt-3 text-xs text-muted-foreground">
          Checked <RelativeTime iso={data.lastCheckedAt} />. The KRSP listing is always the source of truth.
        </p>
      </section>
    </div>
  );
}

/**
 * Phones: the apply steps sit below a long description, so keep a shortcut on screen while they
 * are still further down the page. It hides once they are visible and stays hidden after you pass them.
 */
export function MobileApplyBar({ open }: { open: boolean }) {
  const [stepsBelow, setStepsBelow] = useState(true);
  useEffect(() => {
    const steps = document.getElementById("apply");
    if (!steps) return;
    const observer = new IntersectionObserver(([entry]) => {
      setStepsBelow(!entry.isIntersecting && entry.boundingClientRect.top > 0);
    });
    observer.observe(steps);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {open && stepsBelow && (
        <div className="fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 lg:hidden">
          <button
            type="button"
            onClick={() => {
              const target = document.getElementById("apply");
              if (target) scrollToElement(target);
            }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-base font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_rgb(0_0_0/0.35)] active:scale-[0.97]"
          >
            How to apply
            <ArrowDown className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
