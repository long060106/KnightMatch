"use client";

/**
 * Copies the profile and list between this browser and the signed-in account (src/lib/sync.ts has
 * the rules). Changes go up 0.8 s after the last edit; the account's copy comes down on sign-in and
 * whenever the tab is opened again. Started once from <AccountSync /> in the layout.
 */

import { checkAccount, getAccount, subscribeAccount } from "./account-store";
import { ACCOUNT_KEY, SYNC_KEY } from "./profile-key";
import { PROFILE_CHANGE_EVENT, readProfile, saveProfile } from "./profile-store";
import { mergeData, parseMarker, syncStep, type AccountData, type SyncedData, type SyncMarker } from "./sync";
import { readTracker, replaceTracker, TRACKER_CHANGE_EVENT } from "./tracker-store";

const PUSH_DELAY_MS = 800;

/** True while the account's copy is being written here, so that write is not sent back up. */
let applying = false;
/** Counts edits made here, to notice one that happened while a request was out. */
let revision = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let queue: Promise<void> = Promise.resolve();

function readMarker(): SyncMarker | null {
  try {
    return parseMarker(window.localStorage.getItem(SYNC_KEY));
  } catch {
    return null;
  }
}

function writeMarker(marker: SyncMarker): void {
  try {
    window.localStorage.setItem(SYNC_KEY, JSON.stringify(marker));
  } catch {
    // Storage blocked: the next visit merges again, which loses nothing.
  }
}

const local = (): AccountData => ({ profile: readProfile(), tracker: readTracker() });

function apply(data: AccountData): void {
  applying = true;
  try {
    saveProfile(data.profile);
    replaceTracker(data.tracker);
  } finally {
    applying = false;
  }
}

function signedInUser(): string | null {
  const account = getAccount();
  return account.status === "signed-in" ? account.userId : null;
}

async function push(userId: string): Promise<void> {
  const marker = readMarker();
  const sent = revision;
  const res = await fetch("/api/me", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...local(), base: marker?.userId === userId ? marker.version : null }),
  });
  if (!res.ok) {
    // Stays marked as waiting; tried again on the next edit or visit.
    if (res.status === 401) void checkAccount();
    return;
  }
  const data = (await res.json()) as SyncedData;
  if (signedInUser() !== userId) return;
  if (revision === sent) {
    apply(data);
    writeMarker({ userId, version: data.version, dirty: false });
  } else {
    // Edited again while saving: keep that edit, take in what the account added, save once more.
    apply(mergeData(local(), data));
    writeMarker({ userId, version: data.version, dirty: true });
    schedule();
  }
}

async function pull(userId: string): Promise<void> {
  const sent = revision;
  const res = await fetch("/api/me", { cache: "no-store" });
  if (!res.ok) {
    if (res.status === 401) void checkAccount();
    return;
  }
  const data = (await res.json()) as SyncedData;
  if (signedInUser() !== userId || revision !== sent) return; // an edit here goes up next
  const marker = readMarker();
  if (marker?.userId !== userId || marker.version !== data.version) apply(data);
  writeMarker({ userId, version: data.version, dirty: false });
}

function run(): void {
  queue = queue
    .then(() => {
      const userId = signedInUser();
      if (!userId) return;
      return syncStep(readMarker(), userId, local()) === "pull" ? pull(userId) : push(userId);
    })
    .catch(() => {
      // Offline or the server failed: changes stay marked and go up later.
    });
}

function schedule(): void {
  clearTimeout(timer);
  timer = setTimeout(run, PUSH_DELAY_MS);
}

function onLocalChange(): void {
  if (applying) return;
  revision++;
  const marker = readMarker();
  if (marker && !marker.dirty) writeMarker({ ...marker, dirty: true });
  if (signedInUser()) schedule();
}

export function startAccountSync(): () => void {
  let lastUser = signedInUser();
  const stopAccount = subscribeAccount(() => {
    const user = signedInUser();
    if (user && user !== lastUser) run();
    lastUser = user;
  });
  const onVisible = () => {
    if (document.visibilityState === "visible") void checkAccount().then(run);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === ACCOUNT_KEY) void checkAccount(); // signed in or out in another tab
  };
  window.addEventListener(PROFILE_CHANGE_EVENT, onLocalChange);
  window.addEventListener(TRACKER_CHANGE_EVENT, onLocalChange);
  window.addEventListener("storage", onStorage);
  window.addEventListener("online", run);
  document.addEventListener("visibilitychange", onVisible);
  void checkAccount();
  return () => {
    stopAccount();
    clearTimeout(timer);
    window.removeEventListener(PROFILE_CHANGE_EVENT, onLocalChange);
    window.removeEventListener(TRACKER_CHANGE_EVENT, onLocalChange);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("online", run);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
