-- ============================================================
-- 0119_lead_project.sql
-- CRM-01: optional link from a lead to the wedding/booking created
-- when an accepted proposal is converted. ON DELETE SET NULL so
-- removing a project does not delete the lead.
-- Re-runnable. Hand-paste only — never supabase db push.
-- Next-free after 0118_invoice_proposal.sql.
-- ============================================================

alter table leads
  add column if not exists project_id uuid references projects (id) on delete set null;

create index if not exists leads_project_idx on leads (project_id);
