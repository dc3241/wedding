-- ============================================================
-- 0007_email_credentials.sql
-- Per-user Gmail OAuth tokens for sending outreach from the couple's mailbox.
-- Tokens are read only in server actions — never exposed to the client.
-- ============================================================

create table email_credentials (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  provider      text not null default 'gmail' check (provider = 'gmail'),
  email         text not null,
  access_token  text not null,
  refresh_token text,
  token_expiry  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, provider)
);

alter table email_credentials enable row level security;

create policy "users read own email credentials"
  on email_credentials for select
  using (user_id = auth.uid());

create policy "users insert own email credentials"
  on email_credentials for insert
  with check (user_id = auth.uid());

create policy "users update own email credentials"
  on email_credentials for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users delete own email credentials"
  on email_credentials for delete
  using (user_id = auth.uid());
