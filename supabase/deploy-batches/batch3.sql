BEGIN;

-- ===== 0068_formality_and_vendor_priority.sql =====

-- ============================================================
-- 0068_formality_and_vendor_priority.sql
-- ONB-04: formality tone signal + priority vendor category ids
-- for plan-gen prompt directives (no code weighting).
-- ============================================================

alter table wedding_profile
  add column if not exists formality text,
  add column if not exists priority_vendor_category_ids text[] not null default '{}';

alter table wedding_profile
  drop constraint if exists wedding_profile_formality_check;
alter table wedding_profile
  add constraint wedding_profile_formality_check
  check (
    formality is null
    or formality in ('casual', 'semi-formal', 'formal', 'black-tie')
  );

alter table wedding_profile
  drop constraint if exists wedding_profile_priority_vendor_categories_check;
alter table wedding_profile
  add constraint wedding_profile_priority_vendor_categories_check
  check (
    priority_vendor_category_ids <@ array[
      'venue', 'caterer', 'florist', 'baker', 'hair-makeup', 'jewelry',
      'photographer', 'videographer', 'dj', 'band', 'officiant', 'planner',
      'rentals'
    ]::text[]
  );

-- ===== 0069_already_booked_vendor_categories.sql =====

-- ============================================================
-- 0069_already_booked_vendor_categories.sql
-- ONB-05: already-booked vendor category ids on wedding_profile,
-- plus commit_wedding_plan structural exclusion for vendor_targets
-- whose category is in that list (checklist remains prompt-only).
-- ============================================================

alter table wedding_profile
  add column if not exists already_booked_vendor_category_ids text[]
    not null default '{}';

alter table wedding_profile
  drop constraint if exists wedding_profile_already_booked_categories_check;
alter table wedding_profile
  add constraint wedding_profile_already_booked_categories_check
  check (
    already_booked_vendor_category_ids <@ array[
      'venue', 'caterer', 'florist', 'baker', 'hair-makeup', 'jewelry',
      'photographer', 'videographer', 'dj', 'band', 'officiant', 'planner',
      'rentals'
    ]::text[]
  );

-- ---- commit_wedding_plan: exclude already-booked from vendor_targets ----

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
  v_already_booked text[];
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
    wp.include_vendors,
    wp.already_booked_vendor_category_ids
  into
    v_onboarded_at,
    v_include_budget,
    v_include_checklist,
    v_include_vendors,
    v_already_booked
  from wedding_profile wp
  where wp.project_id = p_project_id;

  if not found then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  if v_onboarded_at is not null then
    raise exception 'already_committed' using errcode = 'P0001';
  end if;

  v_already_booked := coalesce(v_already_booked, '{}'::text[]);
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
    )
    where not (r.category = any (v_already_booked));
  end if;

  update wedding_profile
  set onboarded_at = now()
  where project_id = p_project_id;
end;
$$;

grant execute on function commit_wedding_plan(uuid, jsonb, jsonb, jsonb)
  to authenticated;

-- ===== 0070_account_branding.sql =====

-- ============================================================
-- 0070_account_branding.sql
-- WHITE-01: planner white-label branding (in-app CoupleShell only).
-- Columns + business-only CHECK; public brand-media bucket; narrow
-- get_project_branding RPC (authenticated, not anon). Members can
-- UPDATE their own accounts row so branding writes are not RLS no-ops.
-- Hand-paste / linked push — do not invent a second client writer.
-- ============================================================

-- 1) Branding columns on accounts
alter table accounts
  add column if not exists white_label_enabled boolean not null default false;

alter table accounts
  add column if not exists brand_name text;

alter table accounts
  add column if not exists brand_logo_url text;

alter table accounts
  add column if not exists brand_accent_color text;

alter table accounts
  drop constraint if exists accounts_white_label_business_only;

alter table accounts
  add constraint accounts_white_label_business_only
  check (white_label_enabled = false or kind = 'business');

-- 2) Account members may update their own account (branding writes).
-- SELECT remains member-only; do NOT add a project-member SELECT policy.
drop policy if exists "members update own account" on accounts;
create policy "members update own account"
  on accounts for update
  to authenticated
  using (is_account_member(id))
  with check (is_account_member(id));

-- 3) Public brand-media bucket — website-media posture, 5MB, no SVG.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-media', 'brand-media', true, 5242880,
  array[
    'image/png', 'image/jpeg', 'image/webp'
  ]
)
on conflict (id) do nothing;

drop policy if exists "brand media publicly readable" on storage.objects;
create policy "brand media publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'brand-media');

drop policy if exists "brand media insertable by account members" on storage.objects;
create policy "brand media insertable by account members"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'brand-media'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "brand media updatable by account members" on storage.objects;
create policy "brand media updatable by account members"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'brand-media'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'brand-media'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "brand media deletable by account members" on storage.objects;
create policy "brand media deletable by account members"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'brand-media'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  );

-- 4) Narrow branding read for project-accessible viewers (invited members).
-- Empty result = no branding. Not granted to anon.
create or replace function get_project_branding(p_project_id uuid)
returns table (
  brand_name text,
  brand_logo_url text,
  brand_accent_color text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not can_access_project(p_project_id) then
    return;
  end if;

  return query
    select a.brand_name, a.brand_logo_url, a.brand_accent_color
    from projects p
    join accounts a on a.id = p.account_id
    where p.id = p_project_id
      and a.kind = 'business'
      and a.white_label_enabled = true;
end;
$$;

grant execute on function get_project_branding(uuid) to authenticated;

-- ===== 0071_write_edit_gates.sql =====

-- ============================================================
-- 0071_write_edit_gates.sql
-- WRITE-01: project-scoped write policies must gate on
-- can_edit_project (not can_access_project) so a future viewer
-- role cannot mutate. SELECT policies stay on can_access_project.
--
-- Out of scope (unchanged): assistant_messages, outreach_messages,
-- rsvp_attendees (no INSERT — submit_rsvp is the sole writer).
-- Re-runnable: every DROP POLICY IF EXISTS + CREATE POLICY pair
-- is a no-op on re-paste.
-- ============================================================

-- ------------------------------------------------------------
-- ALL policies (separate SELECT policies left untouched)
-- ------------------------------------------------------------

drop policy if exists "budget_items writable by project members" on budget_items;
create policy "budget_items writable by project members"
  on budget_items for all to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));

-- Live name differs from 0051's original; drop both for re-paste safety.
drop policy if exists "budget payments accessible by project members" on budget_payments;
drop policy if exists "budget_payments writable by project members" on budget_payments;
create policy "budget payments accessible by project members"
  on budget_payments for all to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));

drop policy if exists "files writable by project members" on files;
create policy "files writable by project members"
  on files for all to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));

drop policy if exists "guests writable by project members" on guests;
create policy "guests writable by project members"
  on guests for all to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));

drop policy if exists "notes writable by project members" on notes;
create policy "notes writable by project members"
  on notes for all to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));

drop policy if exists "payment schedule accessible by project members" on payment_schedule;
create policy "payment schedule accessible by project members"
  on payment_schedule for all to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));

drop policy if exists "project_vendors writable by project members" on project_vendors;
create policy "project_vendors writable by project members"
  on project_vendors for all to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));

drop policy if exists "tasks writable by project members" on tasks;
create policy "tasks writable by project members"
  on tasks for all to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));

drop policy if exists "timeline_events writable by project members" on timeline_events;
create policy "timeline_events writable by project members"
  on timeline_events for all to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));

drop policy if exists "vendor_targets writable by project members" on vendor_targets;
create policy "vendor_targets writable by project members"
  on vendor_targets for all to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));

drop policy if exists "wedding_profile writable by project members" on wedding_profile;
create policy "wedding_profile writable by project members"
  on wedding_profile for all to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));

drop policy if exists "wedding_websites writable by project members" on wedding_websites;
create policy "wedding_websites writable by project members"
  on wedding_websites for all to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));

-- ------------------------------------------------------------
-- seating_assignments: INSERT / UPDATE / DELETE only (SELECT untouched)
-- ------------------------------------------------------------

drop policy if exists "seating_assignments_member_insert" on seating_assignments;
create policy "seating_assignments_member_insert"
  on seating_assignments for insert to authenticated
  with check (can_edit_project(project_id));

drop policy if exists "seating_assignments_member_update" on seating_assignments;
create policy "seating_assignments_member_update"
  on seating_assignments for update to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));

drop policy if exists "seating_assignments_member_delete" on seating_assignments;
create policy "seating_assignments_member_delete"
  on seating_assignments for delete to authenticated
  using (can_edit_project(project_id));

-- ------------------------------------------------------------
-- seating_tables: INSERT / UPDATE / DELETE only (SELECT untouched)
-- ------------------------------------------------------------

drop policy if exists "seating_tables_member_insert" on seating_tables;
create policy "seating_tables_member_insert"
  on seating_tables for insert to authenticated
  with check (can_edit_project(project_id));

drop policy if exists "seating_tables_member_update" on seating_tables;
create policy "seating_tables_member_update"
  on seating_tables for update to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));

drop policy if exists "seating_tables_member_delete" on seating_tables;
create policy "seating_tables_member_delete"
  on seating_tables for delete to authenticated
  using (can_edit_project(project_id));

-- ------------------------------------------------------------
-- rsvp_submissions: UPDATE / DELETE only (SELECT untouched)
-- ------------------------------------------------------------

drop policy if exists "rsvp_member_update" on rsvp_submissions;
create policy "rsvp_member_update"
  on rsvp_submissions for update to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));

drop policy if exists "rsvp_member_delete" on rsvp_submissions;
create policy "rsvp_member_delete"
  on rsvp_submissions for delete to authenticated
  using (can_edit_project(project_id));

-- ------------------------------------------------------------
-- calendar_events (CAL-02 dual-gate): keep is_account_member;
-- project branch → can_edit_project
-- ------------------------------------------------------------

drop policy if exists "calendar events managed by account or project members" on calendar_events;
create policy "calendar events managed by account or project members"
  on calendar_events
  for all
  to authenticated
  using (
    is_account_member(account_id)
    or (project_id is not null and can_edit_project(project_id))
  )
  with check (
    is_account_member(account_id)
    or (project_id is not null and can_edit_project(project_id))
  );

COMMIT;
