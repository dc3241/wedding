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
