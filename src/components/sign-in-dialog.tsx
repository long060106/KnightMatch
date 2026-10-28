"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { signInWithGoogle } from "@/lib/account-store";

/** Google's "G", as its sign-in guidelines ask for next to "Continue with Google". */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/**
 * The one place to sign in. `trigger` is the button or link that opens it; after Google the student
 * comes back to `returnTo` (the page they were on by default).
 */
export function SignInDialog({ trigger, returnTo }: { trigger: ReactNode; returnTo?: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function start() {
    setBusy(true);
    setFailed(false);
    const here = `${window.location.pathname}${window.location.search}`;
    if (!(await signInWithGoogle(returnTo ?? here))) {
      setBusy(false);
      setFailed(true);
    }
  }

  return (
    <Dialog onOpenChange={() => setFailed(false)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent data-lenis-prevent className="w-[calc(100%-2rem)] gap-5 p-5 sm:max-w-md md:p-6">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="font-serif text-2xl leading-tight">Keep your list on every device</DialogTitle>
          <DialogDescription className="text-base">
            Sign in to see your skills, courses and saved projects on your phone and laptop. You don&rsquo;t need an
            account to use KnightMatch.
          </DialogDescription>
        </DialogHeader>
        <Button
          onClick={start}
          disabled={busy}
          variant="outline"
          className="h-12 w-full gap-3 bg-card text-base font-semibold active:scale-[0.97]"
        >
          <GoogleMark />
          {busy ? "Opening Google…" : "Continue with Google"}
        </Button>
        {failed && (
          <p role="alert" className="-mt-2 text-sm">
            Couldn&rsquo;t reach Google just now. Check your connection and try again.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          We keep your email address and what you add here, not your resume or the emails you write. Delete it any
          time.{" "}
          <Link href="/about#your-data" className="km-link font-medium text-foreground">
            What we keep
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}
