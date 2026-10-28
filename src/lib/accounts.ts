/**
 * Accounts are optional and switched on with NEXT_PUBLIC_ACCOUNTS=on (set on Vercel once Google
 * sign-in and the database are ready). Off, the site shows nothing about accounts and makes no
 * account requests. Read at build time, so it is the same on the server and in the browser.
 */
export const ACCOUNTS_ON = process.env.NEXT_PUBLIC_ACCOUNTS === "on";
