-- ============================================================
-- 0063_guest_member_association.sql
-- GST-12: plus-one / child association on guest_members.
-- member_type ∈ {adult, child}; related_to_member_id self-FK
-- (project-scoped, column-specific ON DELETE SET NULL).
-- Chain prevention (plus-one of a plus-one) is writer-enforced
-- at the action layer — deliberately NOT a trigger.
-- ============================================================

-- Composite FK target (already added in 0059; keep if-absent for re-run).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'guest_members_project_id_id_key'
  ) then
    alter table guest_members
      add constraint guest_members_project_id_id_key unique (project_id, id);
  end if;
end $$;

alter table guest_members
  add column if not exists member_type text not null default 'adult';

alter table guest_members
  drop constraint if exists guest_members_member_type_check;

alter table guest_members
  add constraint guest_members_member_type_check
  check (member_type in ('adult', 'child'));

alter table guest_members
  add column if not exists related_to_member_id uuid;

alter table guest_members
  drop constraint if exists guest_members_related_to_fk;

-- Column-specific SET NULL (PG >= 15 / 0026 pattern): orphan the
-- association only — never null project_id (tenancy key, NOT NULL).
alter table guest_members
  add constraint guest_members_related_to_fk
  foreign key (project_id, related_to_member_id)
  references guest_members (project_id, id)
  on delete set null (related_to_member_id);

alter table guest_members
  drop constraint if exists guest_members_no_self_ref;

alter table guest_members
  add constraint guest_members_no_self_ref
  check (related_to_member_id is null or related_to_member_id <> id);

create index if not exists guest_members_related_to_member_id_idx
  on guest_members (related_to_member_id);
