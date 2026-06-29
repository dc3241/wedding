-- ============================================================
-- 0019_proposal_acceptance.sql
-- Acceptance timestamp and contract terms on proposals.
-- Apply AFTER 0018.
-- ============================================================

alter table proposals add column accepted_at timestamptz;
alter table proposals add column terms text;
