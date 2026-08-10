-- ============================================================
-- 0073_demo_cleanup.sql
-- DEMO-04: ephemeral demo purge + IP throttle for demo start.
-- Two purge functions (accounts vs orphaned anon auth users).
-- Scheduling is NOT via pg_cron (not enabled) — Edge Function
-- (shipped separately for Dom to deploy). Idempotent.
-- ============================================================

-- 1) IP throttle log (hashed IPs only — no raw addresses)
create table if not exists demo_start_attempts (
  id          uuid primary key default gen_random_uuid(),
  ip_hash     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists demo_start_attempts_ip_created_idx
  on demo_start_attempts (ip_hash, created_at desc);

alter table demo_start_attempts enable row level security;
-- No policies for anon/authenticated — service_role / definer only.

-- 2) Record a demo-start attempt or raise demo_throttled.
-- Threshold lives here only (same pattern as RSVP-THROTTLE-01).
create or replace function try_record_demo_start(p_ip_hash text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c_throttle_window constant interval := interval '1 hour';
  c_throttle_max constant int := 5;
  v_recent_count int;
begin
  if nullif(btrim(coalesce(p_ip_hash, '')), '') is null then
    raise exception 'demo_throttle_invalid' using errcode = 'P0001';
  end if;

  select count(*)::int
    into v_recent_count
  from demo_start_attempts a
  where a.ip_hash = p_ip_hash
    and a.created_at >= now() - c_throttle_window;

  if v_recent_count >= c_throttle_max then
    raise exception 'demo_throttled' using errcode = 'P0001';
  end if;

  insert into demo_start_attempts (ip_hash) values (p_ip_hash);
end;
$$;

revoke all on function try_record_demo_start(text) from public;
grant execute on function try_record_demo_start(text) to service_role;

-- 3) Purge expired demo accounts (cascades cover cloned graph).
-- Does NOT touch is_demo_template. Does NOT delete auth.users.
create or replace function purge_demo_accounts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  delete from accounts a
  where a.is_demo = true
    and a.demo_created_at is not null
    and a.demo_created_at < now() - interval '24 hours';

  get diagnostics v_deleted = row_count;

  -- Hygiene: drop old throttle rows (not user data).
  delete from demo_start_attempts
  where created_at < now() - interval '48 hours';

  return v_deleted;
end;
$$;

revoke all on function purge_demo_accounts() from public;
grant execute on function purge_demo_accounts() to service_role;

-- 4) Purge orphaned anonymous auth users (separate checkpoint from #3).
-- Gated: is_anonymous, no account_members, age > 24h.
create or replace function purge_demo_auth_users()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_deleted int;
begin
  delete from auth.users u
  where u.is_anonymous is true
    and u.created_at < now() - interval '24 hours'
    and not exists (
      select 1
      from public.account_members am
      where am.user_id = u.id
    );

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function purge_demo_auth_users() from public;
grant execute on function purge_demo_auth_users() to service_role;
