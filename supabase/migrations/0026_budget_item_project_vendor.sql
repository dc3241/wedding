-- ============================================================
-- 0026_budget_item_project_vendor.sql
-- Link a budget line item to a project_vendors involvement row.
-- Composite FK keeps the link same-project; RLS alone cannot.
-- Apply AFTER 0010 (budget_items) and 0004 (project_vendors).
-- ============================================================

-- Redundant with PK(id), but required as a composite FK target.
-- PK remains vendors_pkey (0004 rename artifact) — leave it alone.
alter table project_vendors
  add constraint project_vendors_project_id_id_key unique (project_id, id);

alter table budget_items
  add column project_vendor_id uuid;

-- Column-specific SET NULL (PG >= 15): null only project_vendor_id on vendor
-- delete; do not touch NOT NULL project_id.
alter table budget_items
  add constraint budget_items_project_vendor_fkey
  foreign key (project_id, project_vendor_id)
  references project_vendors (project_id, id)
  on delete set null (project_vendor_id);

-- One budget item per project vendor (a quote maps to one line).
create unique index budget_items_project_vendor_uidx
  on budget_items (project_id, project_vendor_id)
  where project_vendor_id is not null;

create index budget_items_project_vendor_id_idx
  on budget_items (project_vendor_id);
