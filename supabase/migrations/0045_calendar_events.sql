-- ============================================================
-- 0045_calendar_events.sql
-- Account-scoped planner calendar events (CAL-01).
-- Composite FK keeps project links same-account; column-specific
-- SET NULL (project_id) so delete does not touch NOT NULL account_id.
-- ============================================================

-- Enabling unique for the composite FK target (0026 pattern). id is PK, so this is trivially unique.
create unique index if not exists projects_account_id_id_key on projects (account_id, id);

create table if not exists calendar_events (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  project_id  uuid,                 -- optional link to one of THIS account's weddings
  title       text not null,
  event_kind  text not null default 'meeting'
              check (event_kind in ('meeting','call','site_visit','tasting','fitting','deadline','other')),
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  all_day     boolean not null default false,
  location    text,
  notes       text,
  created_at  timestamptz not null default now()
);

-- Composite FK: an event can only link to a project in its OWN account.
-- Column-specific SET NULL (project_id) is MANDATORY — a bare SET NULL would try to null the
-- NOT NULL account_id (0026 lesson).
alter table calendar_events drop constraint if exists calendar_events_project_fkey;
alter table calendar_events add constraint calendar_events_project_fkey
  foreign key (account_id, project_id) references projects (account_id, id)
  on delete set null (project_id);

create index if not exists calendar_events_account_starts_idx on calendar_events (account_id, starts_at);

alter table calendar_events enable row level security;
drop policy if exists "calendar events managed by account members" on calendar_events;
create policy "calendar events managed by account members" on calendar_events
  for all to authenticated
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
