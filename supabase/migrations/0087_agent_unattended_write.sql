-- ============================================================
-- 0087_agent_unattended_write.sql
-- AGENT-01a: audit column for impersonated writes + smoke
-- trigger_kind for the one-shot plumbing test. No RLS change —
-- unattended writes use a real authenticated session.
--
-- acted_as_user_id is null for read-only runs (AGENT-01 synthesis).
-- Recorded whenever a run performs an impersonated write.
-- ============================================================

alter table agent_run_log
  add column if not exists acted_as_user_id uuid references auth.users (id);

alter table agent_run_log
  drop constraint if exists agent_run_log_trigger_kind_check;

alter table agent_run_log
  add constraint agent_run_log_trigger_kind_check
  check (trigger_kind in (
    'synthesis',
    'implication_scan',
    'outreach_scan',
    'inquiry',
    'smoke'
  ));
