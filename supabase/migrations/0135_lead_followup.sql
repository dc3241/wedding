-- ============================================================
-- 0135_lead_followup.sql
-- Next follow-up on a lead: a date and a short action.
-- Nullable. Re-runnable. Hand-paste only — never supabase db push.
-- Next-free after 0134_demo_contract_text.sql.
-- ============================================================

alter table leads
  add column if not exists next_followup_on date;

alter table leads
  add column if not exists next_followup_action text;

create index if not exists leads_followup_idx
  on leads (account_id, next_followup_on)
  where next_followup_on is not null;
