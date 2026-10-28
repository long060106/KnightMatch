-- KnightMatch accounts. Apply with `npm run db:migrate`; safe to run again.
--
-- The first five tables are Better Auth's own (generated with `npx auth@1.7.8 generate` for the
-- options in src/lib/server/auth.ts). "user" keeps the email address; name stays empty and image
-- null because the Google profile is not copied. Sessions are stored without IP or browser details.
-- Google tokens in "account" are encrypted by Better Auth before they are written.

create table if not exists "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table if not exists "session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);

create table if not exists "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table if not exists "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table if not exists "rateLimit" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);

create index if not exists "session_userId_idx" on "session" ("userId");

create index if not exists "account_userId_idx" on "account" ("userId");

create index if not exists "verification_identifier_idx" on "verification" ("identifier");

-- The student's skills, courses and list: the same JSON the browser keeps in km.profile.v1 and
-- km.tracker.v1 (src/lib/sync.ts). Deleted with the account.
create table if not exists "user_data" (
  "user_id" text not null primary key references "user" ("id") on delete cascade,
  "profile" jsonb,
  "tracker" jsonb not null default '{}'::jsonb,
  "version" integer not null default 0,
  "updated_at" timestamptz not null default CURRENT_TIMESTAMP
);
