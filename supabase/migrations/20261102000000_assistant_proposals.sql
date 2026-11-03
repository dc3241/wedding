-- ============================================================
-- 20261102000000_assistant_proposals.sql
-- AGENTIC-01: propose-then-approve queue for assistant changes that are
-- NOT outbound email (those stay in agent_drafts). First producer is
-- `budget_change` (assistant proposes a set of budget edits; the couple
-- approves, then the app applies them through the normal budget writers).
--
-- Account-scoped via is_account_member, like agent_drafts. No DELETE
-- policy: proposals are history. Invited project members have no
-- account_members row, so they never see these (same posture as drafts).
--
-- Re-runnable. Hand-paste only — never supabase db push.
-- Timestamped name on purpose: numbered 0138 would sort before the
-- existing 2026* files (see bible v45).
-- ============================================================

create table if not exists assistant_proposals (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references accounts (id) on delete cascade,
  project_id   uuid not null references projects (id) on delete cascade,
  kind         text not null,
  title        text not null,
  summary      text,
  payload      jsonb not null,
  status       text not null default 'pending',
  error        text,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references auth.users (id) on delete set null,
  foreign key (account_id, project_id) references projects (account_id, id)
);

alter table assistant_proposals drop constraint if exists assistant_proposals_kind_check;
alter table assistant_proposals add constraint assistant_proposals_kind_check
  check (kind in ('budget_change'));

alter table assistant_proposals drop constraint if exists assistant_proposals_status_check;
alter table assistant_proposals add constraint assistant_proposals_status_check
  check (status in ('pending', 'applied', 'rejected', 'failed'));

create index if not exists assistant_proposals_project_status_idx
  on assistant_proposals (project_id, status, created_at desc);

alter table assistant_proposals enable row level security;

drop policy if exists "assistant_proposals readable by account members" on assistant_proposals;
create policy "assistant_proposals readable by account members"
  on assistant_proposals for select to authenticated
  using (is_account_member(account_id));

drop policy if exists "assistant_proposals insertable by account members" on assistant_proposals;
create policy "assistant_proposals insertable by account members"
  on assistant_proposals for insert to authenticated
  with check (is_account_member(account_id));

drop policy if exists "assistant_proposals updatable by account members" on assistant_proposals;
create policy "assistant_proposals updatable by account members"
  on assistant_proposals for update to authenticated
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- Checkpoint after paste:
--   select to_regclass('public.assistant_proposals');                          -- not null
--   select cmd from pg_policies where tablename = 'assistant_proposals';       -- select, insert, update (no delete)
--   select pg_get_constraintdef(oid) from pg_constraint
--     where conname in ('assistant_proposals_kind_check','assistant_proposals_status_check');
