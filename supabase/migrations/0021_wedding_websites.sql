-- ============================================================
-- 0021_wedding_websites.sql
-- Project-scoped wedding website (auth-only in 3.6a; public read in 3.6b).
-- Self-contained content snapshot on the row; template + theme for presentation.
-- Apply AFTER 0020.
-- ============================================================

create table wedding_websites (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null unique references projects(id) on delete cascade,
  slug        text,
  published   boolean not null default false,
  template    text not null default 'classic',
  theme       text not null default 'ivory',
  content     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index wedding_websites_slug_idx
  on wedding_websites (slug)
  where slug is not null;

alter table wedding_websites enable row level security;

create policy "wedding_websites readable by project members"
  on wedding_websites for select
  using (can_access_project(project_id));

create policy "wedding_websites writable by project members"
  on wedding_websites for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));
