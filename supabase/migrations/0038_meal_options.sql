-- ============================================================
-- 0038_meal_options.sql
-- Couple-authored meal choices + catering service style (MEAL-01).
-- Style rides wedding_websites (existing anon read — ZERO new surfaces).
-- meal_options is anon surface #5: SELECT only when the site is published.
-- Writes gated on can_edit_project (WRITE-01 exemplar). No RSVP / guests changes.
-- ============================================================

-- Service style on the website row — rides Public read of published wedding websites.
alter table wedding_websites
  add column if not exists meal_service_style text not null default 'none';

alter table wedding_websites
  drop constraint if exists wedding_websites_meal_service_style_check;

alter table wedding_websites
  add constraint wedding_websites_meal_service_style_check
  check (meal_service_style in ('none', 'plated', 'buffet', 'family_style', 'stations'));

-- Couple-managed entrée / meal choices. Public RSVP wiring is MEAL-02.
create table if not exists meal_options (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,
  description text,
  is_kids     boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists meal_options_project_id_idx on meal_options (project_id);

alter table meal_options enable row level security;

-- READ: any project member.
drop policy if exists "members read meal options" on meal_options;
create policy "members read meal options" on meal_options
  for select using (can_access_project(project_id));

-- WRITE: editors only. Deliberately can_edit_project (NOT can_access_project) so a future
-- viewer role cannot mutate meal options. Do not weaken to can_access_project.
drop policy if exists "editors insert meal options" on meal_options;
create policy "editors insert meal options" on meal_options
  for insert with check (can_edit_project(project_id));

drop policy if exists "editors update meal options" on meal_options;
create policy "editors update meal options" on meal_options
  for update using (can_edit_project(project_id)) with check (can_edit_project(project_id));

drop policy if exists "editors delete meal options" on meal_options;
create policy "editors delete meal options" on meal_options
  for delete using (can_edit_project(project_id));

-- Anon READ surface #5: published sites only. Draft options must not leak.
drop policy if exists "anon read meal options" on meal_options;
create policy "anon read meal options" on meal_options
  for select to anon
  using (exists (
    select 1 from wedding_websites w
    where w.project_id = meal_options.project_id and w.published = true
  ));
