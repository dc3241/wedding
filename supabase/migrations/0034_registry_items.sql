-- ============================================================
-- 0034_registry_items.sql
-- Couple-managed gift registry items (REG-01). Read for any
-- project member; writes gated on can_edit_project so a future
-- viewer role cannot mutate. No claims / public exposure yet.
-- ============================================================

create table if not exists registry_items (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  name            text not null,
  price           numeric(12,2),           -- display-only; never a budget headline
  image_url       text,                    -- hotlinked; no uploads in v1
  buy_url         text,                    -- link-out target; store label derived at render
  quantity_wanted integer not null default 1 check (quantity_wanted >= 1),
  note            text,
  created_at      timestamptz not null default now()
);

create index if not exists registry_items_project_id_idx on registry_items (project_id);

alter table registry_items enable row level security;

-- READ: any project member (couple, planner, invited couple) — read-alike gate.
drop policy if exists "members read registry items" on registry_items;
create policy "members read registry items" on registry_items
  for select using (can_access_project(project_id));

-- WRITE: editors only. Deliberately can_edit_project (NOT can_access_project) so a future
-- viewer role cannot mutate the registry. Do not weaken to can_access_project.
drop policy if exists "editors insert registry items" on registry_items;
create policy "editors insert registry items" on registry_items
  for insert with check (can_edit_project(project_id));

drop policy if exists "editors update registry items" on registry_items;
create policy "editors update registry items" on registry_items
  for update using (can_edit_project(project_id)) with check (can_edit_project(project_id));

drop policy if exists "editors delete registry items" on registry_items;
create policy "editors delete registry items" on registry_items
  for delete using (can_edit_project(project_id));
