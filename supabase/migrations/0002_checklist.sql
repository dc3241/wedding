-- ============================================================
-- 0002_checklist.sql
-- Wedding checklist / timeline. Project-scoped, reuses can_access_project().
-- due_date can be seeded from projects.wedding_date minus an offset to
-- auto-generate a starter timeline (the "generate my checklist" feature).
-- vendor_id links a task to the vendor it concerns ("Book photographer" ->
-- that vendor row) — this is the seam between the checklist and the
-- vendor relationship system you want to hang your hat on.
-- ============================================================

create table tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null,
  status      text not null default 'todo'
                check (status in ('todo', 'in_progress', 'done')),
  phase       text,                 -- bucket: '12+ months', '9 months', '6 months', 'week of'...
  due_date    date,                 -- absolute; seed from wedding_date - offset
  vendor_id   uuid references vendors(id) on delete set null,
  position    integer not null default 0,
  notes       text,
  created_at  timestamptz not null default now()
);

create index on tasks (project_id, phase, position);

alter table tasks enable row level security;

create policy "tasks readable by project members"
  on tasks for select
  using (can_access_project(project_id));

create policy "tasks writable by project members"
  on tasks for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));
