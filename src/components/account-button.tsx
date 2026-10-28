"use client";

import Link from "next/link";
import { useAccount } from "@/lib/account-store";
import { SignInDialog } from "./sign-in-dialog";

/** Header: "Sign in", or the first letter of the student's email linking to /account. */
export function AccountButton() {
  const account = useAccount();

  if (account.status === "unknown") return <span className="inline-block size-11" aria-hidden="true" />;

  if (account.status === "signed-in") {
    return (
      <Link
        href="/account"
        className="inline-flex size-11 items-center justify-center rounded-md transition-colors duration-[var(--dur-fast)] hover:bg-accent"
      >
        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-full border border-foreground font-mono text-xs font-medium uppercase"
        >
          {account.email.charAt(0)}
        </span>
        <span className="sr-only">Your account</span>
      </Link>
    );
  }

  return (
    <SignInDialog
      trigger={
        <button
          type="button"
          className="km-label inline-flex h-11 items-center px-2 whitespace-nowrap text-muted-foreground transition-colors duration-[var(--dur-fast)] hover:text-foreground focus-visible:text-foreground"
        >
          Sign in
        </button>
      }
    />
  );
}
