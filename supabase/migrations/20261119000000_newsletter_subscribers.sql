-- ============================================================
-- 20261119000000_newsletter_subscribers.sql
-- MEDIA-02: couple newsletter signup on the public media site.
--
-- New anon WRITE surface (definer RPC only, same posture as
-- submit_inquiry). No anon SELECT / INSERT on the table: RLS is on with
-- zero policies, so subscribe_newsletter() is the only public path.
--
--  * newsletter_subscribers — one row per email (lower-cased, unique).
--    wedding_date is optional and drives the "you're N months out"
--    sequence later. A re-subscribe of an existing email is a no-op
--    that fills a missing wedding_date and clears unsubscribed_at.
--  * newsletter_signup_attempts — hashed-IP throttle log (no raw IPs),
--    same shape as inquiry_form_attempts. Threshold lives ONLY in the RPC.
--
-- Re-runnable: create-if-not-exists, create-or-replace.
-- ============================================================

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  wedding_date date,
  source text,
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  constraint newsletter_subscribers_email_lower check (email = lower(email)),
  constraint newsletter_subscribers_email_len check (char_length(email) between 3 and 254),
  constraint newsletter_subscribers_source_len check (source is null or char_length(source) <= 80)
);

create unique index if not exists newsletter_subscribers_email_key
  on public.newsletter_subscribers (email);

alter table public.newsletter_subscribers enable row level security;

create table if not exists public.newsletter_signup_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists newsletter_signup_attempts_ip_created_idx
  on public.newsletter_signup_attempts (ip_hash, created_at desc);

alter table public.newsletter_signup_attempts enable row level security;

create or replace function public.subscribe_newsletter(
  p_email text,
  p_wedding_date date default null,
  p_source text default null,
  p_honeypot text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  c_throttle_max constant int := 5;
  c_throttle_window constant interval := interval '10 minutes';
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_ip_raw text;
  v_ip_hash text;
  v_recent int;
begin
  -- Bots fill the hidden field: accept silently, store nothing.
  if nullif(btrim(coalesce(p_honeypot, '')), '') is not null then
    return;
  end if;

  if char_length(v_email) < 3 or char_length(v_email) > 254
     or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'email_invalid' using errcode = 'P0001';
  end if;

  if p_wedding_date is not null
     and (p_wedding_date < current_date - 30 or p_wedding_date > current_date + 365 * 5) then
    raise exception 'wedding_date_invalid' using errcode = 'P0001';
  end if;

  v_ip_raw := nullif(btrim(split_part(coalesce(
    current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1)), '');
  v_ip_hash := encode(
    digest('newsletter:' || lower(coalesce(v_ip_raw, 'unknown')), 'sha256'), 'hex');

  select count(*)::int into v_recent
  from newsletter_signup_attempts a
  where a.ip_hash = v_ip_hash
    and a.created_at >= now() - c_throttle_window;

  if v_recent >= c_throttle_max then
    raise exception 'newsletter_throttled' using errcode = 'P0001';
  end if;

  insert into newsletter_signup_attempts (ip_hash) values (v_ip_hash);
  delete from newsletter_signup_attempts where created_at < now() - interval '48 hours';

  insert into newsletter_subscribers (email, wedding_date, source)
  values (v_email, p_wedding_date, left(nullif(btrim(coalesce(p_source, '')), ''), 80))
  on conflict (email) do update
    set wedding_date = coalesce(newsletter_subscribers.wedding_date, excluded.wedding_date),
        unsubscribed_at = null;
end;
$$;

revoke all on function public.subscribe_newsletter(text, date, text, text) from public;
grant execute on function public.subscribe_newsletter(text, date, text, text) to anon, authenticated;
