-- ============================================================
-- 0032_budget_item_vendor_many.sql
-- Allow one project_vendor to link to many budget_items.
-- Drops the 0026 partial unique index; keeps the non-unique
-- lookup index for joins. Paste by hand — do not db push.
-- ============================================================

drop index if exists budget_items_project_vendor_uidx;

-- Retained (0026): budget_items_project_vendor_id_idx on (project_vendor_id)
-- Non-unique — still the join/lookup path after many-lines-per-vendor.
