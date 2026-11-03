-- ============================================================
-- 20261102050000_contract_terms_proposals.sql
-- AGENTIC-08: assistant proposals gain 'contract_terms' — payment
-- installments, deadline tasks, and a vendor arrival time pulled from an
-- uploaded contract, applied only on approval. No new tables, columns or
-- policies. Re-runnable. Hand-paste only — never supabase db push.
-- ============================================================

alter table assistant_proposals drop constraint if exists assistant_proposals_kind_check;
alter table assistant_proposals add constraint assistant_proposals_kind_check
  check (kind in (
    'budget_change', 'vendor_quote', 'checklist_replan',
    'rsvp_reminder', 'seating_plan', 'contract_terms'
  ));

-- Checkpoint after paste:
--   select pg_get_constraintdef(oid) from pg_constraint where conname = 'assistant_proposals_kind_check';
