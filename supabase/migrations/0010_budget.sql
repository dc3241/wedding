-- ============================================================
-- 0010_budget.sql
-- Budget: an overall target on the project, plus manual budget line items.
-- Vendor costs are NOT duplicated here — they're read live from
-- project_vendors (quoted_price where status = 'booked').
-- Apply AFTER your latest migration (0009).
-- ============================================================

-- Overall budget target the couple sets (nullable until they set it).
alter table projects add column total_budget numeric(12,2);
-- (Updating this is already covered by the existing "members update projects" policy.)

-- Manual line items for non-vendor expenses (attire, favors, misc).
create table budget_items (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  category       text,                    -- e.g. attire, decor, stationery
  label          text not null,           -- the line item name
  planned_amount numeric(12,2) not null default 0,
  actual_amount  numeric(12,2),           -- optional: what was actually paid
  notes          text,
  created_at     timestamptz not null default now()
);

create index on budget_items (project_id, category);

alter table budget_items enable row level security;

create policy "budget_items readable by project members"
  on budget_items for select
  using (can_access_project(project_id));

create policy "budget_items writable by project members"
  on budget_items for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));