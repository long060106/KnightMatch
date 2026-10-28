"use client";

/**
 * The student's list (saved, emailed, followed up…), kept in this browser like the profile, and in
 * their account too when they sign in.
 * Storage can be blocked; the list then lasts for this page view.
 */

import { useSyncExternalStore } from "react";
import { TRACKER_KEY } from "./profile-key";
import { parseTracker, serializeTracker, withStage, type Stage, type TrackedProject, type Tracker } from "./tracker";

export const TRACKER_CHANGE_EVENT = "km-tracker-change";

/** Used when storage is blocked, so marks still work until the page closes. */
let memory: string | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(TRACKER_KEY);
  } catch {
    return memory;
  }
}

function writeRaw(raw: string | null): void {
  memory = raw;
  try {
    if (raw) window.localStorage.setItem(TRACKER_KEY, raw);
    else window.localStorage.removeItem(TRACKER_KEY);
  } catch {
    // Storage unavailable: `memory` keeps it for this page view.
  }
  window.dispatchEvent(new Event(TRACKER_CHANGE_EVENT));
}

function write(tracker: Tracker): void {
  writeRaw(Object.keys(tracker).length ? serializeTracker(tracker) : null);
}

/** Moves one project to a stage (adding it to the list if needed). */
export function setStage(id: string, stage: Stage): void {
  const tracker = parseTracker(readRaw());
  write({ ...tracker, [id]: withStage(tracker[id], stage, new Date().toISOString()) });
}

/** Puts one project back exactly as it was (undo), or takes it off the list when `entry` is undefined. */
export function restoreEntry(id: string, entry: TrackedProject | undefined): void {
  const tracker = parseTracker(readRaw());
  if (entry) tracker[id] = entry;
  else delete tracker[id];
  write(tracker);
}

/** The list as stored right now, outside React (for syncing with the account). */
export function readTracker(): Tracker {
  return parseTracker(readRaw());
}

/** Replaces the whole list (from the student's account, or empty after signing out). */
export function replaceTracker(tracker: Tracker): void {
  write(tracker);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange); // other tabs
  window.addEventListener(TRACKER_CHANGE_EVENT, onChange); // this tab
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(TRACKER_CHANGE_EVENT, onChange);
  };
}

let cachedRaw: string | null | undefined;
let cachedTracker: Tracker = {};

function getSnapshot(): Tracker {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedTracker = parseTracker(raw);
  }
  return cachedTracker;
}

/** null while prerendering; {} when nothing is on the list yet. */
export function useTracker(): Tracker | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
