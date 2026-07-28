-- ============================================================
-- 0040_guest_members.sql
-- Per-person guest grain + RSVP→guest match (MEAL-03).
-- Backfills meal_choice into dietary_note; does NOT drop meal_choice
-- (0041 / MEAL-03a after live verification). No anon surfaces.
-- ============================================================

-- Composite FK target (redundant with PK(id); required for same-project FKs).
create unique index if not exists guests_project_id_key
  on guests (project_id, id);

create table if not exists guest_members (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null,
  guest_id        uuid not null,
  name            text,
  meal_option_id  uuid,
  dietary_note    text,
  attending       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),

  foreign key (project_id, guest_id)
    references guests (project_id, id)
    on delete cascade,

  -- Column-specific SET NULL (PG >= 15 / 0026 pattern).
  foreign key (project_id, meal_option_id)
    references meal_options (project_id, id)
    on delete set null (meal_option_id)
);

create index if not exists guest_members_guest_id_idx
  on guest_members (guest_id);

alter table guest_members enable row level security;

grant select, insert, update, delete on guest_members to authenticated;

-- READ: any project member.
drop policy if exists "members read guest members" on guest_members;
create policy "members read guest members" on guest_members
  for select to authenticated
  using (can_access_project(project_id));

-- WRITE: editors only (WRITE-01 day-one). Do not weaken to can_access_project.
drop policy if exists "editors insert guest members" on guest_members;
create policy "editors insert guest members" on guest_members
  for insert to authenticated
  with check (can_edit_project(project_id));

drop policy if exists "editors update guest members" on guest_members;
create policy "editors update guest members" on guest_members
  for update to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));

drop policy if exists "editors delete guest members" on guest_members;
create policy "editors delete guest members" on guest_members
  for delete to authenticated
  using (can_edit_project(project_id));

-- Match pointer on RSVP submissions (couple confirmation only).
alter table rsvp_submissions
  add column if not exists matched_guest_id uuid;

alter table rsvp_submissions
  drop constraint if exists rsvp_submissions_matched_guest_fkey;

alter table rsvp_submissions
  add constraint rsvp_submissions_matched_guest_fkey
  foreign key (project_id, matched_guest_id)
  references guests (project_id, id)
  on delete set null (matched_guest_id);

-- Conservative backfill: preserve free-text meal_choice as dietary_note.
-- Do not map to meal_option_id. Do not fabricate members from party_size.
-- Idempotent via not-exists guard.
insert into guest_members (project_id, guest_id, name, dietary_note, attending)
select
  g.project_id,
  g.id,
  null,
  g.meal_choice,
  (g.rsvp_status = 'attending')
from guests g
where g.meal_choice is not null
  and not exists (
    select 1 from guest_members m where m.guest_id = g.id
  );
