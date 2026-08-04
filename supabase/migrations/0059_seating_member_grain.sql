-- 0059_seating_member_grain.sql — per-person seating grain.
-- Idempotent: no-ops on the already-migrated dev DB; runs from household grain on fresh prod.

-- 0. FK target — add only if absent (an FK may already depend on it; never drop it)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'guest_members_project_id_id_key') then
    alter table guest_members add constraint guest_members_project_id_id_key unique (project_id, id);
  end if;
end $$;

-- 1. member-grain column + composite FK (0026 pattern)
alter table seating_assignments add column if not exists guest_member_id uuid;
alter table seating_assignments drop constraint if exists seating_assignments_member_fk;
alter table seating_assignments add constraint seating_assignments_member_fk
  foreign key (project_id, guest_member_id)
  references guest_members (project_id, id) on delete cascade;

-- 2. drop household-grain unique before backfill
alter table seating_assignments
  drop constraint if exists seating_assignments_project_id_guest_id_key;

-- 3a. map each existing row to its first member (correlated subquery — the 42P10 fix)
update seating_assignments sa
set guest_member_id = (
  select gm.id from guest_members gm
  where gm.project_id = sa.project_id and gm.guest_id = sa.guest_id
  order by gm.sort_order, gm.created_at limit 1
)
where sa.guest_member_id is null;

-- 3b. insert remaining members of each seated household (idempotent)
insert into seating_assignments (project_id, table_id, guest_id, guest_member_id, seat_index)
select sa.project_id, sa.table_id, sa.guest_id, gm.id, null
from seating_assignments sa
join guest_members gm on gm.project_id = sa.project_id and gm.guest_id = sa.guest_id
where sa.guest_member_id is not null
  and gm.id <> sa.guest_member_id
  and not exists (
    select 1 from seating_assignments x
    where x.project_id = sa.project_id and x.guest_member_id = gm.id
  );

-- 4. member-grain unique (one seat per person)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'seating_assignments_project_id_guest_member_id_key') then
    alter table seating_assignments
      add constraint seating_assignments_project_id_guest_member_id_key unique (project_id, guest_member_id);
  end if;
end $$;

-- 5. guest_id write-dead
alter table seating_assignments alter column guest_id drop not null;