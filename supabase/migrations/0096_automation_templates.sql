-- ============================================================
-- 0096_automation_templates.sql
-- WORKFLOW-05: curated template layer on automation_workflows.
-- template_key is null for hand-built workflows. Non-null values
-- live in lib/automations/templates.ts (no DB CHECK) — same
-- posture as user_tours.tour_key. Partial unique index: at most
-- one row per (account, template).
--
-- Next-free after 0095_workflow_send_email.sql.
-- ============================================================

alter table automation_workflows
  add column if not exists template_key text;

create unique index if not exists automation_workflows_one_per_template
  on automation_workflows (account_id, template_key)
  where template_key is not null;
