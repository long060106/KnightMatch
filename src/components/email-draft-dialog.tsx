"use client";

import { ArrowUpRight, Check, Copy, Mail, RotateCcw } from "lucide-react";
import { useId, useState } from "react";
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
import { buildEmailDraft, draftAsText, mailtoHref, type EmailDraft, type EmailDraftInput } from "@/lib/email-template";

const TIPS = [
  "Put the project name in the subject line.",
  "Say who you are: your year, your major, and why this project.",
  "Point to skills or courses that match what they listed. We filled in yours.",
  "Say how many hours a week you can give and when you can start.",
  "Attach your resume, keep it under 150 words, and follow up once if a week goes by.",
];

interface EmailDraftDialogProps {
  input: EmailDraftInput;
  leaderName: string | null;
  krspUrl: string;
}

/** Builds a first email the student edits and sends from their own account. We never send anything. */
export function EmailDraftDialog({ input, leaderName, krspUrl }: EmailDraftDialogProps) {
  const subjectId = useId();
  const bodyId = useId();
  const [draft, setDraft] = useState<EmailDraft>(() => buildEmailDraft(input));
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(draftAsText(draft));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: select the text so Ctrl+C / long-press still works.
      const field = document.getElementById(bodyId) as HTMLTextAreaElement | null;
      field?.select();
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        // Rebuild on every open so it reflects skills added since last time.
        if (open) setDraft(buildEmailDraft(input));
      }}
    >
      <DialogTrigger asChild>
        <Button className="h-11 w-full gap-2 text-base font-semibold active:scale-[0.97]">
          <Mail className="size-4" aria-hidden="true" />
          Draft my email
        </Button>
      </DialogTrigger>
      <DialogContent
        data-lenis-prevent
        className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto overscroll-contain p-5 sm:max-w-2xl md:p-6"
      >
        <DialogHeader className="text-left">
          <DialogTitle className="font-serif text-2xl font-medium">Draft your first email</DialogTitle>
          <DialogDescription>
            Edit it, then send it from your own email. KnightMatch never sends anything for you.
          </DialogDescription>
        </DialogHeader>

        <ul className="grid gap-1.5 rounded-lg bg-muted px-4 py-3 text-sm">
          {TIPS.map((tip) => (
            <li key={tip} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-honey-ink" aria-hidden="true" />
              {tip}
            </li>
          ))}
        </ul>

        <p className="text-sm text-muted-foreground">
          To:{" "}
          <a
            href={krspUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-medium text-foreground underline underline-offset-4 hover:text-honey-ink"
          >
            {leaderName ? `${leaderName.split(",")[0]}'s email is on the KRSP listing` : "the team leader's email is on the KRSP listing"}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </p>

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
            rows={14}
            className="min-h-72 bg-card text-base leading-relaxed md:text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild className="h-11 gap-2 px-4 font-semibold active:scale-[0.97]">
            <a href={mailtoHref(draft)}>
              <Mail className="size-4" aria-hidden="true" />
              Open in email app
            </a>
          </Button>
          <Button variant="outline" onClick={copy} className="h-11 gap-2 px-4 active:scale-[0.97]">
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? "Copied" : "Copy email"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setDraft(buildEmailDraft(input))}
            className="h-11 gap-2 px-3 text-muted-foreground active:scale-[0.97]"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Start over
          </Button>
          <span aria-live="polite" className="sr-only">
            {copied ? "Email copied to the clipboard" : ""}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
