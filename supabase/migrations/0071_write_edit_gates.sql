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
