-- ============================================================
-- 0025_seating_assignments.sql
-- Seats guests (0006) at tables (0024). project_id is denormalized onto
-- each row so RLS gates directly on it (consistent with every other
-- project-scoped table) instead of joining through seating_tables.
-- Apply AFTER 0024.
-- ============================================================

create table seating_assignments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  table_id    uuid not null references seating_tables(id) on delete cascade,
  guest_id    uuid not null references guests(id) on delete cascade,
  seat_index  int check (seat_index >= 0),   -- nullable; table-level for now,
                                              -- seat-specific UI is a later slice
  created_at  timestamptz not null default now(),

  -- A guest is seated in at most ONE place per project.
  unique (project_id, guest_id)
);

-- A specific seat at a table holds at most one guest. Multiple table-level
-- (null seat_index) assignments at the same table are allowed until the
-- seat-specific UI lands.
create unique index seating_assignments_table_seat_idx
  on seating_assignments (table_id, seat_index)
  where seat_index is not null;

create index seating_assignments_table_id_idx on seating_assignments (table_id);
create index seating_assignments_project_id_idx on seating_assignments (project_id);

-- NOTE: table occupancy (count of assignments at a table <= seat_count) is NOT
-- a DB constraint — Postgres CHECK can't span rows without a trigger. It is
-- enforced in the assignGuestToTable action as a value validation. RLS still
-- authorizes every write.

alter table seating_assignments enable row level security;

grant select, insert, update, delete on seating_assignments to authenticated;

create policy "seating_assignments_member_select" on seating_assignments
  for select to authenticated
  using (can_access_project(project_id));

create policy "seating_assignments_member_insert" on seating_assignments
  for insert to authenticated
  with check (can_access_project(project_id));

create policy "seating_assignments_member_update" on seating_assignments
  for update to authenticated
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

create policy "seating_assignments_member_delete" on seating_assignments
  for delete to authenticated
  using (can_access_project(project_id));
