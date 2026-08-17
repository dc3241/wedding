-- ============================================================
-- 0085_vendor_countdown_confirm.sql
-- AUTO-02: T-30 / T-7 / T-2 booked-vendor countdown confirmations.
-- Arrival + scope + standing confirm token live on project_vendors
-- (1:1 with a booked vendor on a specific project).
--
-- Anon surface #7 (was six): confirm_project_vendor(token) —
-- SECURITY DEFINER, anon execute, token-gated single-purpose write.
-- Returns vendor name + wedding identifier only. NO anon SELECT on
-- project_vendors — the confirm page reads the RPC payload, not the
-- table. Standing token (rsvp_token posture): re-confirm is
-- idempotent, not an error, token is not invalidated.
--
-- Token generation matches guests.rsvp_token exactly:
--   encode(extensions.gen_random_bytes(16), 'hex')
-- Not the sha256-hashed invitation scheme (0028 / 0081).
--
-- Cadence constants (T-30 / T-7 / T-2) live in the cron route only.
-- last_reminder_kind is the send-side dedup marker, not a log table.
-- ============================================================

alter table project_vendors
  add column if not exists arrival_time time;

alter table project_vendors
  add column if not exists scope_note text;

alter table project_vendors
  add column if not exists confirm_token text;

-- Qualify extensions: column DEFAULT cannot rely on a function search_path.
-- Bare gen_random_bytes in the backfill mirrors 0041 / rsvp_token.
do $$
begin
  perform set_config('search_path', 'public, extensions', true);
  update project_vendors
  set confirm_token = encode(gen_random_bytes(16), 'hex')
  where confirm_token is null;
end $$;

alter table project_vendors
  alter column confirm_token set default encode(extensions.gen_random_bytes(16), 'hex');

alter table project_vendors
  alter column confirm_token set not null;

create unique index if not exists project_vendors_confirm_token_key
  on project_vendors (confirm_token);

alter table project_vendors
  add column if not exists confirmed_at timestamptz;

alter table project_vendors
  add column if not exists last_reminder_sent_at timestamptz;

alter table project_vendors
  add column if not exists last_reminder_kind text;

alter table project_vendors
  drop constraint if exists project_vendors_last_reminder_kind_check;

alter table project_vendors
  add constraint project_vendors_last_reminder_kind_check
  check (last_reminder_kind in ('due_30', 'due_7', 'due_2'));

-- Anon surface #7. Invalid token raises with no payload (no data leak).
create or replace function confirm_project_vendor(p_token text)
returns table (
  vendor_name text,
  wedding_name text,
  already_confirmed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_confirmed_at timestamptz;
  v_vendor_name text;
  v_wedding_name text;
  v_was_confirmed boolean;
begin
  if nullif(btrim(coalesce(p_token, '')), '') is null then
    raise exception 'invalid_confirm_token' using errcode = 'P0001';
  end if;

  select pv.id, pv.confirmed_at, v.name, p.name
    into v_id, v_confirmed_at, v_vendor_name, v_wedding_name
  from project_vendors pv
  join vendors v on v.id = pv.vendor_id
  join projects p on p.id = pv.project_id
  where pv.confirm_token = btrim(p_token);

  if v_id is null then
    raise exception 'invalid_confirm_token' using errcode = 'P0001';
  end if;

  v_was_confirmed := v_confirmed_at is not null;

  if not v_was_confirmed then
    update project_vendors
    set confirmed_at = now()
    where id = v_id;
  end if;

  vendor_name := v_vendor_name;
  wedding_name := v_wedding_name;
  already_confirmed := v_was_confirmed;
  return next;
end;
$$;

revoke all on function confirm_project_vendor(text) from public;
grant execute on function confirm_project_vendor(text) to anon, authenticated;
