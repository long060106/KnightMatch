"use client";

import { Repeat2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
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
import { buildFollowUpDraft, type EmailDraft } from "@/lib/email-template";
import { formatDate, useNow } from "@/lib/time";
import { followUpAt } from "@/lib/tracker";
import { useTracker } from "@/lib/tracker-store";
import { cn } from "@/lib/utils";
import { RecipientLine, SendActions, useLeaderEmail } from "./email-send";
import { FOLLOW_UP_ID, MarkSent, ReminderButton, type ReminderTarget } from "./progress-tracker";

interface FollowUpProps {
  target: ReminderTarget;
  leaderName: string | null;
}

/**
 * The one short follow-up, a week after the first email. The student edits and sends it.
 * `showTrigger` goes false once they mark it sent; the dialog stays open until they close it.
 */
function FollowUpDialog({
  target,
  leaderName,
  emailedAt,
  primary,
  showTrigger,
}: FollowUpProps & { emailedAt: string | null; primary: boolean; showTrigger: boolean }) {
  const subjectId = useId();
  const bodyId = useId();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const fresh = () => buildFollowUpDraft({ projectTitle: target.projectTitle, leaderName, emailedAt, formatDate });
  const [draft, setDraft] = useState<EmailDraft>(fresh);
  const to = useLeaderEmail(target.projectId, open);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDraft(fresh());
          setSent(false);
        }
      }}
    >
      {showTrigger && (
        <DialogTrigger asChild>
          <Button
            variant={primary ? "default" : "outline"}
            className={cn("h-11 w-full gap-2 active:scale-[0.97]", primary && "text-base font-semibold")}
          >
            <Repeat2 className="size-4" aria-hidden="true" />
            Draft my follow-up
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        data-lenis-prevent
        onOpenAutoFocus={(event) => {
          // Radix would focus (and select) the subject, which opens the keyboard on phones. Start on the dialog.
          event.preventDefault();
          (event.currentTarget as HTMLElement | null)?.focus();
        }}
        onCloseAutoFocus={(event) => {
          // The button is gone once the follow-up is marked sent: land on the step that says so.
          if (!showTrigger) {
            event.preventDefault();
            document.getElementById(FOLLOW_UP_ID)?.focus();
          }
        }}
        className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto overscroll-contain p-5 sm:max-w-2xl md:p-6"
      >
        <DialogHeader className="text-left">
          <DialogTitle className="font-serif text-2xl">Draft your follow-up</DialogTitle>
          <DialogDescription>
            Easiest is to reply to your first email, so it stays in one thread. Send it once; teams get busy.
          </DialogDescription>
        </DialogHeader>

        <RecipientLine to={to} leaderName={leaderName} krspUrl={target.krspUrl} />

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
              Message
            </label>
            <span className="text-xs text-muted-foreground">Replace everything in [brackets]</span>
          </div>
          <Textarea
            id={bodyId}
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            rows={9}
            className="min-h-52 bg-card text-base leading-relaxed md:text-sm"
          />
        </div>

        <SendActions draft={draft} to={to} bodyId={bodyId} onSend={() => setSent(true)} />
        {sent && <MarkSent target={target} stage="followed_up" />}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Step 3 of "How to apply", following the student's list: when to follow up, a calendar reminder,
 * and the follow-up draft. Before the first email is marked as sent it is the plain advice.
 * One wrapper for every state, so the dialog is not torn down when its own "Mark as followed up" moves the stage.
 */
export function FollowUpStep({ target, leaderName }: FollowUpProps) {
  const tracker = useTracker();
  const now = useNow();
  const entry = tracker?.[target.projectId];
  const nextAt = followUpAt(entry);
  const emailed = entry?.stage === "emailed" && entry.emailedAt !== undefined && nextAt !== null;
  const followedUp = entry?.stage === "followed_up";
  const due = emailed && now !== null && now >= nextAt;

  let text: ReactNode = "No reply after a week? Send one polite follow-up. Teams get busy.";
  if (emailed && due) {
    text = (
      <>
        <span className="font-semibold">Time for one polite follow-up.</span> You emailed on {formatDate(entry.emailedAt!)}.
      </>
    );
  } else if (emailed) {
    text = `You emailed on ${formatDate(entry.emailedAt!)}. No reply by ${formatDate(new Date(nextAt).toISOString())}? Send one polite follow-up.`;
  } else if (followedUp) {
    text = `You followed up${entry.followedUpAt ? ` on ${formatDate(entry.followedUpAt)}` : ""}. That's enough; keep an eye on your inbox.`;
  }

  return (
    <div id={FOLLOW_UP_ID} tabIndex={-1} className="grid scroll-mt-4 gap-2 outline-none">
      <p>{text}</p>
      {(emailed || followedUp) && (
        <FollowUpDialog
          target={target}
          leaderName={leaderName}
          emailedAt={entry?.emailedAt ?? null}
          primary={due}
          showTrigger={emailed}
        />
      )}
      {emailed && !due && <ReminderButton target={target} at={nextAt} />}
    </div>
  );
}
