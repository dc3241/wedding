-- ============================================================
-- 0051_budget_payments.sql
-- BUD-03: per-item due_date + project-scoped payment ledger.
-- Additive / re-runnable. Paste by hand — do not db push.
-- actual_amount is NOT renamed (now means Actual/cost; Paid = ledger).
-- NO backfill. NO contracted_amount.
-- WRITE-01: budget_payments writes gate on can_access_project — sharp edge.
-- ============================================================

-- Due date: "due in full to vendor" (date only — no timestamp).
alter table budget_items
  add column if not exists due_date date;

-- Composite FK target for budget_payments (PK alone is not enough).
create unique index if not exists budget_items_project_id_id_key
  on budget_items (project_id, id);

create table if not exists budget_payments (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  budget_item_id  uuid not null,
  amount          numeric(12,2) not null,
  paid_on         date,
  note            text,
  created_at      timestamptz not null default now(),
  constraint budget_payments_item_fkey
    foreign key (project_id, budget_item_id)
    references budget_items (project_id, id)
    on delete cascade
);

create index if not exists budget_payments_budget_item_id_idx
  on budget_payments (budget_item_id);

create index if not exists budget_payments_project_id_idx
  on budget_payments (project_id);

alter table budget_payments enable row level security;

drop policy if exists "budget_payments writable by project members" on budget_payments;
create policy "budget_payments writable by project members"
  on budget_payments for all to authenticated
  using (can_access_project(project_id))
  with check (can_access_project(project_id));
