"use client";

/**
 * The student's skills and courses, kept in this browser (localStorage), and in their account too
 * when they sign in (account-sync.tsx copies changes up and down).
 * Every read/write is wrapped in try/catch: storage can be blocked (private mode, strict settings)
 * and the site must still work, just without remembering.
 */

import { useSyncExternalStore } from "react";
import { parseProfile } from "./profile";
import { PROFILE_KEY } from "./profile-key";
import type { Profile } from "./types";

export const PROFILE_CHANGE_EVENT = "km-profile-change";

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(PROFILE_KEY);
  } catch {
    return null;
  }
}

/** The profile as stored right now, outside React (for syncing with the account). */
export function readProfile(): Profile | null {
  return parseProfile(readRaw());
}

export function saveProfile(profile: Profile | null): void {
  try {
    if (profile && (profile.skills.length || profile.courses.length)) {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      document.documentElement.setAttribute("data-has-profile", "");
    } else {
      window.localStorage.removeItem(PROFILE_KEY);
      document.documentElement.removeAttribute("data-has-profile");
    }
  } catch {
    // Storage unavailable: the profile lives only for this page view.
  }
  window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange); // other tabs
  window.addEventListener(PROFILE_CHANGE_EVENT, onChange); // this tab
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PROFILE_CHANGE_EVENT, onChange);
  };
}

let cachedRaw: string | null = null;
let cachedProfile: Profile | null = null;

function getSnapshot(): Profile | null {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedProfile = parseProfile(raw);
  }
  return cachedProfile;
}

/** null while prerendering and when the student has not added anything yet. */
export function useProfile(): Profile | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
