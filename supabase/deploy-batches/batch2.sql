BEGIN;

-- ===== 0060_calendar_project_access.sql =====

-- ============================================================
-- 0060_calendar_project_access.sql
-- Let project members manage calendar_events linked to a project
-- they can access (couple calendar + invited collaborators).
-- Account members retain full access to their account's events
-- (planner portfolio calendar, including project_id-null rows).
-- ============================================================

drop policy if exists "calendar events managed by account members" on calendar_events;
drop policy if exists "calendar events managed by account or project members" on calendar_events;

create policy "calendar events managed by account or project members"
  on calendar_events
  for all
  to authenticated
  using (
    is_account_member(account_id)
    or (project_id is not null and can_access_project(project_id))
  )
  with check (
    is_account_member(account_id)
    or (project_id is not null and can_access_project(project_id))
  );

-- ===== 0061_vendor_media_and_instagram.sql =====

-- ============================================================
-- 0061_vendor_media_and_instagram.sql
-- VND-11: private account-scoped vendor-media bucket + vendors.instagram
-- Path: {account_id}/{vendor_id}/{file} — foldername[1] = account_id.
-- PRIVATE (public=false). NO anon SELECT. Signed URLs for reads.
-- Hand-paste only — never supabase db push.
-- ============================================================

-- 1) Instagram handle / URL on the rolodex.
alter table vendors
  add column if not exists instagram text;

-- 2) Private bucket — same MIME + 25MB cap as website-media; NOT public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendor-media', 'vendor-media', false, 26214400,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/heic'
  ]
)
on conflict (id) do nothing;

-- 3) Authenticated-only access gated by account membership on folder[1].
drop policy if exists "vendor media readable by account members" on storage.objects;
create policy "vendor media readable by account members"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'vendor-media'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "vendor media insertable by account members" on storage.objects;
create policy "vendor media insertable by account members"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vendor-media'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "vendor media updatable by account members" on storage.objects;
create policy "vendor media updatable by account members"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'vendor-media'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'vendor-media'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "vendor media deletable by account members" on storage.objects;
create policy "vendor media deletable by account members"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'vendor-media'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  );

-- ===== 0062_notes_action_status.sql =====

-- ============================================================
-- 0062_notes_action_status.sql
-- Optional action lifecycle on project notes:
--   null           — ordinary note
--   needs_action   — pinned, rosewood indicator
--   done           — confirmed / completed
-- Hand-paste only — never supabase db push.
-- ============================================================

alter table notes
  add column if not exists action_status text;

alter table notes
  drop constraint if exists notes_action_status_check;

alter table notes
  add constraint notes_action_status_check
  check (action_status is null or action_status in ('needs_action', 'done'));

-- ===== 0063_guest_member_association.sql =====

-- ============================================================
-- 0063_guest_member_association.sql
-- GST-12: plus-one / child association on guest_members.
-- member_type ∈ {adult, child}; related_to_member_id self-FK
-- (project-scoped, column-specific ON DELETE SET NULL).
-- Chain prevention (plus-one of a plus-one) is writer-enforced
-- at the action layer — deliberately NOT a trigger.
-- ============================================================

-- Composite FK target (already added in 0059; keep if-absent for re-run).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'guest_members_project_id_id_key'
  ) then
    alter table guest_members
      add constraint guest_members_project_id_id_key unique (project_id, id);
  end if;
end $$;

alter table guest_members
  add column if not exists member_type text not null default 'adult';

alter table guest_members
  drop constraint if exists guest_members_member_type_check;

alter table guest_members
  add constraint guest_members_member_type_check
  check (member_type in ('adult', 'child'));

alter table guest_members
  add column if not exists related_to_member_id uuid;

alter table guest_members
  drop constraint if exists guest_members_related_to_fk;

-- Column-specific SET NULL (PG >= 15 / 0026 pattern): orphan the
-- association only — never null project_id (tenancy key, NOT NULL).
alter table guest_members
  add constraint guest_members_related_to_fk
  foreign key (project_id, related_to_member_id)
  references guest_members (project_id, id)
  on delete set null (related_to_member_id);

alter table guest_members
  drop constraint if exists guest_members_no_self_ref;

alter table guest_members
  add constraint guest_members_no_self_ref
  check (related_to_member_id is null or related_to_member_id <> id);

create index if not exists guest_members_related_to_member_id_idx
  on guest_members (related_to_member_id);

-- ===== 0064_seating_sweetheart_unique.sql =====

-- 0064_seating_sweetheart_unique.sql
-- One sweetheart table per project. kind='sweetheart' already allowed
-- (0024 / 0033); this migration does NOT touch the CHECK.

create unique index if not exists seating_tables_one_sweetheart_per_project
  on seating_tables (project_id)
  where kind = 'sweetheart';

-- ===== 0065_demo_account_clone.sql =====

-- ============================================================
-- 0065_demo_account_clone.sql
-- DEMO-01: per-visitor ephemeral demo accounts.
-- Clones a curated template (accounts.is_demo_template) into an
-- isolated is_demo account + project graph for auth.uid().
-- Hand-paste / linked push — do not invent a second client writer.
-- ============================================================

-- 1) Demo flags on accounts
alter table accounts
  add column if not exists is_demo boolean not null default false;

alter table accounts
  add column if not exists is_demo_template boolean not null default false;

alter table accounts
  add column if not exists demo_created_at timestamptz;

alter table accounts
  drop constraint if exists accounts_demo_not_both_check;

alter table accounts
  add constraint accounts_demo_not_both_check
  check (not (is_demo and is_demo_template));

-- 2) Clone RPC
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
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if p_kind is distinct from 'personal' and p_kind is distinct from 'business' then
    raise exception 'invalid_account_kind' using errcode = 'P0001';
  end if;

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

-- ===== 0066_user_tours.sql =====

-- ============================================================
-- 0066_user_tours.sql
-- TOUR-01: user-scoped page-tour dismissal state.
-- Composite PK (user_id, tour_key). No CHECK on tour_key —
-- new keys ship with in-code tour config, not migrations.
-- Re-runnable.
-- ============================================================

create table if not exists user_tours (
  user_id      uuid not null references auth.users(id) on delete cascade,
  tour_key     text not null,
  status       text not null check (status in ('completed', 'skipped')),
  dismissed_at timestamptz not null default now(),
  primary key (user_id, tour_key)
);

alter table user_tours enable row level security;

drop policy if exists "user tours own rows" on user_tours;
create policy "user tours own rows" on user_tours
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ===== 0067_commit_wedding_plan.sql =====

-- ============================================================
-- 0067_commit_wedding_plan.sql
-- ONB-02: category CHECKs on the four VENDOR_CATEGORIES columns,
-- plan-scope flags on wedding_profile, and atomic commit_wedding_plan
-- SECURITY DEFINER (replaces the three non-atomic client inserts in
-- commitPlan). Matches bootstrap_account_and_project conventions.
-- ============================================================

-- ---- Category CHECKs (canonical 13 ids from lib/vendor-categories.ts) ----

alter table vendor_targets
  drop constraint if exists vendor_targets_category_check;
alter table vendor_targets
  add constraint vendor_targets_category_check
  check (category in (
    'venue', 'caterer', 'florist', 'baker', 'hair-makeup', 'jewelry',
    'photographer', 'videographer', 'dj', 'band', 'officiant', 'planner',
    'rentals'
  ));

alter table vendors
  drop constraint if exists vendors_category_check;
alter table vendors
  add constraint vendors_category_check
  check (
    category is null
    or category in (
      'venue', 'caterer', 'florist', 'baker', 'hair-makeup', 'jewelry',
      'photographer', 'videographer', 'dj', 'band', 'officiant', 'planner',
      'rentals'
    )
  );

alter table files
  drop constraint if exists files_category_check;
alter table files
  add constraint files_category_check
  check (
    category is null
    or category in (
      'venue', 'caterer', 'florist', 'baker', 'hair-makeup', 'jewelry',
      'photographer', 'videographer', 'dj', 'band', 'officiant', 'planner',
      'rentals'
    )
  );

alter table contract_templates
  drop constraint if exists contract_templates_category_check;
alter table contract_templates
  add constraint contract_templates_category_check
  check (
    category is null
    or category in (
      'venue', 'caterer', 'florist', 'baker', 'hair-makeup', 'jewelry',
      'photographer', 'videographer', 'dj', 'band', 'officiant', 'planner',
      'rentals'
    )
  );

-- ---- Plan-scope flags (default true = today's behavior) ----

alter table wedding_profile
  add column if not exists include_budget boolean not null default true;
alter table wedding_profile
  add column if not exists include_checklist boolean not null default true;
alter table wedding_profile
  add column if not exists include_vendors boolean not null default true;

-- ---- Atomic plan commit ----

create or replace function commit_wedding_plan(
  p_project_id uuid,
  p_tasks jsonb,
  p_budget_items jsonb,
  p_vendor_targets jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_onboarded_at timestamptz;
  v_include_budget boolean;
  v_include_checklist boolean;
  v_include_vendors boolean;
  v_tasks jsonb;
  v_budget jsonb;
  v_vendors jsonb;
begin
  if not can_edit_project(p_project_id) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  select
    wp.onboarded_at,
    wp.include_budget,
    wp.include_checklist,
    wp.include_vendors
  into
    v_onboarded_at,
    v_include_budget,
    v_include_checklist,
    v_include_vendors
  from wedding_profile wp
  where wp.project_id = p_project_id;

  if not found then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  if v_onboarded_at is not null then
    raise exception 'already_committed' using errcode = 'P0001';
  end if;

  v_tasks := coalesce(p_tasks, '[]'::jsonb);
  v_budget := coalesce(p_budget_items, '[]'::jsonb);
  v_vendors := coalesce(p_vendor_targets, '[]'::jsonb);

  if v_include_checklist
     and jsonb_typeof(v_tasks) = 'array'
     and jsonb_array_length(v_tasks) > 0 then
    insert into tasks (project_id, title, phase, due_date, position)
    select
      p_project_id,
      r.title,
      r.phase,
      r.due_date,
      coalesce(r.position, 0)
    from jsonb_to_recordset(v_tasks) as r(
      title text,
      phase text,
      due_date date,
      position integer
    );
  end if;

  if v_include_budget
     and jsonb_typeof(v_budget) = 'array'
     and jsonb_array_length(v_budget) > 0 then
    insert into budget_items (
      project_id, category, label, planned_amount
    )
    select
      p_project_id,
      r.category,
      r.label,
      coalesce(r.planned_amount, 0)
    from jsonb_to_recordset(v_budget) as r(
      category text,
      label text,
      planned_amount numeric
    );
  end if;

  if v_include_vendors
     and jsonb_typeof(v_vendors) = 'array'
     and jsonb_array_length(v_vendors) > 0 then
    insert into vendor_targets (project_id, category, note, status)
    select
      p_project_id,
      r.category,
      r.note,
      coalesce(nullif(r.status, ''), 'needed')
    from jsonb_to_recordset(v_vendors) as r(
      category text,
      note text,
      status text
    );
  end if;

  update wedding_profile
  set onboarded_at = now()
  where project_id = p_project_id;
end;
$$;

grant execute on function commit_wedding_plan(uuid, jsonb, jsonb, jsonb)
  to authenticated;

COMMIT;
