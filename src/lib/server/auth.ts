/**
 * Accounts, with Better Auth. Students sign in with Google; KnightMatch keeps their email address
 * and nothing else from Google (no name, no photo), and asks only for the basic sign-in scopes.
 *
 * Created on first use and null until DATABASE_URL, BETTER_AUTH_SECRET and the Google client are
 * all set, so the site builds and runs without accounts.
 */

import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { getPool } from "./db";

/**
 * Local end-to-end tests sign in with a one-time code that is written to a file on this machine
 * instead of being emailed. Never on Vercel, whatever the environment says.
 */
export const TEST_SIGN_IN = process.env.KM_TEST_AUTH === "1" && !process.env.VERCEL;
export const TEST_CODE_FILE = join(tmpdir(), "knightmatch-test-sign-in.json");

function createAuth() {
  const pool = getPool();
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const google = clientId && clientSecret ? { clientId, clientSecret } : null;
  if (!pool || !secret || (!google && !TEST_SIGN_IN)) return null;

  return betterAuth({
    appName: "KnightMatch",
    baseURL: process.env.BETTER_AUTH_URL?.trim() || undefined,
    secret,
    database: pool,
    telemetry: { enabled: false },
    socialProviders: google
      ? {
          google: {
            ...google,
            prompt: "select_account",
            // Only the email address is kept; Google's name and photo are not stored.
            mapProfileToUser: () => ({ name: "", image: undefined }),
          },
        }
      : {},
    account: { encryptOAuthTokens: true },
    user: { deleteUser: { enabled: true } },
    session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
    databaseHooks: {
      // Sessions are stored without the IP address or browser details (rate limits still read the IP
      // from each request; it is just not kept).
      session: { create: { before: async (session) => ({ data: { ...session, ipAddress: null, userAgent: null } }) } },
    },
    // Serverless instances share no memory, so the counts live in the database.
    rateLimit: { enabled: true, storage: "database" },
    plugins: [
      ...(TEST_SIGN_IN
        ? [
            emailOTP({
              async sendVerificationOTP({ email, otp }) {
                await writeFile(TEST_CODE_FILE, JSON.stringify({ email, otp }));
              },
            }),
          ]
        : []),
      nextCookies(), // must stay last
    ],
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  if (auth === undefined) auth = createAuth();
  return auth;
}
