BEGIN;

-- ===== 0072_rsvp_throttle.sql =====

-- ============================================================
-- 0072_rsvp_throttle.sql
-- RSVP-THROTTLE-01: real rate limit inside submit_rsvp.
-- Counts recent rows for the token-resolved matched_guest_id
-- (SECURITY DEFINER can see them; anon SELECT cannot). Threshold
-- lives only here — not duplicated client-side. Additive: gated
-- token + honeypot + 0058 badge auto-populate unchanged.
-- Idempotent: create or replace.
-- ============================================================

create or replace function submit_rsvp(
  p_slug text,
  p_name text,
  p_response text,
  p_email text,
  p_message text,
  p_party_size int,
  p_attendees jsonb,
  p_household_token text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  -- Velocity cap per household (matched_guest_id). Corrections OK;
  -- rapid-fire spam is not. Single source of truth — do not mirror
  -- these in the app.
  c_throttle_window constant interval := interval '1 minute';
  c_throttle_max constant int := 3;

  v_project_id uuid;
  v_published boolean;
  v_style text;
  v_songs_enabled boolean;
  v_option_count int;
  v_plated boolean;
  v_submission_id uuid;
  v_party_size int;
  v_attendees jsonb;
  v_elem jsonb;
  v_ord int;
  v_att_name text;
  v_meal_raw text;
  v_meal_id uuid;
  v_dietary text;
  v_song text;
  v_matched_guest_id uuid;
  v_recent_count int;
begin
  select
    w.project_id,
    w.published,
    coalesce(w.meal_service_style, 'none'),
    coalesce(w.song_requests_enabled, false)
  into v_project_id, v_published, v_style, v_songs_enabled
  from wedding_websites w
  where w.slug = p_slug;

  if not found or v_published is distinct from true then
    raise exception 'rsvp_unavailable' using errcode = 'P0001';
  end if;

  -- Always gated: every submission must be household-token-bound.
  if nullif(btrim(coalesce(p_household_token, '')), '') is null then
    raise exception 'household_required' using errcode = 'P0001';
  end if;

  select g.id
    into v_matched_guest_id
  from guests g
  where g.project_id = v_project_id
    and g.rsvp_token = btrim(p_household_token);

  if v_matched_guest_id is null then
    raise exception 'household_invalid' using errcode = 'P0001';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  if p_response is distinct from 'yes' and p_response is distinct from 'no' then
    raise exception 'invalid_response' using errcode = 'P0001';
  end if;

  -- RSVP-THROTTLE-01: before badge write or insert — rejected attempts
  -- must not mutate guests.rsvp_status or create a submission row.
  select count(*)::int
    into v_recent_count
  from rsvp_submissions s
  where s.matched_guest_id = v_matched_guest_id
    and s.created_at >= now() - c_throttle_window;

  if v_recent_count >= c_throttle_max then
    raise exception 'rsvp_throttled' using errcode = 'P0001';
  end if;

  -- GST-09: write household badge to the token-resolved guest.
  -- Same transaction as the submission insert. Latest submit wins.
  update guests
  set rsvp_status = case
    when p_response = 'yes' then 'attending'
    else 'declined'
  end
  where id = v_matched_guest_id;

  select count(*)::int into v_option_count
  from meal_options
  where project_id = v_project_id;

  v_plated := (v_style = 'plated' and v_option_count > 0);

  if p_attendees is null or jsonb_typeof(p_attendees) is distinct from 'array' then
    v_attendees := '[]'::jsonb;
  else
    v_attendees := p_attendees;
  end if;

  -- Decline: one submission row, zero attendees.
  if p_response = 'no' then
    insert into rsvp_submissions (
      project_id, name, response, party_size, email, message, matched_guest_id
    ) values (
      v_project_id,
      trim(p_name),
      'no',
      1,
      nullif(trim(coalesce(p_email, '')), ''),
      nullif(trim(coalesce(p_message, '')), ''),
      v_matched_guest_id
    )
    returning id into v_submission_id;

    return v_submission_id;
  end if;

  -- Accepting.
  if v_plated then
    if jsonb_array_length(v_attendees) < 1 then
      raise exception 'attendees_required' using errcode = 'P0001';
    end if;

    for v_elem in select value from jsonb_array_elements(v_attendees)
    loop
      v_att_name := nullif(trim(coalesce(v_elem->>'name', '')), '');
      if v_att_name is null then
        raise exception 'attendee_name_required' using errcode = 'P0001';
      end if;

      v_meal_raw := nullif(trim(coalesce(v_elem->>'meal_option_id', '')), '');
      if v_meal_raw is null then
        raise exception 'meal_option_required' using errcode = 'P0001';
      end if;
    end loop;

    -- Derive headcount from attendee rows — ignore p_party_size.
    v_party_size := jsonb_array_length(v_attendees);
  else
    v_party_size := greatest(1, least(20, coalesce(p_party_size, 1)));
  end if;

  insert into rsvp_submissions (
    project_id, name, response, party_size, email, message, matched_guest_id
  ) values (
    v_project_id,
    trim(p_name),
    'yes',
    v_party_size,
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_message, '')), ''),
    v_matched_guest_id
  )
  returning id into v_submission_id;

  for v_elem, v_ord in
    select value, ordinality::int
    from jsonb_array_elements(v_attendees) with ordinality
  loop
    v_att_name := nullif(trim(coalesce(v_elem->>'name', '')), '');
    v_dietary := nullif(trim(coalesce(v_elem->>'dietary_note', '')), '');
    -- Server is source of truth: ignore client song text when toggle is off.
    if v_songs_enabled then
      v_song := nullif(trim(coalesce(v_elem->>'song_request', '')), '');
    else
      v_song := null;
    end if;

    if v_plated then
      v_meal_id := (nullif(trim(coalesce(v_elem->>'meal_option_id', '')), ''))::uuid;
    else
      -- No menu on offer (or plated misconfig) — never persist a client meal id.
      v_meal_id := null;
      if v_att_name is null and v_dietary is null and v_song is null then
        continue;
      end if;
    end if;

    insert into rsvp_attendees (
      project_id,
      submission_id,
      meal_option_id,
      name,
      dietary_note,
      song_request,
      sort_order
    ) values (
      v_project_id,
      v_submission_id,
      v_meal_id,
      v_att_name,
      v_dietary,
      v_song,
      v_ord - 1
    );
  end loop;

  return v_submission_id;
end;
$$;

revoke all on function submit_rsvp(text, text, text, text, text, int, jsonb, text) from public;
grant execute on function submit_rsvp(text, text, text, text, text, int, jsonb, text) to anon, authenticated;

-- ===== 0073_demo_cleanup.sql =====

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

-- ===== 0074_clone_demo_throttle.sql =====

-- ============================================================
-- 0074_clone_demo_throttle.sql
-- DEMO-04b: fold IP throttle into clone_demo_account itself.
-- Derives IP from PostgREST request.headers (x-forwarded-for
-- leftmost); calls try_record_demo_start on EVERY invocation
-- including the (uid, kind) idempotent-return path.
-- Does NOT touch purge_* or Edge Function. Idempotent replace.
-- ============================================================

create or replace function clone_demo_account(p_kind text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_template_id uuid;
  v_new_account_id uuid;
  v_existing uuid;
  v_ip_raw text;
  v_ip_hash text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if p_kind is distinct from 'personal' and p_kind is distinct from 'business' then
    raise exception 'invalid_account_kind' using errcode = 'P0001';
  end if;

  -- DEMO-04b: IP throttle inside the definer RPC (every call, incl. idempotent
  -- return). PostgREST injects request.headers; leftmost XFF segment.
  -- try_record_demo_start is the sole recorder (0073).
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
    digest('demo-start:' || lower(coalesce(v_ip_raw, 'unknown')), 'sha256'),
    'hex'
  );
  perform try_record_demo_start(v_ip_hash);

  -- Idempotent: one demo account of this kind per visitor.
  select a.id
    into v_existing
  from accounts a
  join account_members am on am.account_id = a.id
  where am.user_id = v_uid
    and a.is_demo = true
    and a.kind = p_kind
  order by a.demo_created_at nulls last, a.created_at
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  select a.id
    into v_template_id
  from accounts a
  where a.is_demo_template = true
    and a.kind = p_kind
  order by a.created_at
  limit 1;

  if v_template_id is null then
    raise exception 'demo_template_missing: no is_demo_template account with kind=%', p_kind
      using errcode = 'P0001';
  end if;

  -- Session-scoped old→new id map (transaction-local TEMP).
  begin
    create temporary table demo_id_map (
      entity text not null,
      old_id uuid not null,
      new_id uuid not null,
      primary key (entity, old_id)
    ) on commit drop;
  exception
    when duplicate_table then
      delete from demo_id_map;
  end;

  -- ---- L0: account + projects (no project_members — visitor is account owner) ----
  insert into accounts (name, kind, is_demo, is_demo_template, demo_created_at)
  select name, kind, true, false, now()
  from accounts
  where id = v_template_id
  returning id into v_new_account_id;

  insert into account_members (account_id, user_id, role)
  values (v_new_account_id, v_uid, 'owner');

  insert into demo_id_map (entity, old_id, new_id)
  select 'project', p.id, gen_random_uuid()
  from projects p
  where p.account_id = v_template_id;

  insert into projects (
    id, account_id, name, wedding_date, status, created_at, total_budget, archived_at
  )
  select
    m.new_id,
    v_new_account_id,
    p.name,
    p.wedding_date,
    p.status,
    p.created_at,
    p.total_budget,
    p.archived_at
  from projects p
  join demo_id_map m on m.entity = 'project' and m.old_id = p.id
  where p.account_id = v_template_id;

  -- ---- L1: account-scoped ----
  insert into demo_id_map (entity, old_id, new_id)
  select 'vendor', v.id, gen_random_uuid()
  from vendors v
  where v.account_id = v_template_id;

  insert into vendors (
    id, account_id, name, category, contact_name, contact_email, contact_phone,
    website, service_area, notes, is_preferred, created_at, source,
    external_place_id, ai_overview, last_enriched_at, address, instagram
  )
  select
    m.new_id,
    v_new_account_id,
    v.name, v.category, v.contact_name, v.contact_email, v.contact_phone,
    v.website, v.service_area, v.notes, v.is_preferred, v.created_at, v.source,
    v.external_place_id, v.ai_overview, v.last_enriched_at, v.address, v.instagram
  from vendors v
  join demo_id_map m on m.entity = 'vendor' and m.old_id = v.id
  where v.account_id = v_template_id;

  insert into demo_id_map (entity, old_id, new_id)
  select 'lead', l.id, gen_random_uuid()
  from leads l
  where l.account_id = v_template_id;

  insert into leads (
    id, account_id, couple_name, contact_email, contact_phone, wedding_date,
    estimated_budget, venue, source, stage, notes, position, created_at, updated_at
  )
  select
    m.new_id,
    v_new_account_id,
    l.couple_name, l.contact_email, l.contact_phone, l.wedding_date,
    l.estimated_budget, l.venue, l.source, l.stage, l.notes, l.position,
    l.created_at, l.updated_at
  from leads l
  join demo_id_map m on m.entity = 'lead' and m.old_id = l.id
  where l.account_id = v_template_id;

  insert into demo_id_map (entity, old_id, new_id)
  select 'proposal', pr.id, gen_random_uuid()
  from proposals pr
  where pr.account_id = v_template_id;

  insert into proposals (
    id, account_id, lead_id, title, line_items, total, status, notes,
    created_at, updated_at, accepted_at, terms
  )
  select
    m.new_id,
    v_new_account_id,
    lm.new_id,
    pr.title, pr.line_items, pr.total, pr.status, pr.notes,
    pr.created_at, pr.updated_at, pr.accepted_at, pr.terms
  from proposals pr
  join demo_id_map m on m.entity = 'proposal' and m.old_id = pr.id
  join demo_id_map lm on lm.entity = 'lead' and lm.old_id = pr.lead_id
  where pr.account_id = v_template_id;

  insert into demo_id_map (entity, old_id, new_id)
  select 'contract_template', ct.id, gen_random_uuid()
  from contract_templates ct
  where ct.account_id = v_template_id;

  insert into contract_templates (
    id, account_id, name, body, category, created_at, updated_at
  )
  select
    m.new_id,
    v_new_account_id,
    ct.name, ct.body, ct.category, ct.created_at, ct.updated_at
  from contract_templates ct
  join demo_id_map m on m.entity = 'contract_template' and m.old_id = ct.id
  where ct.account_id = v_template_id;

  -- subscriptions: SKIP (DEMO-00 / DEMO-01)

  -- ---- L2: project children (only projects FK / account+project) ----
  insert into demo_id_map (entity, old_id, new_id)
  select 'project_vendor', pv.id, gen_random_uuid()
  from project_vendors pv
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = pv.project_id;

  insert into project_vendors (
    id, project_id, status, created_at, vendor_id, quoted_price, role, notes
  )
  select
    m.new_id,
    pm.new_id,
    pv.status,
    pv.created_at,
    vm.new_id,
    pv.quoted_price,
    pv.role,
    pv.notes
  from project_vendors pv
  join demo_id_map m on m.entity = 'project_vendor' and m.old_id = pv.id
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = pv.project_id
  join demo_id_map vm on vm.entity = 'vendor' and vm.old_id = pv.vendor_id;

  insert into wedding_profile (
    project_id, location, guest_estimate, style, traditions, priorities,
    vibe_notes, onboarded_at, created_at
  )
  select
    pm.new_id,
    wp.location, wp.guest_estimate, wp.style, wp.traditions, wp.priorities,
    wp.vibe_notes, wp.onboarded_at, wp.created_at
  from wedding_profile wp
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = wp.project_id;

  insert into demo_id_map (entity, old_id, new_id)
  select 'guest', g.id, gen_random_uuid()
  from guests g
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = g.project_id;

  insert into guests (
    id, project_id, full_name, email, phone, household, party_size,
    rsvp_status, meal_choice, notes, created_at, rsvp_token, address
  )
  select
    m.new_id,
    pm.new_id,
    g.full_name, g.email, g.phone, g.household, g.party_size,
    g.rsvp_status, g.meal_choice, g.notes, g.created_at,
    encode(gen_random_bytes(16), 'hex'),  -- NEVER copy template token
    g.address
  from guests g
  join demo_id_map m on m.entity = 'guest' and m.old_id = g.id
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = g.project_id;

  insert into demo_id_map (entity, old_id, new_id)
  select 'meal_option', mo.id, gen_random_uuid()
  from meal_options mo
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = mo.project_id;

  insert into meal_options (
    id, project_id, name, description, is_kids, sort_order, created_at
  )
  select
    m.new_id,
    pm.new_id,
    mo.name, mo.description, mo.is_kids, mo.sort_order, mo.created_at
  from meal_options mo
  join demo_id_map m on m.entity = 'meal_option' and m.old_id = mo.id
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = mo.project_id;

  insert into demo_id_map (entity, old_id, new_id)
  select 'seating_table', st.id, gen_random_uuid()
  from seating_tables st
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = st.project_id;

  insert into seating_tables (
    id, project_id, label, shape, seat_count, kind, pos_x, pos_y, rotation, created_at
  )
  select
    m.new_id,
    pm.new_id,
    st.label, st.shape, st.seat_count, st.kind, st.pos_x, st.pos_y, st.rotation, st.created_at
  from seating_tables st
  join demo_id_map m on m.entity = 'seating_table' and m.old_id = st.id
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = st.project_id;

  insert into demo_id_map (entity, old_id, new_id)
  select 'note', n.id, gen_random_uuid()
  from notes n
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = n.project_id;

  insert into notes (
    id, project_id, title, body, created_by, created_at, updated_at, action_status
  )
  select
    m.new_id,
    pm.new_id,
    n.title, n.body, v_uid, n.created_at, n.updated_at, n.action_status
  from notes n
  join demo_id_map m on m.entity = 'note' and m.old_id = n.id
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = n.project_id;

  -- assistant_messages: SKIP
  -- project_invitations: SKIP

  insert into demo_id_map (entity, old_id, new_id)
  select 'timeline_event', te.id, gen_random_uuid()
  from timeline_events te
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = te.project_id;

  insert into timeline_events (
    id, project_id, title, description, start_time, end_time, section, owner, position, created_at
  )
  select
    m.new_id,
    pm.new_id,
    te.title, te.description, te.start_time, te.end_time, te.section, te.owner, te.position, te.created_at
  from timeline_events te
  join demo_id_map m on m.entity = 'timeline_event' and m.old_id = te.id
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = te.project_id;

  insert into demo_id_map (entity, old_id, new_id)
  select 'wedding_website', ww.id, gen_random_uuid()
  from wedding_websites ww
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = ww.project_id;

  insert into wedding_websites (
    id, project_id, slug, published, template, theme, content, created_at, updated_at,
    external_registry_links, meal_service_style, rsvp_access_mode, song_requests_enabled
  )
  select
    m.new_id,
    pm.new_id,
    null,          -- force null slug
    false,         -- force unpublished
    ww.template, ww.theme, ww.content, ww.created_at, ww.updated_at,
    ww.external_registry_links, ww.meal_service_style, ww.rsvp_access_mode, ww.song_requests_enabled
  from wedding_websites ww
  join demo_id_map m on m.entity = 'wedding_website' and m.old_id = ww.id
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = ww.project_id;

  insert into demo_id_map (entity, old_id, new_id)
  select 'budget_alert_dismissal', bad.id, gen_random_uuid()
  from budget_alert_dismissals bad
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = bad.project_id;

  insert into budget_alert_dismissals (
    id, project_id, category, alert_kind, overage_at_dismiss, created_at
  )
  select
    m.new_id,
    pm.new_id,
    bad.category, bad.alert_kind, bad.overage_at_dismiss, bad.created_at
  from budget_alert_dismissals bad
  join demo_id_map m on m.entity = 'budget_alert_dismissal' and m.old_id = bad.id
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = bad.project_id;

  insert into demo_id_map (entity, old_id, new_id)
  select 'calendar_event', ce.id, gen_random_uuid()
  from calendar_events ce
  where ce.account_id = v_template_id;

  insert into calendar_events (
    id, account_id, project_id, title, event_kind, starts_at, ends_at,
    all_day, location, notes, created_at
  )
  select
    m.new_id,
    v_new_account_id,
    case
      when ce.project_id is null then null
      else (select pm.new_id from demo_id_map pm where pm.entity = 'project' and pm.old_id = ce.project_id)
    end,
    ce.title, ce.event_kind, ce.starts_at, ce.ends_at,
    ce.all_day, ce.location, ce.notes, ce.created_at
  from calendar_events ce
  join demo_id_map m on m.entity = 'calendar_event' and m.old_id = ce.id
  where ce.account_id = v_template_id;

  -- ---- L3: need project_vendors / guests / meal_options ----
  insert into demo_id_map (entity, old_id, new_id)
  select 'task', t.id, gen_random_uuid()
  from tasks t
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = t.project_id;

  insert into tasks (
    id, project_id, title, status, phase, due_date, vendor_id, position, notes, created_at
  )
  select
    m.new_id,
    pm.new_id,
    t.title, t.status, t.phase, t.due_date,
    case
      when t.vendor_id is null then null
      else (select pvm.new_id from demo_id_map pvm where pvm.entity = 'project_vendor' and pvm.old_id = t.vendor_id)
    end,
    t.position, t.notes, t.created_at
  from tasks t
  join demo_id_map m on m.entity = 'task' and m.old_id = t.id
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = t.project_id;

  insert into demo_id_map (entity, old_id, new_id)
  select 'budget_item', bi.id, gen_random_uuid()
  from budget_items bi
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = bi.project_id;

  insert into budget_items (
    id, project_id, category, label, planned_amount, actual_amount, notes,
    created_at, project_vendor_id, due_date
  )
  select
    m.new_id,
    pm.new_id,
    bi.category, bi.label, bi.planned_amount, bi.actual_amount, bi.notes,
    bi.created_at,
    case
      when bi.project_vendor_id is null then null
      else (select pvm.new_id from demo_id_map pvm where pvm.entity = 'project_vendor' and pvm.old_id = bi.project_vendor_id)
    end,
    bi.due_date
  from budget_items bi
  join demo_id_map m on m.entity = 'budget_item' and m.old_id = bi.id
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = bi.project_id;

  insert into demo_id_map (entity, old_id, new_id)
  select 'file', f.id, gen_random_uuid()
  from files f
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = f.project_id;

  insert into files (
    id, project_id, kind, name, storage_path, mime_type, size_bytes,
    uploaded_by, created_at, status, category, project_vendor_id
  )
  select
    m.new_id,
    pm.new_id,
    f.kind, f.name,
    f.storage_path,  -- as-is; points at template object (no storage copy)
    f.mime_type, f.size_bytes,
    v_uid, f.created_at, f.status, f.category,
    case
      when f.project_vendor_id is null then null
      else (select pvm.new_id from demo_id_map pvm where pvm.entity = 'project_vendor' and pvm.old_id = f.project_vendor_id)
    end
  from files f
  join demo_id_map m on m.entity = 'file' and m.old_id = f.id
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = f.project_id;

  insert into demo_id_map (entity, old_id, new_id)
  select 'vendor_target', vt.id, gen_random_uuid()
  from vendor_targets vt
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = vt.project_id;

  insert into vendor_targets (
    id, project_id, category, note, status, created_at, project_vendor_id
  )
  select
    m.new_id,
    pm.new_id,
    vt.category, vt.note, vt.status, vt.created_at,
    case
      when vt.project_vendor_id is null then null
      else (select pvm.new_id from demo_id_map pvm where pvm.entity = 'project_vendor' and pvm.old_id = vt.project_vendor_id)
    end
  from vendor_targets vt
  join demo_id_map m on m.entity = 'vendor_target' and m.old_id = vt.id
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = vt.project_id;

  -- outreach_messages: SKIP

  -- guest_members: related_to_member_id NULL first, remap second pass
  insert into demo_id_map (entity, old_id, new_id)
  select 'guest_member', gm.id, gen_random_uuid()
  from guest_members gm
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = gm.project_id;

  insert into guest_members (
    id, project_id, guest_id, name, meal_option_id, dietary_note, attending,
    sort_order, created_at, relationship_side, relationship, member_type,
    related_to_member_id
  )
  select
    m.new_id,
    pm.new_id,
    gm_map.new_id,
    gm.name,
    case
      when gm.meal_option_id is null then null
      else (select mom.new_id from demo_id_map mom where mom.entity = 'meal_option' and mom.old_id = gm.meal_option_id)
    end,
    gm.dietary_note, gm.attending, gm.sort_order, gm.created_at,
    gm.relationship_side, gm.relationship, gm.member_type,
    null  -- second pass
  from guest_members gm
  join demo_id_map m on m.entity = 'guest_member' and m.old_id = gm.id
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = gm.project_id
  join demo_id_map gm_map on gm_map.entity = 'guest' and gm_map.old_id = gm.guest_id;

  update guest_members gm_new
  set related_to_member_id = rel_map.new_id
  from guest_members gm_old
  join demo_id_map self_map
    on self_map.entity = 'guest_member' and self_map.old_id = gm_old.id
  join demo_id_map rel_map
    on rel_map.entity = 'guest_member' and rel_map.old_id = gm_old.related_to_member_id
  where gm_new.id = self_map.new_id
    and gm_old.related_to_member_id is not null
    and exists (
      select 1 from demo_id_map pm
      where pm.entity = 'project' and pm.old_id = gm_old.project_id
    );

  insert into demo_id_map (entity, old_id, new_id)
  select 'rsvp_submission', rs.id, gen_random_uuid()
  from rsvp_submissions rs
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = rs.project_id;

  insert into rsvp_submissions (
    id, project_id, name, response, party_size, email, message, status,
    created_at, matched_guest_id
  )
  select
    m.new_id,
    pm.new_id,
    rs.name, rs.response, rs.party_size, rs.email, rs.message, rs.status,
    rs.created_at,
    case
      when rs.matched_guest_id is null then null
      else (select gm.new_id from demo_id_map gm where gm.entity = 'guest' and gm.old_id = rs.matched_guest_id)
    end
  from rsvp_submissions rs
  join demo_id_map m on m.entity = 'rsvp_submission' and m.old_id = rs.id
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = rs.project_id;

  -- ---- L4 ----
  insert into demo_id_map (entity, old_id, new_id)
  select 'rsvp_attendee', ra.id, gen_random_uuid()
  from rsvp_attendees ra
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = ra.project_id;

  insert into rsvp_attendees (
    id, project_id, submission_id, meal_option_id, name, dietary_note,
    sort_order, created_at, song_request
  )
  select
    m.new_id,
    pm.new_id,
    sm.new_id,
    case
      when ra.meal_option_id is null then null
      else (select mom.new_id from demo_id_map mom where mom.entity = 'meal_option' and mom.old_id = ra.meal_option_id)
    end,
    ra.name, ra.dietary_note, ra.sort_order, ra.created_at, ra.song_request
  from rsvp_attendees ra
  join demo_id_map m on m.entity = 'rsvp_attendee' and m.old_id = ra.id
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = ra.project_id
  join demo_id_map sm on sm.entity = 'rsvp_submission' and sm.old_id = ra.submission_id;

  insert into demo_id_map (entity, old_id, new_id)
  select 'seating_assignment', sa.id, gen_random_uuid()
  from seating_assignments sa
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = sa.project_id;

  insert into seating_assignments (
    id, project_id, table_id, guest_id, seat_index, created_at, guest_member_id
  )
  select
    m.new_id,
    pm.new_id,
    tm.new_id,
    case
      when sa.guest_id is null then null
      else (select gm.new_id from demo_id_map gm where gm.entity = 'guest' and gm.old_id = sa.guest_id)
    end,
    sa.seat_index,
    sa.created_at,
    case
      when sa.guest_member_id is null then null
      else (select gmm.new_id from demo_id_map gmm where gmm.entity = 'guest_member' and gmm.old_id = sa.guest_member_id)
    end
  from seating_assignments sa
  join demo_id_map m on m.entity = 'seating_assignment' and m.old_id = sa.id
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = sa.project_id
  join demo_id_map tm on tm.entity = 'seating_table' and tm.old_id = sa.table_id;

  insert into demo_id_map (entity, old_id, new_id)
  select 'budget_payment', bp.id, gen_random_uuid()
  from budget_payments bp
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = bp.project_id;

  insert into budget_payments (
    id, project_id, budget_item_id, amount, paid_on, note, created_at
  )
  select
    m.new_id,
    pm.new_id,
    bim.new_id,
    bp.amount, bp.paid_on, bp.note, bp.created_at
  from budget_payments bp
  join demo_id_map m on m.entity = 'budget_payment' and m.old_id = bp.id
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = bp.project_id
  join demo_id_map bim on bim.entity = 'budget_item' and bim.old_id = bp.budget_item_id;

  insert into demo_id_map (entity, old_id, new_id)
  select 'payment_schedule', ps.id, gen_random_uuid()
  from payment_schedule ps
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = ps.project_id;

  insert into payment_schedule (
    id, project_id, budget_item_id, amount, due_on, label, created_at
  )
  select
    m.new_id,
    pm.new_id,
    bim.new_id,
    ps.amount, ps.due_on, ps.label, ps.created_at
  from payment_schedule ps
  join demo_id_map m on m.entity = 'payment_schedule' and m.old_id = ps.id
  join demo_id_map pm on pm.entity = 'project' and pm.old_id = ps.project_id
  join demo_id_map bim on bim.entity = 'budget_item' and bim.old_id = ps.budget_item_id;

  return v_new_account_id;
end;
$$;

revoke all on function clone_demo_account(text) from public;
grant execute on function clone_demo_account(text) to authenticated;

-- ===== 0075_onboarding_business_no_project.sql =====

-- ============================================================
-- 0075_onboarding_business_no_project.sql
-- ONB-06: business (planner) bootstrap creates account +
-- account_members only — no placeholder project. Personal path
-- unchanged (account + member + one project). already_bootstrapped
-- still gates on account_members only.
-- ============================================================

create or replace function bootstrap_account_and_project(
  p_account_name text,
  p_account_kind text,
  p_project_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_project_id uuid;
  v_kind text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from account_members where user_id = auth.uid()) then
    raise exception 'already_bootstrapped' using errcode = 'P0001';
  end if;

  v_kind := coalesce(nullif(p_account_kind, ''), 'personal');

  insert into accounts (name, kind)
  values (p_account_name, v_kind)
  returning id into v_account_id;

  insert into account_members (account_id, user_id, role)
  values (v_account_id, auth.uid(), 'owner');

  if v_kind = 'business' then
    return null;
  end if;

  insert into projects (account_id, name)
  values (v_account_id, p_project_name)
  returning id into v_project_id;

  return v_project_id;
end;
$$;

-- ===== 0076_couple_trial_payment_method.sql =====

-- ============================================================
-- 0076_couple_trial_payment_method.sql
-- PRICE-03: save card on $7 couple trial-week Checkout for the
-- day-7 $92 off-session charge (PRICE-04). Nullable; unused by
-- planner rows. Same free-text posture as other Stripe id columns.
-- ============================================================

alter table subscriptions
  add column if not exists stripe_payment_method_id text;

-- ===== 0077_couple_trial_final_charge.sql =====

-- ============================================================
-- 0077_couple_trial_final_charge.sql
-- PRICE-04: atomic claim + fail-closed helpers for the day-7
-- $92 off-session charge. service_role only (Edge Function).
-- No new columns — uses stripe_payment_method_id from 0076 and
-- a local transitional status 'charging' (no CHECK on status).
-- ============================================================

create or replace function claim_couple_trial_charges()
returns table (
  account_id uuid,
  stripe_customer_id text,
  stripe_payment_method_id text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Postgres requires DML + RETURNING to be a CTE, not a subquery in FROM —
  -- that's what the original syntax error was. The `c.` qualification below
  -- (not bare `account_id`) is what actually avoids ambiguity with this
  -- function's own OUT parameters of the same names — the wrapper Cursor
  -- was originally reaching for, just written as a valid construct.
  return query
  with c as (
    update subscriptions as s
    set
      status = 'charging',
      updated_at = now()
    from accounts a
    where s.account_id = a.id
      and a.kind = 'personal'
      and s.status = 'trialing'
      and s.stripe_subscription_id is null
      and s.stripe_payment_method_id is not null
      and s.current_period_end <= now()
    returning s.account_id, s.stripe_customer_id, s.stripe_payment_method_id
  )
  select c.account_id, c.stripe_customer_id, c.stripe_payment_method_id
  from c;
end;
$$;

revoke all on function claim_couple_trial_charges() from public;
grant execute on function claim_couple_trial_charges() to service_role;

create or replace function mark_couple_trial_charge_failed(p_account_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update subscriptions
  set
    status = 'canceled',
    updated_at = now()
  where account_id = p_account_id;
$$;

revoke all on function mark_couple_trial_charge_failed(uuid) from public;
grant execute on function mark_couple_trial_charge_failed(uuid) to service_role;

-- ===== 0078_couple_trial_cancellation.sql =====

-- ============================================================
-- 0078_couple_trial_cancellation.sql
-- PRICE-05: couple can cancel (or resume) before the day-7 $92
-- charge. Sets cancel_at_period_end; claim_couple_trial_charges
-- excludes canceled rows. No new column.
-- ============================================================

create or replace function set_couple_trial_cancellation(p_account_id uuid, p_cancel boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_account_member(p_account_id) then
    raise exception 'not authorized';
  end if;

  update subscriptions
  set cancel_at_period_end = p_cancel, updated_at = now()
  where account_id = p_account_id
    and status = 'trialing'
    and stripe_subscription_id is null
    and current_period_end > now();
end;
$$;

revoke all on function set_couple_trial_cancellation(uuid, boolean) from public;
grant execute on function set_couple_trial_cancellation(uuid, boolean) to authenticated;

-- PRICE-04 claim: skip trials that opted out of the day-7 charge.
create or replace function claim_couple_trial_charges()
returns table (
  account_id uuid,
  stripe_customer_id text,
  stripe_payment_method_id text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Postgres requires DML + RETURNING to be a CTE, not a subquery in FROM —
  -- that's what the original syntax error was. The `c.` qualification below
  -- (not bare `account_id`) is what actually avoids ambiguity with this
  -- function's own OUT parameters of the same names — the wrapper Cursor
  -- was originally reaching for, just written as a valid construct.
  return query
  with c as (
    update subscriptions as s
    set
      status = 'charging',
      updated_at = now()
    from accounts a
    where s.account_id = a.id
      and a.kind = 'personal'
      and s.status = 'trialing'
      and s.stripe_subscription_id is null
      and s.stripe_payment_method_id is not null
      and s.current_period_end <= now()
      and s.cancel_at_period_end = false
    returning s.account_id, s.stripe_customer_id, s.stripe_payment_method_id
  )
  select c.account_id, c.stripe_customer_id, c.stripe_payment_method_id
  from c;
end;
$$;

revoke all on function claim_couple_trial_charges() from public;
grant execute on function claim_couple_trial_charges() to service_role;

COMMIT;
