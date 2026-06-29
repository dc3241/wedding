-- ============================================================
-- 0016_contract_status.sql
-- Optional contract status on files rows (draft / sent / signed).
-- Nullable with no default — notes-tab uploads stay null; UI treats null as draft.
-- Apply AFTER 0015.
-- ============================================================

alter table files add column status text;

alter table files add constraint files_status_check
  check (status is null or status in ('draft', 'sent', 'signed'));
