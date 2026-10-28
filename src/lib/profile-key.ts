/** Shared by server and client code, so it must not live in a "use client" module. */

export const PROFILE_KEY = "km.profile.v1";
/** The student's list of saved / emailed projects (src/lib/tracker.ts). */
export const TRACKER_KEY = "km.tracker.v1";
/** Set once this browser has signed in, so visitors who never did make no account requests at all. */
export const ACCOUNT_KEY = "km.account.v1";
/** Which account this browser last synced with, the version it saw, and whether changes wait to go up. */
export const SYNC_KEY = "km.sync.v1";

/**
 * Inline <head> script, runs before first paint:
 * - adds `js` to <html> so scroll effects may start hidden (without JS everything stays visible);
 * - marks returning students so the match row has space reserved and How-it-works starts collapsed.
 */
export const HEAD_SCRIPT = `document.documentElement.classList.add("js");try{if(localStorage.getItem("${PROFILE_KEY}"))document.documentElement.setAttribute("data-has-profile","")}catch(e){}`;
