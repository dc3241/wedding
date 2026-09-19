-- ============================================================
-- 0116_invoice_schedule.sql
-- INVOICE-03: dated installments on planner/venue invoices.
-- Waterfall coverage is derived at read from invoice_payments
-- (same idea as payment_schedule / budget_payments). First Look
-- still never processes the payment.
-- invoice_reminder_log is service-role cron only (AUTO-01 posture).
-- get_invoice_by_token gains a schedule jsonb payload (no ids).
-- Backfill: due_date + no schedule → one Balance row for the total.
-- Re-runnable. Hand-paste only — never supabase db push.
-- Next-free after 0115_invoice_payments.sql.
-- ============================================================

-- ---------- invoice_schedule ----------
create table if not exists invoice_schedule (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references invoices (id) on delete cascade,
  amount       numeric(12, 2) not null,
  due_on       date not null,
  label        text,
  created_at   timestamptz not null default now(),
  constraint invoice_schedule_amount_check
    check (amount > 0)
);

create index if not exists invoice_schedule_invoice_idx
  on invoice_schedule (invoice_id);

create index if not exists invoice_schedule_due_idx
  on invoice_schedule (due_on);

alter table invoice_schedule enable row level security;

grant select, insert, update, delete on invoice_schedule to authenticated;

drop policy if exists "invoice_schedule managed by account members"
  on invoice_schedule;
create policy "invoice_schedule managed by account members"
  on invoice_schedule for all
  to authenticated
  using (
    is_account_member(
      (select account_id from invoices where id = invoice_id)
    )
  )
  with check (
    is_account_member(
      (select account_id from invoices where id = invoice_id)
    )
  );

-- Existing due_date with no plan yet → one Balance installment.
insert into invoice_schedule (invoice_id, amount, due_on, label)
select
  i.id,
  totals.total,
  i.due_date,
  'Balance'
from invoices i
join lateral (
  select coalesce(sum(li.amount), 0)::numeric(12, 2) as total
  from invoice_line_items li
  where li.invoice_id = i.id
) totals on true
where i.due_date is not null
  and i.status <> 'void'
  and totals.total > 0
  and not exists (
    select 1 from invoice_schedule s where s.invoice_id = i.id
  );

-- ---------- reminder log (cron / service-role only) ----------
create table if not exists invoice_reminder_log (
  id                   uuid primary key default gen_random_uuid(),
  invoice_schedule_id  uuid not null references invoice_schedule (id) on delete cascade,
  invoice_id           uuid not null references invoices (id) on delete cascade,
  reminder_kind        text not null,
  sent_at              timestamptz not null default now(),
  constraint invoice_reminder_log_kind_check
    check (reminder_kind in ('due_7', 'due_0', 'overdue_first', 'overdue_recurring'))
);

create unique index if not exists invoice_reminder_log_oneshot_idx
  on invoice_reminder_log (invoice_schedule_id, reminder_kind)
  where reminder_kind in ('due_7', 'due_0', 'overdue_first');

create index if not exists invoice_reminder_log_schedule_idx
  on invoice_reminder_log (invoice_schedule_id);

alter table invoice_reminder_log enable row level security;
-- No policies for anon/authenticated — service_role only.

-- ---------- public token read (return type change → drop + create) ----------
drop function if exists get_invoice_by_token(text);

create function get_invoice_by_token(p_token text)
returns table (
  invoice_found     boolean,
  client_name       text,
  status            text,
  issue_date        date,
  due_date          date,
  payment_link_url  text,
  notes             text,
  total             numeric,
  collected         numeric,
  remaining         numeric,
  line_items        jsonb,
  schedule          jsonb
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_id uuid;
begin
  if nullif(btrim(coalesce(p_token, '')), '') is null then
    invoice_found := false;
    return next;
    return;
  end if;

  select i.id into v_id
  from invoices i
  where i.access_token = btrim(p_token);

  if v_id is null then
    invoice_found := false;
    return next;
    return;
  end if;

  return query
  select
    true,
    i.client_name,
    i.status,
    i.issue_date,
    i.due_date,
    i.payment_link_url,
    i.notes,
    coalesce(
      (select sum(li.amount) from invoice_line_items li where li.invoice_id = i.id),
      0
    ),
    coalesce(
      (select sum(p.amount) from invoice_payments p where p.invoice_id = i.id),
      0
    ),
    greatest(
      coalesce(
        (select sum(li.amount) from invoice_line_items li where li.invoice_id = i.id),
        0
      )
      - coalesce(
        (select sum(p.amount) from invoice_payments p where p.invoice_id = i.id),
        0
      ),
      0
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'description', li.description,
            'amount', li.amount,
            'sort_order', li.sort_order
          )
          order by li.sort_order, li.created_at
        )
        from invoice_line_items li
        where li.invoice_id = i.id
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'amount', s.amount,
            'due_on', s.due_on,
            'label', s.label
          )
          order by s.due_on, s.created_at
        )
        from invoice_schedule s
        where s.invoice_id = i.id
      ),
      '[]'::jsonb
    )
  from invoices i
  where i.id = v_id;
end;
$$;

revoke all on function get_invoice_by_token(text) from public;
grant execute on function get_invoice_by_token(text) to anon, authenticated;
