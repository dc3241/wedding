-- ============================================================
-- 0014_assistant_messages.sql
-- Per-project conversation history for the in-app AI assistant. Used by both
-- the couple and planner surfaces (project-scoped). Apply AFTER 0013.
-- ============================================================

create table assistant_messages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_by  uuid default auth.uid() references auth.users(id),
  created_at  timestamptz not null default now()
);

create index on assistant_messages (project_id, created_at);

alter table assistant_messages enable row level security;

create policy "assistant_messages readable by project members"
  on assistant_messages for select
  using (can_access_project(project_id));

create policy "assistant_messages writable by project members"
  on assistant_messages for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));