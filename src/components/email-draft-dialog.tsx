"use client";

import { Check, Mail, RotateCcw } from "lucide-react";
import { useCallback, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { findAiTells, toggleStepLine, type CoachDraft } from "@/lib/coach/coach";
import { buildEmailDraft, type EmailDraft, type EmailDraftInput } from "@/lib/email-template";
import { cn } from "@/lib/utils";
import { EmailCoach, useEmailCoach } from "./email-coach";
import { RecipientLine, SendActions, useLeaderEmail } from "./email-send";
import { MarkSent } from "./progress-tracker";

// From what professors say about cold emails.
const TIPS = [
  "Write it yourself. An email that sounds like AI is the fastest way to get ignored.",
  "Get to the point: ask in the first lines if they have room on the team.",
  "Talk about you: how you got into this field and what you've done. We filled in your skills.",
  "Ask one specific question about a part of the project instead of praising it.",
  "End by asking who else they'd suggest if the team is full. Keep it under 150 words, attach your resume, and follow up once after a week.",
];

interface EmailDraftDialogProps {
  projectId: string;
  input: EmailDraftInput;
  /** Skill labels and course codes from the student's profile, for the AI coach. */
  profile: string[];
  leaderName: string | null;
  krspUrl: string;
  /** Already emailed: the follow-up is the main action now, so this button steps back. */
  quiet?: boolean;
}

/** Builds a first email the student edits and sends from their own account. We never send anything. */
export function EmailDraftDialog({ projectId, input, profile, leaderName, krspUrl, quiet = false }: EmailDraftDialogProps) {
  const subjectId = useId();
  const bodyId = useId();
  const voiceId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<EmailDraft>(() => buildEmailDraft(input));
  const [fromAi, setFromAi] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set());
  /** Opened in the email app or copied: time to ask whether it went out. */
  const [sent, setSent] = useState(false);
  const to = useLeaderEmail(projectId, open);
  const tells = useMemo(() => findAiTells(`${draft.subject}\n${draft.body}`), [draft]);

  const onDraft = useCallback((next: CoachDraft) => {
    setDraft(next);
    setFromAi(true);
    setChosen(new Set());
  }, []);
  const coach = useEmailCoach(projectId, profile, onDraft);

  function toggleLine(line: string, on: boolean) {
    setDraft((d) => ({ ...d, body: toggleStepLine(d.body, line, on) }));
    setChosen((set) => {
      const next = new Set(set);
      if (on) next.add(line);
      else next.delete(line);
      return next;
    });
  }

  function startOver() {
    coach.reset();
    setDraft(buildEmailDraft(input));
    setFromAi(false);
    setChosen(new Set());
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Rebuild the template on every open so it reflects skills added since last time.
        // An AI draft is kept: it took a while to write and may already be edited.
        if (next && !fromAi) setDraft(buildEmailDraft(input));
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={quiet ? "outline" : "default"}
          className={cn("h-11 w-full gap-2 active:scale-[0.97]", !quiet && "text-base font-semibold")}
        >
          <Mail className="size-4" aria-hidden="true" />
          Draft my email
        </Button>
      </DialogTrigger>
      <DialogContent
        data-lenis-prevent
        className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto overscroll-contain p-5 sm:max-w-2xl md:p-6"
      >
        <DialogHeader className="text-left">
          <DialogTitle className="font-serif text-2xl">Draft your first email</DialogTitle>
          <DialogDescription>
            Edit it, then send it from your own email. KnightMatch never sends anything for you.
          </DialogDescription>
        </DialogHeader>

        <EmailCoach coach={coach} chosen={chosen} onToggleLine={toggleLine} />

        {!fromAi && (
          <ul className="grid gap-1.5 rounded-lg bg-muted px-4 py-3 text-sm">
            {TIPS.map((tip) => (
              <li key={tip} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-honey-ink" aria-hidden="true" />
                {tip}
              </li>
            ))}
          </ul>
        )}

        <RecipientLine to={to} leaderName={leaderName} krspUrl={krspUrl} />

        <div className="grid gap-2">
          <label htmlFor={subjectId} className="text-sm font-semibold">
            Subject
          </label>
          <Input
            id={subjectId}
            value={draft.subject}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            className="h-11 bg-card text-base md:text-sm"
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={bodyId} className="text-sm font-semibold">
              Message{fromAi && <span className="font-normal text-muted-foreground"> · rough AI draft</span>}
            </label>
            <span className="text-xs text-muted-foreground">Replace everything in [brackets]</span>
          </div>
          <Textarea
            id={bodyId}
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            rows={14}
            aria-describedby={fromAi || tells.length ? voiceId : undefined}
            className="min-h-72 bg-card text-base leading-relaxed md:text-sm"
          />
          {(fromAi || tells.length > 0) && (
            <div id={voiceId} className="grid gap-1 rounded-md bg-muted px-3 py-2.5 text-sm" aria-live="polite">
              <p>
                <span className="font-semibold">Put it in your own words before you send it.</span> Professors say an
                email that sounds like AI is the fastest way to get ignored. Read it out loud and change anything you
                wouldn&apos;t say.
              </p>
              {tells.length > 0 && (
                <p className="text-muted-foreground">
                  Sounds like AI: {tells.map((t, i) => (
                    <span key={t}>
                      {i > 0 && ", "}
                      <span className="font-medium text-foreground">“{t}”</span>
                    </span>
                  ))}
                </p>
              )}
            </div>
          )}
        </div>

        <SendActions draft={draft} to={to} bodyId={bodyId} onSend={() => setSent(true)}>
          <Button variant="outline" onClick={startOver} className="h-11 gap-2 px-4 active:scale-[0.97]">
            <RotateCcw className="size-4" aria-hidden="true" />
            Start over
          </Button>
        </SendActions>
        {sent && <MarkSent target={{ projectId, projectTitle: input.projectTitle, krspUrl }} stage="emailed" />}
      </DialogContent>
    </Dialog>
  );
}
