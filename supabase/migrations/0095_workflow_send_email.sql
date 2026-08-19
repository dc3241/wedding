-- ============================================================
-- 0095_workflow_send_email.sql
-- WORKFLOW-03: allow send_email steps and workflow_email drafts.
-- send_email never sends from the dispatcher — it inserts a
-- pending agent_drafts row (kind = workflow_email). Human
-- Approve is the only send path (existing approveAgentDraft).
--
-- No new columns. action_config carries { subject, body }.
-- Next-free after 0094_automation_foundation.sql.
-- ============================================================

alter table automation_steps drop constraint if exists automation_steps_action_kind_check;
alter table automation_steps add constraint automation_steps_action_kind_check
  check (action_kind in ('create_task','change_lead_stage','add_note','send_email'));

alter table agent_drafts drop constraint if exists agent_drafts_kind_check;
alter table agent_drafts add constraint agent_drafts_kind_check
  check (kind in ('vendor_outreach','inquiry_reply','workflow_email'));
