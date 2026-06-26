-- ============================================================
-- 0015_timeline_events.sql
-- The day-of run sheet: time-ordered events for the wedding day, distinct
-- from the checklist (which is the long-range planning timeline). One ordered
-- list with an optional section grouping and an optional free-text owner.
-- Used by both couple and planner surfaces. Apply AFTER 0014.
-- ============================================================

create table timeline_events (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null,
  description text,
  start_time  time,                 -- time of day, e.g. 14:00
  end_time    time,
  section     text,                 -- optional grouping: Rehearsal, Ceremony, Reception
  owner       text,                 -- optional: who's responsible (Photographer, DJ, MOH)
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index on timeline_events (project_id, start_time, position);

alter table timeline_events enable row level security;

create policy "timeline_events readable by project members"
  on timeline_events for select
  using (can_access_project(project_id));

create policy "timeline_events writable by project members"
  on timeline_events for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));