-- ============================================================
-- 0048_budget_label_optional.sql
-- BUD-05: budget_items.label is optional (Vendor Name before booking).
-- Re-runnable. Drops NOT NULL only — no CHECK, no default, no data change.
-- category and project_vendor_id untouched.
-- ============================================================

alter table budget_items alter column label drop not null;
