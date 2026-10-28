"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteAccount, signInWithGoogle, signOut, useAccount } from "@/lib/account-store";
import { useProfile } from "@/lib/profile-store";
import { useTracker } from "@/lib/tracker-store";
import { DrawRule } from "./draw-rule";
import { SignInDialog } from "./sign-in-dialog";

/** ?error=… is how Better Auth comes back when Google sign-in did not finish; ?delete=1 after signing in again to delete. */
function readParams(): { error: boolean; deleting: boolean } {
  if (typeof window === "undefined") return { error: false, deleting: false };
  const params = new URLSearchParams(window.location.search);
  return { error: params.has("error"), deleting: params.get("delete") === "1" };
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-serif text-4xl leading-none tabular-nums">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function AccountPanel() {
  const account = useAccount();
  const profile = useProfile();
  const tracker = useTracker();
  const [params] = useState(readParams);
  const [confirming, setConfirming] = useState(params.deleting);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<"sign-out" | "delete" | "sign-in-again" | null>(null);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    // Read once; a reload should not show the message or open the dialog again.
    if (params.error || params.deleting) window.history.replaceState(null, "", window.location.pathname);
  }, [params]);

  if (account.status === "unknown") return <div className="min-h-64" aria-busy="true" />;

  if (account.status === "signed-out") {
    return (
      <div className="grid max-w-[62ch] gap-6 py-10 md:py-14">
        {deleted ? (
          <p role="status" className="text-lg">
            Your account is deleted. This browser still has your skills and list; nothing else of yours is kept.
          </p>
        ) : (
          <>
            {params.error && (
              <p role="alert" className="border-l-2 border-foreground pl-4">
                Sign-in didn&rsquo;t finish. Try again, or keep using KnightMatch without an account.
              </p>
            )}
            <p className="text-lg text-muted-foreground">
              You&rsquo;re not signed in. Without an account, your skills, courses and list stay in this browser only.
            </p>
            <div>
              <SignInDialog
                returnTo="/account"
                trigger={<Button className="h-12 px-6 text-base font-semibold active:scale-[0.97]">Sign in</Button>}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  const skills = profile?.skills.length ?? 0;
  const courses = profile?.courses.length ?? 0;
  const listed = tracker ? Object.keys(tracker).length : 0;

  async function onSignOut() {
    setBusy(true);
    setProblem(null);
    if (!(await signOut())) setProblem("sign-out");
    setBusy(false);
  }

  async function onDelete() {
    setBusy(true);
    setProblem(null);
    const result = await deleteAccount();
    setBusy(false);
    if (result === "deleted") {
      setConfirming(false);
      setDeleted(true);
    } else {
      setProblem(result === "sign-in-again" ? "sign-in-again" : "delete");
    }
  }

  return (
    <div className="grid max-w-[62ch] gap-8 py-10 md:py-14">
      <p className="text-lg">
        Signed in with Google as <strong className="font-semibold [overflow-wrap:anywhere]">{account.email}</strong>
      </p>

      <section aria-labelledby="saved-title" className="grid gap-5">
        <h2 id="saved-title" className="km-label text-muted-foreground">
          What&rsquo;s saved
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <Stat value={skills} label={skills === 1 ? "skill" : "skills"} />
          <Stat value={courses} label={courses === 1 ? "course" : "courses"} />
          <Stat value={listed} label={listed === 1 ? "project on your list" : "projects on your list"} />
        </div>
        <p className="text-sm text-muted-foreground">
          The same on every device you sign in on. Your resume and the emails you write are never saved.
        </p>
      </section>

      <DrawRule />

      <section aria-labelledby="sign-out-title" className="grid gap-3">
        <h2 id="sign-out-title" className="font-serif text-2xl">
          Sign out
        </h2>
        <p className="text-muted-foreground">
          Signing out removes your skills and list from this browser. They stay in your account.
        </p>
        <div>
          <Button variant="outline" onClick={onSignOut} disabled={busy} className="h-11 px-5 active:scale-[0.97]">
            Sign out
          </Button>
        </div>
        {problem === "sign-out" && (
          <p role="alert" className="text-sm">
            Couldn&rsquo;t sign out just now. Check your connection and try again.
          </p>
        )}
      </section>

      <DrawRule />

      <section aria-labelledby="delete-title" className="grid gap-3">
        <h2 id="delete-title" className="font-serif text-2xl">
          Delete my account
        </h2>
        <p className="text-muted-foreground">
          Removes your email address, skills, courses and list from KnightMatch for good.
        </p>
        <div>
          <Button variant="destructive" onClick={() => setConfirming(true)} className="h-11 px-5 active:scale-[0.97]">
            Delete my account
          </Button>
        </div>
      </section>

      <Dialog
        open={confirming}
        onOpenChange={(open) => {
          setConfirming(open);
          setProblem(null);
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] gap-5 p-5 sm:max-w-md md:p-6">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle className="font-serif text-2xl">Delete your account?</DialogTitle>
            <DialogDescription className="text-base">
              Your email address, skills, courses and list are removed from KnightMatch. This browser keeps its own
              copy until you clear it.
            </DialogDescription>
          </DialogHeader>
          {problem === "sign-in-again" && (
            <div role="alert" className="grid gap-3">
              <p>To keep your account safe, sign in again first. You&rsquo;ll come straight back here.</p>
              <div>
                <Button variant="outline" onClick={() => signInWithGoogle("/account?delete=1")} className="h-11 px-5">
                  Sign in again
                </Button>
              </div>
            </div>
          )}
          {problem === "delete" && (
            <p role="alert" className="text-sm">
              Couldn&rsquo;t delete it just now. Check your connection and try again.
            </p>
          )}
          <DialogFooter className="gap-2 sm:justify-start">
            <Button variant="destructive" onClick={onDelete} disabled={busy} className="h-11 px-5">
              {busy ? "Deleting…" : "Delete my account"}
            </Button>
            <DialogClose asChild>
              <Button variant="outline" className="h-11 px-5">
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
