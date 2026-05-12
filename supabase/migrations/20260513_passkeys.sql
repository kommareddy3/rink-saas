-- =====================================================================
-- RINK passkey storage (WebAuthn / FIDO2)
-- =====================================================================
-- Run in the Supabase SQL Editor (or via the Supabase CLI):
--   supabase db push
--
-- The Express gateway writes to these tables using the service-role key,
-- so RLS only governs reads and deletes from authenticated users.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Stored passkey credentials (one row per registered authenticator)
-- ---------------------------------------------------------------------
create table if not exists public.passkey_credentials (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  credential_id   text not null unique,         -- base64url
  public_key      text not null,                -- base64url
  counter         bigint not null default 0,
  transports      text[] not null default '{}',
  device_type     text,                         -- 'singleDevice' | 'multiDevice'
  backed_up       boolean not null default false,
  friendly_name   text,                          -- "MacBook Touch ID", "YubiKey 5C"
  created_at      timestamptz not null default now(),
  last_used_at    timestamptz
);

create index if not exists passkey_credentials_user_id_idx
  on public.passkey_credentials(user_id);

alter table public.passkey_credentials enable row level security;

-- Authenticated users can see and delete only their own credentials.
drop policy if exists "passkeys_select_own" on public.passkey_credentials;
create policy "passkeys_select_own"
  on public.passkey_credentials for select
  using (auth.uid() = user_id);

drop policy if exists "passkeys_delete_own" on public.passkey_credentials;
create policy "passkeys_delete_own"
  on public.passkey_credentials for delete
  using (auth.uid() = user_id);

-- Inserts and updates go through the service role from our Express gateway.
-- No INSERT/UPDATE policies are required for end users.

-- ---------------------------------------------------------------------
-- Short-lived WebAuthn challenges
-- ---------------------------------------------------------------------
-- Stored server-side so they survive Vercel serverless cold starts
-- between begin/finish calls. Expire after 5 minutes.
create table if not exists public.passkey_challenges (
  id              uuid primary key default gen_random_uuid(),
  session_token   text not null unique,
  user_id         uuid,                         -- nullable for unauthenticated auth-flow
  email           text,                         -- nullable; used for sign-in challenges
  challenge       text not null,
  challenge_type  text not null check (challenge_type in ('register', 'authenticate')),
  expires_at      timestamptz not null default (now() + interval '5 minutes'),
  created_at      timestamptz not null default now()
);

create index if not exists passkey_challenges_session_idx
  on public.passkey_challenges(session_token);

create index if not exists passkey_challenges_expires_idx
  on public.passkey_challenges(expires_at);

alter table public.passkey_challenges enable row level security;
-- No public policies — challenges are only touched by the service role.

-- ---------------------------------------------------------------------
-- Periodic cleanup of expired challenges (optional)
-- ---------------------------------------------------------------------
-- If you have pg_cron enabled, schedule this every 10 minutes:
--   select cron.schedule('rink-purge-passkey-challenges', '*/10 * * * *',
--     $$delete from public.passkey_challenges where expires_at < now()$$);
