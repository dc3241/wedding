-- ============================================================
-- 0089_inquiry_capture.sql
-- AUTO-03a: inquiry capture infrastructure. Form + inbound email
-- become a leads row. No extraction, no draft, no LLM.
--
-- Anon surface #8 (was seven): submit_inquiry(...) —
-- SECURITY DEFINER, anon execute. account_id is resolved from
-- inquiry_slug server-side — never client-supplied.
-- The Resend webhook is NOT an anon surface (signature-verified,
-- same posture as the Stripe webhook).
--
-- leads.source already exists as free-text (manual CRM labels).
-- This slice reuses it with 'form' / 'email_inbound'; no second
-- column and no CHECK that would break existing values.
--
-- agent_run_log.project_id becomes nullable so AUTO-03b can log
-- inquiry runs that predate a project. Additive: existing
-- AGENT-01/02/03 rows keep project_id populated.
-- ============================================================

-- 1) Planner/venue public slug. Never on personal accounts.
alter table accounts
  add column if not exists inquiry_slug text;

alter table accounts drop constraint if exists accounts_inquiry_slug_format;
alter table accounts add constraint accounts_inquiry_slug_format
  check (
    inquiry_slug is null
    or inquiry_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  );

alter table accounts drop constraint if exists accounts_inquiry_slug_business_only;
alter table accounts add constraint accounts_inquiry_slug_business_only
  check (kind = 'business' or inquiry_slug is null);

create unique index if not exists accounts_inquiry_slug_uidx
  on accounts (inquiry_slug)
  where inquiry_slug is not null;

-- 2) agent_run_log: inquiry runs are account/lead scoped (AUTO-03b).
alter table agent_run_log
  alter column project_id drop not null;

alter table agent_run_log
  add column if not exists account_id uuid references accounts (id) on delete cascade;

alter table agent_run_log
  add column if not exists lead_id uuid references leads (id) on delete set null;

alter table agent_run_log drop constraint if exists agent_run_log_scope_check;
alter table agent_run_log add constraint agent_run_log_scope_check
  check (project_id is not null or account_id is not null);

create index if not exists agent_run_log_account_started_idx
  on agent_run_log (account_id, started_at desc);

create index if not exists agent_run_log_lead_started_idx
  on agent_run_log (lead_id, started_at desc);

-- 3) Hashed-IP throttle log (DEMO-04 shape). Threshold lives in the RPC.
create table if not exists inquiry_form_attempts (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts (id) on delete cascade,
  ip_hash     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists inquiry_form_attempts_ip_account_created_idx
  on inquiry_form_attempts (ip_hash, account_id, created_at desc);

alter table inquiry_form_attempts enable row level security;
-- No policies for anon/authenticated — definer / service_role only.

-- 4) Public form write. Honeypot + velocity throttle inside the RPC.
-- Threshold constants live only here — do not mirror in app code.
create or replace function submit_inquiry(
  p_slug text,
  p_name text,
  p_email text,
  p_message text,
  p_honeypot text default null,
  p_wedding_date date default null,
  p_guest_count int default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  c_throttle_window constant interval := interval '1 minute';
  c_throttle_max constant int := 3;

  v_account_id uuid;
  v_ip_raw text;
  v_ip_hash text;
  v_recent_count int;
  v_notes text;
  v_position int;
  v_lead_id uuid;
begin
  if nullif(btrim(coalesce(p_honeypot, '')), '') is not null then
    raise exception 'inquiry_rejected' using errcode = 'P0001';
  end if;

  select a.id
    into v_account_id
  from accounts a
  where a.inquiry_slug = btrim(coalesce(p_slug, ''))
    and a.kind = 'business';

  if v_account_id is null then
    raise exception 'inquiry_unknown' using errcode = 'P0001';
  end if;

  if p_name is null or length(btrim(p_name)) = 0 then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  if p_email is null or length(btrim(p_email)) = 0 then
    raise exception 'email_required' using errcode = 'P0001';
  end if;

  if p_guest_count is not null and (p_guest_count < 1 or p_guest_count > 20000) then
    raise exception 'guest_count_invalid' using errcode = 'P0001';
  end if;

  v_ip_raw := nullif(
    btrim(
      split_part(
        coalesce(
          current_setting('request.headers', true)::json->>'x-forwarded-for',
          ''
        ),
        ',',
        1
      )
    ),
    ''
  );
  v_ip_hash := encode(
    digest('inquiry-form:' || lower(coalesce(v_ip_raw, 'unknown')), 'sha256'),
    'hex'
  );

  select count(*)::int
    into v_recent_count
  from inquiry_form_attempts a
  where a.ip_hash = v_ip_hash
    and a.account_id = v_account_id
    and a.created_at >= now() - c_throttle_window;

  if v_recent_count >= c_throttle_max then
    raise exception 'inquiry_throttled' using errcode = 'P0001';
  end if;

  insert into inquiry_form_attempts (account_id, ip_hash)
  values (v_account_id, v_ip_hash);

  delete from inquiry_form_attempts
  where created_at < now() - interval '48 hours';

  v_notes := nullif(btrim(coalesce(p_message, '')), '');
  if p_guest_count is not null then
    v_notes := 'Approximate guest count: ' || p_guest_count::text
      || case
        when v_notes is null then ''
        else E'\n\n' || v_notes
      end;
  end if;

  select coalesce(max(l.position), 0) + 1
    into v_position
  from leads l
  where l.account_id = v_account_id;

  insert into leads (
    account_id,
    couple_name,
    contact_email,
    wedding_date,
    source,
    stage,
    notes,
    position
  )
  values (
    v_account_id,
    btrim(p_name),
    btrim(p_email),
    p_wedding_date,
    'form',
    'inquiry',
    v_notes,
    v_position
  )
  returning id into v_lead_id;

  return v_lead_id;
end;
$$;

revoke all on function submit_inquiry(text, text, text, text, text, date, int) from public;
grant execute on function submit_inquiry(text, text, text, text, text, date, int) to anon, authenticated;
