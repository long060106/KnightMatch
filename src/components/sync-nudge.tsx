"use client";

import { useAccount } from "@/lib/account-store";
import { ACCOUNTS_ON } from "@/lib/accounts";
import { cn } from "@/lib/utils";
import { SignInDialog } from "./sign-in-dialog";

/** Where the profile is kept, for the small note next to "Your profile". */
export function SavedWhere() {
  const account = useAccount();
  return (
    <p className="text-xs text-muted-foreground">
      {ACCOUNTS_ON && account.status === "signed-in" ? "Saved to your account" : "Saved in this browser only"}
    </p>
  );
}

/** One quiet line offering to sign in, only once there is something worth keeping and only when signed out. */
export function SyncNudge({ show, className }: { show: boolean; className?: string }) {
  const account = useAccount();
  if (!ACCOUNTS_ON || !show || account.status !== "signed-out") return null;
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      On another device?{" "}
      <SignInDialog
        trigger={
          <button type="button" className="km-link inline-flex min-h-11 items-center font-medium text-foreground">
            Sign in to keep this in sync
          </button>
        }
      />
    </p>
  );
}
