-- ============================================================
-- 0009_notes.sql
-- Project-scoped notes (meeting notes, freeform). Follows the
-- tasks/guests pattern. Apply AFTER 0001-0008.
-- ============================================================

create table notes (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null default 'Untitled note',
  body        text,
  created_by  uuid default auth.uid() references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on notes (project_id, updated_at desc);

alter table notes enable row level security;

create policy "notes readable by project members"
  on notes for select
  using (can_access_project(project_id));

create policy "notes writable by project members"
  on notes for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));