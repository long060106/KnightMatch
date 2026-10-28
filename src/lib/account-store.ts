"use client";

/**
 * Who is signed in, as far as this browser knows, and the sign-in / sign-out / delete actions.
 * The server is asked only when this browser has signed in before (ACCOUNT_KEY), so a visitor who
 * never signs in makes no account requests at all.
 */

import { useSyncExternalStore } from "react";
import { ACCOUNT_KEY, SYNC_KEY } from "./profile-key";
import { saveProfile } from "./profile-store";
import { replaceTracker } from "./tracker-store";

export type Account =
  | { status: "unknown" } // prerendering, or still asking
  | { status: "signed-out" }
  | { status: "signed-in"; userId: string; email: string };

const UNKNOWN: Account = { status: "unknown" };
let account: Account = UNKNOWN;
const listeners = new Set<() => void>();

function set(next: Account): void {
  account = next;
  for (const listener of listeners) listener();
}

export function getAccount(): Account {
  return account;
}

export function subscribeAccount(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAccount(): Account {
  return useSyncExternalStore(subscribeAccount, getAccount, () => UNKNOWN);
}

function signedInBefore(): boolean {
  try {
    return window.localStorage.getItem(ACCOUNT_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberSignIn(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(ACCOUNT_KEY, "1");
    else window.localStorage.removeItem(ACCOUNT_KEY);
  } catch {
    // Storage blocked: the session check simply runs every time.
  }
}

const postJson = (path: string, body: unknown) =>
  fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

let pending: Promise<Account> | null = null;

/** Asks the server who is signed in, if this browser ever was. */
export function checkAccount(): Promise<Account> {
  if (!signedInBefore()) {
    if (account.status !== "signed-out") set({ status: "signed-out" });
    return Promise.resolve(account);
  }
  pending ??= fetch("/api/auth/get-session", { cache: "no-store" })
    .then(async (res) => {
      const user = res.ok ? (await res.json())?.user : null;
      if (typeof user?.id === "string" && typeof user.email === "string") {
        if (account.status !== "signed-in" || account.userId !== user.id || account.email !== user.email) {
          set({ status: "signed-in", userId: user.id, email: user.email });
        }
      } else {
        rememberSignIn(false);
        set({ status: "signed-out" });
      }
      return account;
    })
    .catch(() => {
      if (account.status === "unknown") set({ status: "signed-out" });
      return account;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** Sends the browser to Google; it comes back to `returnTo`. False if that could not start. */
export async function signInWithGoogle(returnTo: string): Promise<boolean> {
  rememberSignIn(true);
  try {
    const res = await postJson("/api/auth/sign-in/social", { provider: "google", callbackURL: returnTo, errorCallbackURL: "/account" });
    const url = res.ok ? (await res.json())?.url : null;
    if (typeof url === "string" && url.startsWith("https://")) {
      window.location.assign(url);
      return true;
    }
  } catch {
    // Offline or the server is down: the caller says so.
  }
  if (account.status !== "signed-in") rememberSignIn(false);
  return false;
}

/** Stops syncing first, so whatever is cleared afterwards is not sent to the account. */
function forgetAccount(clearThisDevice: boolean): void {
  set({ status: "signed-out" });
  rememberSignIn(false);
  try {
    window.localStorage.removeItem(SYNC_KEY);
  } catch {
    // Nothing stored to forget.
  }
  if (clearThisDevice) {
    saveProfile(null);
    replaceTracker({});
  }
}

/** Signs out and removes the profile and list from this browser; they stay in the account. */
export async function signOut(): Promise<boolean> {
  try {
    const res = await postJson("/api/auth/sign-out", {});
    if (!res.ok) return false;
  } catch {
    return false;
  }
  forgetAccount(true);
  return true;
}

/**
 * Deletes the account and everything it holds. This browser keeps its own copy. Better Auth wants a
 * recent sign-in for this; when the session is older, the student signs in again first.
 */
export async function deleteAccount(): Promise<"deleted" | "sign-in-again" | "failed"> {
  try {
    const res = await postJson("/api/auth/delete-user", {});
    if (res.ok) {
      forgetAccount(false);
      return "deleted";
    }
    const body = await res.json().catch(() => null);
    if (body?.code === "SESSION_EXPIRED") return "sign-in-again";
  } catch {
    // Falls through to "failed".
  }
  return "failed";
}
