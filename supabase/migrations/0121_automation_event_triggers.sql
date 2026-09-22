-- ============================================================
-- 0121_automation_event_triggers.sql
-- Expand CRM workflow triggers for proposal + invoice events
-- (Phase A). Email actions remain propose-then-approve.
-- ============================================================

alter table automation_workflows
  drop constraint if exists automation_workflows_trigger_kind_check;

alter table automation_workflows
  add constraint automation_workflows_trigger_kind_check
    check (trigger_kind in (
      'lead_stage_changed',
      'lead_created',
      'project_created',
      'proposal_status_changed',
      'invoice_sent',
      'payment_link_set',
      'invoice_marked_paid'
    ));
