-- ============================================================
-- 20261102040000_seating_rules.sql
-- AGENTIC-07: seating rules + assistant-proposed seating plans.
--
--  * seating_rules — "keep together" / "keep apart" pairs at the
--    guest_members (person) grain, project-scoped. A household already
--    sits together; rules cover everything else (e.g. two friends, or
--    two relatives who shouldn't share a table).
--  * assistant_proposals.kind gains 'seating_plan' (approve-before-write).
--
-- RLS mirrors seating: SELECT can_access_project, writes can_edit_project.
-- Not an anon surface. Re-runnable. Hand-paste only — never db push.
-- ============================================================

create table if not exists seating_rules (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,
  kind        text not null,
  member_a    uuid not null,
  member_b    uuid not null,
  note        text,
  created_at  timestamptz not null default now(),
  constraint seating_rules_kind_check check (kind in ('together', 'apart')),
  constraint seating_rules_distinct check (member_a <> member_b),
  -- Stored with member_a < member_b so each pair has one canonical form.
  constraint seating_rules_ordered check (member_a < member_b),
  foreign key (project_id, member_a) references guest_members (project_id, id) on delete cascade,
  foreign key (project_id, member_b) references guest_members (project_id, id) on delete cascade
);

create unique index if not exists seating_rules_pair_key
  on seating_rules (project_id, kind, member_a, member_b);

create index if not exists seating_rules_project_idx
  on seating_rules (project_id);

alter table seating_rules enable row level security;

grant select, insert, update, delete on seating_rules to authenticated;

drop policy if exists "seating_rules readable by project members" on seating_rules;
create policy "seating_rules readable by project members"
  on seating_rules for select to authenticated
  using (can_access_project(project_id));

drop policy if exists "seating_rules insertable by editors" on seating_rules;
create policy "seating_rules insertable by editors"
  on seating_rules for insert to authenticated
  with check (can_edit_project(project_id));

drop policy if exists "seating_rules deletable by editors" on seating_rules;
create policy "seating_rules deletable by editors"
  on seating_rules for delete to authenticated
  using (can_edit_project(project_id));

alter table assistant_proposals drop constraint if exists assistant_proposals_kind_check;
alter table assistant_proposals add constraint assistant_proposals_kind_check
  check (kind in ('budget_change', 'vendor_quote', 'checklist_replan', 'rsvp_reminder', 'seating_plan'));

-- Checkpoint after paste:
--   select to_regclass('public.seating_rules');                                  -- not null
--   select cmd from pg_policies where tablename = 'seating_rules' order by cmd;  -- DELETE, INSERT, SELECT
--   select pg_get_constraintdef(oid) from pg_constraint where conname = 'assistant_proposals_kind_check';
