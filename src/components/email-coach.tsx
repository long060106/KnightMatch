"use client";

import { Check, ClipboardPaste, FileUp, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { CoachDraft, CoachEvent, CoachPlan } from "@/lib/coach/coach";
import { redactContact } from "@/lib/coach/redact";
import type { ReadProblem } from "@/lib/resume/extract-text";
import { rememberedResume, rememberResume } from "@/lib/resume/session";
import { cn } from "@/lib/utils";

const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const READ_PROBLEMS: Record<ReadProblem, string> = {
  "too-big": "That file is over 10 MB. Try a smaller PDF or Word file, or paste the text.",
  "legacy-doc": "Older Word files (.doc) can't be read here. Save it as .docx or PDF, or paste the text.",
  "wrong-type": "Choose a PDF or a Word (.docx) file, or paste the text.",
  scanned: "This PDF looks like a scanned image, so there's no text to read. Paste the text instead.",
  locked: "This file is password-protected. Save a copy without the password, or paste the text.",
  unreadable: "We couldn't read this file. Try the other format, or paste the text.",
};

type Stage = "reading" | "planning" | "drafting";

export type CoachState =
  | { status: "idle" }
  | { status: "consent" }
  | { status: "working"; stage: Stage; plan: CoachPlan | null }
  | { status: "done"; plan: CoachPlan }
  | { status: "failed"; message: string; plan: CoachPlan | null };

/**
 * State for the AI coach, kept by the dialog's parent so a finished plan survives closing and
 * reopening the dialog (a free-tier call is worth not repeating).
 */
export function useEmailCoach(projectId: string, profile: string[], onDraft: (draft: CoachDraft) => void) {
  const [state, setState] = useState<CoachState>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);

  const run = useCallback(
    async (resumeText: string) => {
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      let plan: CoachPlan | null = null;
      setState({ status: "working", stage: "planning", plan: null });
      try {
        const response = await fetch("/api/coach", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ projectId, resume: redactContact(resumeText), profile }),
          signal: abort.signal,
        });
        if (!response.ok || !response.body) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error ?? "The AI couldn't start. Try again, or use the template below.");
        }
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        let drafted = false;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as CoachEvent;
            if (event.type === "stage") setState({ status: "working", stage: event.stage, plan });
            else if (event.type === "plan") {
              plan = event.plan;
              setState({ status: "working", stage: "drafting", plan });
            } else if (event.type === "draft") {
              drafted = true;
              onDraft(event.draft);
            } else if (event.type === "error") throw new Error(event.message);
          }
        }
        if (!drafted || !plan) throw new Error("The AI stopped before it finished. Try again, or use the template below.");
        setState({ status: "done", plan });
      } catch (error) {
        if (abort.signal.aborted) return;
        const message =
          error instanceof Error && error.message && !(error instanceof SyntaxError) && error.name !== "TypeError"
            ? error.message
            : "We couldn't reach the AI. Check your connection and try again, or use the template below.";
        setState({ status: "failed", message, plan });
      }
    },
    [projectId, profile, onDraft],
  );

  const reset = useCallback(() => {
    controller.current?.abort();
    setState({ status: "idle" });
  }, []);

  return { state, setState, run, reset };
}

type Coach = ReturnType<typeof useEmailCoach>;

interface EmailCoachProps {
  coach: Coach;
  /** Lines from "Before you send" the student chose to add to the email. */
  chosen: Set<string>;
  onToggleLine: (line: string, on: boolean) => void;
}

export function EmailCoach({ coach, chosen, onToggleLine }: EmailCoachProps) {
  const { state } = coach;
  return (
    <section aria-labelledby="coach-heading" className="grid gap-4 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="grid gap-0.5">
          <h3 id="coach-heading" className="text-sm font-semibold">
            Plan it with AI, from your resume
          </h3>
          <p className="text-sm text-muted-foreground">
            It reads your resume next to this listing, works out what to highlight, what to ask and what to do before
            you send, and says why. Then it writes a rough draft for you to put in your own words.
          </p>
        </div>
      </div>

      {state.status === "idle" && (
        <Button
          variant="outline"
          onClick={() => coach.setState({ status: "consent" })}
          className="h-11 justify-self-start gap-2 px-4 active:scale-[0.97]"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          Write with AI
        </Button>
      )}

      {state.status === "consent" && <ResumePicker coach={coach} />}

      <div aria-live="polite" className="grid gap-4">
        {(state.status === "working" || state.status === "done") && <Stages state={state} />}
        {state.status === "failed" && (
          <div className="grid gap-2 text-sm">
            <p>{state.message}</p>
            <Button
              variant="outline"
              onClick={() => coach.setState({ status: "consent" })}
              className="h-11 justify-self-start px-4 active:scale-[0.97]"
            >
              Try again
            </Button>
          </div>
        )}
      </div>

      {"plan" in state && state.plan && <Plan plan={state.plan} chosen={chosen} onToggleLine={onToggleLine} />}

      {state.status === "done" && (
        <button
          type="button"
          onClick={coach.reset}
          className="inline-flex min-h-11 items-center justify-self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Use a different resume
        </button>
      )}
    </section>
  );
}

function ResumePicker({ coach }: { coach: Coach }) {
  const pasteId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const remembered = rememberedResume();

  async function readFile(file: File) {
    setReading(true);
    setNotice(null);
    try {
      const { extractText } = await import("@/lib/resume/extract-text");
      const result = await extractText(file);
      if (result.ok) {
        rememberResume(result.text);
        void coach.run(result.text);
      } else setNotice(READ_PROBLEMS[result.problem]);
    } catch {
      setNotice(READ_PROBLEMS.unreadable);
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <p className="flex gap-2 rounded-md bg-muted px-3 py-2.5 text-sm">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Your resume text is sent to Google&apos;s Gemini AI to write this. We take out your email, phone number and
          street address first, and KnightMatch keeps nothing. On Gemini&apos;s free plan, Google may use what&apos;s sent
          to improve its products.
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {remembered && (
          <Button onClick={() => void coach.run(remembered)} className="h-11 gap-2 px-4 font-semibold active:scale-[0.97]">
            Use the resume I added
          </Button>
        )}
        <Button
          variant={remembered ? "outline" : "default"}
          aria-disabled={reading}
          onClick={() => !reading && inputRef.current?.click()}
          className={cn("h-11 gap-2 px-4 active:scale-[0.97] aria-disabled:opacity-70", !remembered && "font-semibold")}
        >
          {reading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <FileUp className="size-4" aria-hidden="true" />}
          {reading ? "Reading your resume…" : remembered ? "Choose another file" : "Choose my resume"}
        </Button>
        {!pasting && (
          <Button variant="ghost" onClick={() => setPasting(true)} className="h-11 gap-2 px-3 active:scale-[0.97]">
            <ClipboardPaste className="size-4" aria-hidden="true" />
            Paste text
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => coach.setState({ status: "idle" })}
          className="h-11 px-3 text-muted-foreground active:scale-[0.97]"
        >
          Cancel
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void readFile(file);
        }}
      />
      <div role="status" className="text-sm">
        {notice}
      </div>
      {pasting && (
        <div className="grid gap-2">
          <label htmlFor={pasteId} className="text-sm font-semibold">
            Resume text
          </label>
          <Textarea
            id={pasteId}
            autoFocus
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={6}
            placeholder="Paste your resume here."
            className="max-h-64 min-h-32 bg-card text-base md:text-sm"
          />
          <Button
            onClick={() => {
              rememberResume(pasted);
              void coach.run(pasted);
            }}
            disabled={pasted.trim().length < 80}
            className="h-11 justify-self-start px-4 font-semibold active:scale-[0.97]"
          >
            Write with AI
          </Button>
        </div>
      )}
    </div>
  );
}

const STAGES: { id: Stage; todo: string; doing: string; done: string }[] = [
  { id: "reading", todo: "Read your resume", doing: "Reading your resume…", done: "Read your resume" },
  {
    id: "planning",
    todo: "Think through your strengths and this project",
    doing: "Thinking through your strengths and this project…",
    done: "Thought through your strengths and this project",
  },
  { id: "drafting", todo: "Write your draft from that plan", doing: "Writing your draft from that plan…", done: "Wrote your draft" },
];

function Stages({ state }: { state: Extract<CoachState, { status: "working" | "done" }> }) {
  const current = state.status === "done" ? STAGES.length : STAGES.findIndex((s) => s.id === state.stage);
  return (
    <ol className="grid gap-1.5 text-sm">
      {STAGES.map((stage, i) => (
        <li key={stage.id} className={cn("flex items-start gap-2", i > current && "text-muted-foreground")}>
          {i < current ? (
            <Check className="mt-0.5 size-4 shrink-0 text-honey-ink" aria-hidden="true" />
          ) : i === current ? (
            <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <span className="size-4 shrink-0" aria-hidden="true" />
          )}
          {i < current ? stage.done : i === current ? stage.doing : stage.todo}
        </li>
      ))}
    </ol>
  );
}

function Plan({ plan, chosen, onToggleLine }: { plan: CoachPlan; chosen: Set<string>; onToggleLine: (line: string, on: boolean) => void }) {
  return (
    <div className="grid gap-5 border-t pt-4">
      {plan.angle && (
        <div className="grid gap-1">
          <h4 className="km-label text-muted-foreground">The angle</h4>
          <p className="text-[0.9375rem] leading-relaxed">{plan.angle}</p>
        </div>
      )}

      {plan.strengths.length > 0 && (
        <div className="grid gap-2">
          <h4 className="km-label text-muted-foreground">Your strengths for this project</h4>
          <ul className="grid gap-3">
            {plan.strengths.map((s) => (
              <li key={s.point} className="grid gap-1 text-sm">
                <p className="flex gap-2 font-semibold">
                  <Check className="mt-0.5 size-4 shrink-0 text-honey-ink" aria-hidden="true" />
                  {s.point}
                </p>
                <div className="grid gap-1 pl-6">
                  {s.evidence && <p className="text-muted-foreground">From your resume: “{s.evidence}”</p>}
                  <p>
                    <span className="font-medium">Why it matters:</span> {s.why}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.questions.length > 0 && (
        <div className="grid gap-1.5">
          <h4 className="km-label text-muted-foreground">A question to ask</h4>
          <p className="text-sm text-muted-foreground">
            One specific question shows you read the project better than any compliment. Pick the one you actually want
            answered.
          </p>
          <ul className="grid list-disc gap-1 pl-5 text-sm">
            {plan.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {plan.nextSteps.length > 0 && (
        <div className="grid gap-2">
          <h4 className="km-label text-muted-foreground">Before you send, to stand out</h4>
          <ol className="grid gap-4">
            {plan.nextSteps.map((step, i) => (
              <NextStepItem key={step.title} index={i + 1} step={step} chosen={chosen} onToggleLine={onToggleLine} />
            ))}
          </ol>
        </div>
      )}

      {plan.notYetShown.length > 0 && (
        <div className="grid gap-1.5">
          <h4 className="km-label text-muted-foreground">Asked for, not on your resume yet</h4>
          <p className="text-sm text-muted-foreground">
            Many teams still take students who are eager to learn. If you have done any of these, add them to your resume
            or the email.
          </p>
          <ul className="grid list-disc gap-1 pl-5 text-sm">
            {plan.notYetShown.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function NextStepItem({
  index,
  step,
  chosen,
  onToggleLine,
}: {
  index: number;
  step: CoachPlan["nextSteps"][number];
  chosen: Set<string>;
  onToggleLine: (line: string, on: boolean) => void;
}) {
  const checkId = useId();
  return (
    <li className="grid grid-cols-[1.5rem_1fr] gap-x-2 text-sm">
      <span className="font-serif text-lg leading-5 text-muted-foreground">{index}</span>
      <div className="grid gap-1.5">
        <p className="font-semibold">
          {step.title}
          {step.time && <span className="ml-2 font-normal text-muted-foreground">· {step.time}</span>}
        </p>
        <p>{step.what}</p>
        <p>
          <span className="font-medium">Why:</span> {step.why}
        </p>
        {step.emailLine && (
          <div className="mt-1 flex min-h-11 items-start gap-3 rounded-md bg-muted px-3 py-2.5">
            <Checkbox
              id={checkId}
              checked={chosen.has(step.emailLine)}
              onCheckedChange={(on) => onToggleLine(step.emailLine, on === true)}
              className="mt-0.5"
            />
            <label htmlFor={checkId} className="grid gap-0.5">
              <span className="font-medium">Add to the email once you&apos;ve started it</span>
              <span className="text-muted-foreground">“{step.emailLine}”</span>
            </label>
          </div>
        )}
      </div>
    </li>
  );
}
