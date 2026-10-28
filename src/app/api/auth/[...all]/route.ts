import { getAuth } from "@/lib/server/auth";

/**
 * /api/auth/* → Better Auth: Google sign-in and its callback, the session, sign-out and deleting the
 * account. 404 while accounts are not set up.
 */
async function handle(request: Request): Promise<Response> {
  const auth = getAuth();
  return auth ? auth.handler(request) : new Response(null, { status: 404 });
}

export const GET = handle;
export const POST = handle;
