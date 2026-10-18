"use client";

/**
 * The student's skills and courses, kept only in this browser (localStorage, no account).
 * Every read/write is wrapped in try/catch: storage can be blocked (private mode, strict settings)
 * and the site must still work, just without remembering.
 */

import { useSyncExternalStore } from "react";
import { PROFILE_KEY } from "./profile-key";
import type { Profile } from "./types";

const CHANGE_EVENT = "km-profile-change";

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(PROFILE_KEY);
  } catch {
    return null;
  }
}

export function parseProfile(raw: string | null): Profile | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value?.skills) || !Array.isArray(value?.courses)) return null;
    const strings = (list: unknown[]) => list.filter((x): x is string => typeof x === "string");
    const profile = { skills: strings(value.skills), courses: strings(value.courses), updatedAt: String(value.updatedAt ?? "") };
    return profile.skills.length || profile.courses.length ? profile : null;
  } catch {
    return null;
  }
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
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange); // other tabs
  window.addEventListener(CHANGE_EVENT, onChange); // this tab
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
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
