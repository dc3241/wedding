-- ============================================================
-- 0024_seating_tables.sql
-- Floor-plan tables for the seating chart. Project-scoped spatial
-- entities with canvas coordinates. Apply AFTER 0023.
-- ============================================================

create table seating_tables (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  label       text not null,
  shape       text not null check (shape in ('round','square','rectangle')),
  seat_count  int not null check (seat_count between 1 and 20),
  kind        text not null default 'standard'
                check (kind in ('standard','sweetheart','head')),
  pos_x       numeric not null,
  pos_y       numeric not null,
  rotation    numeric not null default 0,
  created_at  timestamptz not null default now()
);

create index seating_tables_project_id_idx on seating_tables (project_id);

alter table seating_tables enable row level security;

grant select, insert, update, delete on seating_tables to authenticated;

create policy "seating_tables_member_select" on seating_tables
  for select to authenticated
  using (can_access_project(project_id));

create policy "seating_tables_member_insert" on seating_tables
  for insert to authenticated
  with check (can_access_project(project_id));

create policy "seating_tables_member_update" on seating_tables
  for update to authenticated
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

create policy "seating_tables_member_delete" on seating_tables
  for delete to authenticated
  using (can_access_project(project_id));
