-- ============================================================
-- 0052_payment_schedule.sql
-- BUD-SCHED-01: dated installments per budget item (owed timeline).
-- Additive / re-runnable. Does NOT drop budget_items.due_date.
-- Backfill: existing due_date → one "Balance" installment (once).
-- WRITE-01: can_access_project gate — sharp edge for future viewer.
-- ============================================================

create table if not exists payment_schedule (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null,
  budget_item_id uuid not null,
  amount         numeric(12,2) not null,
  due_on         date not null,
  label          text,
  created_at     timestamptz not null default now()
);

alter table payment_schedule drop constraint if exists payment_schedule_item_fkey;
alter table payment_schedule add constraint payment_schedule_item_fkey
  foreign key (project_id, budget_item_id) references budget_items (project_id, id)
  on delete cascade;

create index if not exists payment_schedule_item_idx on payment_schedule (budget_item_id);
create index if not exists payment_schedule_project_idx on payment_schedule (project_id);
create index if not exists payment_schedule_due_idx on payment_schedule (project_id, due_on);

alter table payment_schedule enable row level security;

drop policy if exists "payment schedule accessible by project members" on payment_schedule;
create policy "payment schedule accessible by project members" on payment_schedule
  for all to authenticated
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

-- Backfill: each existing due_date → one "Balance" installment. No-op on re-run
-- (skips if any schedule row already exists).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'budget_items'
      and column_name = 'due_date'
  )
  and not exists (select 1 from payment_schedule) then
    insert into payment_schedule (project_id, budget_item_id, amount, due_on, label)
    select project_id, id, coalesce(actual_amount, 0), due_date, 'Balance'
    from budget_items
    where due_date is not null;
  end if;
end $$;
