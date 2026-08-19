-- ============================================================
-- 0094_automation_foundation.sql
-- WORKFLOW-00: account-scoped CRM automation engine (schema + RLS).
-- Trigger → step workflows, parallel to AGENT-*/AUTO-* — different
-- dispatch model (event + delay, not a fixed cron scan). This slice
-- ships tables and policies only. No trigger hooks, no dispatcher,
-- no send_email action_kind (that later slice goes through
-- agent_drafts propose-then-approve, never a direct send).
--
-- automation_run_log: audit trail. RLS on, zero policies — same
-- posture as agent_run_log / 0086 and payment_reminder_log / 0084.
--
-- automation_steps has no account_id. RLS joins through
-- workflow_id, matching outreach_messages → leads in 0090
-- (is_account_member((select account_id from …))).
--
-- automation_runs.target_id is polymorphic (lead | project) and
-- un-FK'd — same posture as agent_drafts.target_id.
--
-- Next-free after 0093_inquiry_branding.sql.
-- ============================================================

-- ---------- automation_workflows ----------
create table if not exists automation_workflows (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references accounts (id) on delete cascade,
  name            text not null,
  trigger_kind    text not null,
  trigger_config  jsonb not null default '{}'::jsonb,
  enabled         boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint automation_workflows_trigger_kind_check
    check (trigger_kind in (
      'lead_stage_changed',
      'lead_created',
      'project_created'
    ))
);

create index if not exists automation_workflows_account_idx
  on automation_workflows (account_id);

alter table automation_workflows enable row level security;

grant select, insert, update, delete on automation_workflows to authenticated;

drop policy if exists "automation_workflows readable by account members"
  on automation_workflows;
create policy "automation_workflows readable by account members"
  on automation_workflows for select
  to authenticated
  using (is_account_member(account_id));

drop policy if exists "automation_workflows insertable by account members"
  on automation_workflows;
create policy "automation_workflows insertable by account members"
  on automation_workflows for insert
  to authenticated
  with check (is_account_member(account_id));

drop policy if exists "automation_workflows updatable by account members"
  on automation_workflows;
create policy "automation_workflows updatable by account members"
  on automation_workflows for update
  to authenticated
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

drop policy if exists "automation_workflows deletable by account members"
  on automation_workflows;
create policy "automation_workflows deletable by account members"
  on automation_workflows for delete
  to authenticated
  using (is_account_member(account_id));

-- ---------- automation_steps ----------
-- No denormalized account_id — RLS resolves it through workflow_id.
create table if not exists automation_steps (
  id              uuid primary key default gen_random_uuid(),
  workflow_id     uuid not null references automation_workflows (id) on delete cascade,
  position        integer not null,
  action_kind     text not null,
  action_config   jsonb not null default '{}'::jsonb,
  delay_days      integer not null default 0,
  created_at      timestamptz not null default now(),
  constraint automation_steps_action_kind_check
    check (action_kind in (
      'create_task',
      'change_lead_stage',
      'add_note'
    )),
  constraint automation_steps_delay_days_check
    check (delay_days >= 0),
  constraint automation_steps_workflow_id_position_key
    unique (workflow_id, position)
);

create unique index if not exists automation_steps_workflow_id_position_key
  on automation_steps (workflow_id, position);

alter table automation_steps enable row level security;

grant select, insert, update, delete on automation_steps to authenticated;

drop policy if exists "automation_steps readable by account members"
  on automation_steps;
create policy "automation_steps readable by account members"
  on automation_steps for select
  to authenticated
  using (
    is_account_member(
      (select account_id from automation_workflows where id = workflow_id)
    )
  );

drop policy if exists "automation_steps insertable by account members"
  on automation_steps;
create policy "automation_steps insertable by account members"
  on automation_steps for insert
  to authenticated
  with check (
    is_account_member(
      (select account_id from automation_workflows where id = workflow_id)
    )
  );

drop policy if exists "automation_steps updatable by account members"
  on automation_steps;
create policy "automation_steps updatable by account members"
  on automation_steps for update
  to authenticated
  using (
    is_account_member(
      (select account_id from automation_workflows where id = workflow_id)
    )
  )
  with check (
    is_account_member(
      (select account_id from automation_workflows where id = workflow_id)
    )
  );

drop policy if exists "automation_steps deletable by account members"
  on automation_steps;
create policy "automation_steps deletable by account members"
  on automation_steps for delete
  to authenticated
  using (
    is_account_member(
      (select account_id from automation_workflows where id = workflow_id)
    )
  );

-- ---------- automation_runs ----------
-- account_id is denormalized for RLS. target_id has no FK.
create table if not exists automation_runs (
  id                      uuid primary key default gen_random_uuid(),
  workflow_id             uuid not null references automation_workflows (id) on delete cascade,
  account_id              uuid not null references accounts (id) on delete cascade,
  target_kind             text not null,
  target_id               uuid not null,
  current_step_position   integer,
  status                  text not null default 'pending',
  next_due_at             timestamptz,
  started_at              timestamptz,
  completed_at            timestamptz,
  created_at              timestamptz not null default now(),
  constraint automation_runs_target_kind_check
    check (target_kind in ('lead', 'project')),
  constraint automation_runs_status_check
    check (status in (
      'pending',
      'running',
      'completed',
      'failed',
      'cancelled'
    ))
);

create index if not exists automation_runs_account_status_idx
  on automation_runs (account_id, status);

create index if not exists automation_runs_workflow_idx
  on automation_runs (workflow_id);

alter table automation_runs enable row level security;

grant select, insert, update, delete on automation_runs to authenticated;

drop policy if exists "automation_runs readable by account members"
  on automation_runs;
create policy "automation_runs readable by account members"
  on automation_runs for select
  to authenticated
  using (is_account_member(account_id));

drop policy if exists "automation_runs insertable by account members"
  on automation_runs;
create policy "automation_runs insertable by account members"
  on automation_runs for insert
  to authenticated
  with check (is_account_member(account_id));

drop policy if exists "automation_runs updatable by account members"
  on automation_runs;
create policy "automation_runs updatable by account members"
  on automation_runs for update
  to authenticated
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

drop policy if exists "automation_runs deletable by account members"
  on automation_runs;
create policy "automation_runs deletable by account members"
  on automation_runs for delete
  to authenticated
  using (is_account_member(account_id));

-- ---------- automation_run_log ----------
create table if not exists automation_run_log (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references automation_runs (id) on delete cascade,
  step_id      uuid references automation_steps (id) on delete set null,
  executed_at  timestamptz not null default now(),
  outcome      text not null,
  detail       text,
  created_at   timestamptz not null default now(),
  constraint automation_run_log_outcome_check
    check (outcome in ('ok', 'error', 'skipped'))
);

create index if not exists automation_run_log_run_idx
  on automation_run_log (run_id);

alter table automation_run_log enable row level security;
-- No policies for anon/authenticated — service_role only.
