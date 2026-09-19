-- ============================================================
-- 0118_invoice_proposal.sql
-- INVOICE-05: link a planner invoice back to the accepted
-- proposal it was created from. Optional, on delete set null
-- so the invoice survives if the lead/proposal is removed.
-- Re-runnable. Hand-paste only — never supabase db push.
-- Next-free after 0117_invoice_document.sql.
-- ============================================================

alter table invoices
  add column if not exists proposal_id uuid references proposals (id) on delete set null;

create index if not exists invoices_proposal_idx
  on invoices (proposal_id);
