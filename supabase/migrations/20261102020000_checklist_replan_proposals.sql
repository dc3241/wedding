-- ============================================================
-- 20261102020000_checklist_replan_proposals.sql
-- AGENTIC-05: assistant proposals gain 'checklist_replan' (approve-before-
-- write due-date changes and new tasks). No new tables, columns, or
-- policies. Re-runnable. Hand-paste only — never supabase db push.
-- ============================================================

alter table assistant_proposals drop constraint if exists assistant_proposals_kind_check;
alter table assistant_proposals add constraint assistant_proposals_kind_check
  check (kind in ('budget_change', 'vendor_quote', 'checklist_replan'));

-- Checkpoint after paste:
--   select pg_get_constraintdef(oid) from pg_constraint where conname = 'assistant_proposals_kind_check';
