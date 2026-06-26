-- ============================================================
-- 0006_guests.sql
-- Project-scoped guest list with RSVP + meal tracking. Used by both
-- the couple and planner surfaces. Follows the tasks/vendors pattern.
-- Apply AFTER 0001-0005.
-- ============================================================

create table guests (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  full_name   text not null,
  email       text,
  phone       text,
  household   text,                  -- groups a party/family onto one line
  party_size  integer not null default 1,
  rsvp_status text not null default 'pending'
                check (rsvp_status in ('pending', 'attending', 'declined')),
  meal_choice text,
  notes       text,
  created_at  timestamptz not null default now()
);

create index on guests (project_id, household, full_name);

alter table guests enable row level security;

create policy "guests readable by project members"
  on guests for select
  using (can_access_project(project_id));

create policy "guests writable by project members"
  on guests for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));