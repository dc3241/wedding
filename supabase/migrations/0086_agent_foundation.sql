-- ============================================================
-- 0086_agent_foundation.sql
-- AGENT-00: agentic-automation plumbing. Schema + RLS only —
-- no tool-loop invocation, no create_agent_draft write tool,
-- no accounts.inquiry_slug (those ship with later slices).
--
-- agent_run_log: one row per triggered loop invocation (including
-- failed / capped / this slice's inert stub). Service-role written
-- and read only — RLS on, zero policies (same posture as
-- demo_start_attempts / 0073 and payment_reminder_log / 0084).
--
-- agent_drafts: propose-then-approve queue for AGENT-03 /
-- AUTO-03. Authenticated SELECT is is_account_member only —
-- outbound drafts are account CRM, not couple-facing. Invited
-- project members (no account_members row) must not see them.
-- That matches leads (0017), not calendar_events' dual-gate
-- (0060 / 0071). No authenticated INSERT/UPDATE in this slice;
-- approve/reject writers ship with AGENT-03.
--
-- target_id is polymorphic: vendors.id when kind = vendor_outreach,
-- leads.id when kind = inquiry_reply. No FK — the two parent
-- tables cannot share one. Partial unique index is the dedup
-- backstop (at most one pending draft per target).
-- ============================================================

create table if not exists agent_run_log (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects (id) on delete cascade,
  trigger_kind  text not null,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  outcome       text,
  summary       text,
  constraint agent_run_log_trigger_kind_check
    check (trigger_kind in (
      'synthesis',
      'implication_scan',
      'outreach_scan',
      'inquiry'
    )),
  constraint agent_run_log_outcome_check
    check (outcome is null or outcome in ('ok', 'capped', 'error'))
);

create index if not exists agent_run_log_project_started_idx
  on agent_run_log (project_id, started_at desc);

alter table agent_run_log enable row level security;
-- No policies for anon/authenticated — service_role only.

create table if not exists agent_drafts (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references accounts (id) on delete cascade,
  project_id   uuid,
  kind         text not null,
  target_id    uuid not null,
  subject      text,
  body         text,
  status       text not null default 'pending',
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid references auth.users (id),
  constraint agent_drafts_kind_check
    check (kind in ('vendor_outreach', 'inquiry_reply')),
  constraint agent_drafts_status_check
    check (status in ('pending', 'approved', 'rejected', 'sent'))
);

-- Same-account project link. Column-specific SET NULL (project_id)
-- is mandatory — a bare SET NULL would try to null NOT NULL account_id
-- (0045 / calendar_events).
alter table agent_drafts drop constraint if exists agent_drafts_project_fkey;
alter table agent_drafts add constraint agent_drafts_project_fkey
  foreign key (account_id, project_id) references projects (account_id, id)
  on delete set null (project_id);

-- At most one open draft per target. Dead until AGENT-03 inserts;
-- ship with the table so that slice does not reshape this migration.
create unique index if not exists agent_drafts_one_pending_per_target
  on agent_drafts (account_id, kind, target_id)
  where status = 'pending';

create index if not exists agent_drafts_account_status_idx
  on agent_drafts (account_id, status);

alter table agent_drafts enable row level security;

drop policy if exists "agent_drafts readable by account members" on agent_drafts;
create policy "agent_drafts readable by account members"
  on agent_drafts for select
  to authenticated
  using (is_account_member(account_id));
-- No INSERT / UPDATE / DELETE for authenticated in this slice.
