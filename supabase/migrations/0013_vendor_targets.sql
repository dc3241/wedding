-- ============================================================
-- 0013_vendor_targets.sql
-- "Vendor categories to book" — distinct from actual vendor records. The AI
-- starting plan seeds these (Photographer, Caterer, Florist...) and the couple
-- fills each by discovering + booking a real vendor later.
-- Apply AFTER 0012.
-- ============================================================

create table vendor_targets (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  category    text not null,
  note        text,
  status      text not null default 'needed'
                check (status in ('needed', 'booked', 'skipped')),
  created_at  timestamptz not null default now()
);

create index on vendor_targets (project_id);

alter table vendor_targets enable row level security;

create policy "vendor_targets readable by project members"
  on vendor_targets for select
  using (can_access_project(project_id));

create policy "vendor_targets writable by project members"
  on vendor_targets for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));