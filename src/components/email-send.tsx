"use client";

import { ArrowUpRight, Check, Copy, Mail } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { draftAsText, mailtoHref, type EmailDraft } from "@/lib/email-template";

/** The team leader's email, read from the live KRSP page by /api/contact. Null until known. */
export function useLeaderEmail(projectId: string, wanted: boolean) {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    if (!wanted || email) return;
    let current = true;
    fetch(`/api/contact?project=${encodeURIComponent(projectId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (current && typeof body?.email === "string") setEmail(body.email);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [projectId, wanted, email]);
  return email;
}

/** "To: Chanhee Lee <…>" with a link to check it on KRSP, or where to find it when we don't have it. */
export function RecipientLine({ to, leaderName, krspUrl }: { to: string | null; leaderName: string | null; krspUrl: string }) {
  const leader = leaderName?.split(",")[0] ?? null;
  return (
    <div className="grid gap-1 text-sm">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-muted-foreground">To:</span>
        {to ? (
          <span className="font-medium break-all">{leader ? `${leader} <${to}>` : to}</span>
        ) : (
          <span className="text-muted-foreground">
            {leader ? `${leader}'s email is on the KRSP listing` : "the team leader's email is on the KRSP listing"}
          </span>
        )}
      </p>
      <a
        href={krspUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="km-link inline-flex min-h-11 items-center gap-0.5 justify-self-start text-muted-foreground md:min-h-6"
      >
        {to ? "Check it on the KRSP listing" : "Open the KRSP listing"}
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </div>
  );
}

/**
 * Open in email app / Copy email. `onSend` runs after either, so the dialog can ask whether the
 * email went out. `bodyId` is the message field, selected when the clipboard is blocked.
 */
export function SendActions({
  draft,
  to,
  bodyId,
  onSend,
  children,
}: {
  draft: EmailDraft;
  to: string | null;
  bodyId: string;
  onSend: () => void;
  /** Extra buttons after these two, e.g. Start over. */
  children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(draftAsText(draft, to));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: select the text so Ctrl+C / long-press still works.
      const field = document.getElementById(bodyId) as HTMLTextAreaElement | null;
      field?.select();
    }
    onSend();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button asChild className="h-11 gap-2 px-4 font-semibold active:scale-[0.97]">
        <a href={mailtoHref(draft, to)} onClick={onSend}>
          <Mail className="size-4" aria-hidden="true" />
          Open in email app
        </a>
      </Button>
      <Button variant="outline" onClick={copy} className="h-11 gap-2 px-4 active:scale-[0.97]">
        {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        {copied ? "Copied" : "Copy email"}
      </Button>
      {children}
      <span aria-live="polite" className="sr-only">
        {copied ? "Email copied to the clipboard" : ""}
      </span>
    </div>
  );
}
