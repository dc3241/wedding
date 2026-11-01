-- ============================================================
-- 20261101000000_assistant_usage.sql
-- COUPLES-PIVOT part 3: meter what the assistant + agentic runs cost
-- each account, so the paid assistant plan can be capped to hold a
-- 50%+ margin (budgets live in lib/billing/assistant-budget.ts).
--
-- One row per assistant run (chat message or cron pass), billed to the
-- account that OWNS the project. cost_micros = USD x 1,000,000,
-- computed at write time from the model's token usage.
--
-- Service-role only (same posture as agent_run_log): no anon or
-- authenticated policies. App code reads totals through
-- assistant_usage_total(), called with the service-role client.
--
-- Re-runnable. Hand-paste only — never supabase db push.
-- ============================================================

create table if not exists assistant_usage (
  id                          uuid primary key default gen_random_uuid(),
  account_id                  uuid not null references accounts (id) on delete cascade,
  project_id                  uuid references projects (id) on delete set null,
  source                      text not null,
  model                       text not null,
  input_tokens                integer not null default 0 check (input_tokens >= 0),
  output_tokens               integer not null default 0 check (output_tokens >= 0),
  cache_creation_input_tokens integer not null default 0 check (cache_creation_input_tokens >= 0),
  cache_read_input_tokens     integer not null default 0 check (cache_read_input_tokens >= 0),
  cost_micros                 bigint not null default 0 check (cost_micros >= 0),
  created_at                  timestamptz not null default now()
);

alter table assistant_usage drop constraint if exists assistant_usage_source_check;
alter table assistant_usage add constraint assistant_usage_source_check
  check (source in ('chat', 'synthesis', 'implication_scan', 'outreach_scan'));

create index if not exists assistant_usage_account_created_idx
  on assistant_usage (account_id, created_at);

alter table assistant_usage enable row level security;
-- Intentionally no policies: service-role writes and reads only.

create or replace function public.assistant_usage_total(
  p_account_id uuid,
  p_since timestamptz
)
returns bigint
language sql
stable
set search_path = public
as $$
  select coalesce(sum(cost_micros), 0)::bigint
  from assistant_usage
  where account_id = p_account_id
    and created_at >= p_since;
$$;

revoke all on function public.assistant_usage_total(uuid, timestamptz) from public;
revoke all on function public.assistant_usage_total(uuid, timestamptz) from anon, authenticated;
grant execute on function public.assistant_usage_total(uuid, timestamptz) to service_role;

-- Checkpoint after paste:
--   select to_regclass('public.assistant_usage');                       -- not null
--   select to_regprocedure('public.assistant_usage_total(uuid,timestamptz)'); -- not null
--   select count(*) from pg_policies where tablename = 'assistant_usage';     -- 0
