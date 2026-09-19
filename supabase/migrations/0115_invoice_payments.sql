-- ============================================================
-- 0115_invoice_payments.sql
-- INVOICE-02: payment ledger for planner/venue invoices.
-- First Look still never processes the payment — this records
-- what arrived (Venmo, Zelle, check, cash, Stripe link, other).
-- Collected / remaining / status (partial|paid) derive from the
-- ledger. Status CHECK gains `partial`. get_invoice_by_token
-- returns collected + remaining for the public page.
-- Account-member RLS only (same as invoices / line items).
-- Backfill: one `other` row per already-paid invoice with a total.
-- Re-runnable. Hand-paste only — never supabase db push.
-- Next-free after 0114_drop_admin_automations.sql.
-- ============================================================

-- ---------- status: add partial ----------
alter table invoices drop constraint if exists invoices_status_check;
alter table invoices add constraint invoices_status_check
  check (status in ('draft', 'sent', 'partial', 'paid', 'void'));

-- ---------- invoice_payments ----------
create table if not exists invoice_payments (
  id             uuid primary key default gen_random_uuid(),
  invoice_id     uuid not null references invoices (id) on delete cascade,
  amount         numeric(12, 2) not null,
  paid_on        date not null default current_date,
  method         text not null default 'other',
  note           text,
  external_ref   text,
  created_at     timestamptz not null default now(),
  constraint invoice_payments_amount_check
    check (amount > 0),
  constraint invoice_payments_method_check
    check (method in ('venmo', 'zelle', 'check', 'cash', 'stripe_link', 'other'))
);

create index if not exists invoice_payments_invoice_idx
  on invoice_payments (invoice_id);

create index if not exists invoice_payments_paid_on_idx
  on invoice_payments (paid_on);

alter table invoice_payments enable row level security;

grant select, insert, update, delete on invoice_payments to authenticated;

drop policy if exists "invoice_payments managed by account members"
  on invoice_payments;
create policy "invoice_payments managed by account members"
  on invoice_payments for all
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

-- Backfill paid invoices that have a positive total and no ledger yet.
insert into invoice_payments (invoice_id, amount, paid_on, method, note)
select
  i.id,
  totals.total,
  coalesce(i.paid_at::date, i.issue_date, current_date),
  'other',
  'Recorded as paid before the payment ledger'
from invoices i
join lateral (
  select coalesce(sum(li.amount), 0)::numeric(12, 2) as total
  from invoice_line_items li
  where li.invoice_id = i.id
) totals on true
where i.status = 'paid'
  and totals.total > 0
  and not exists (
    select 1 from invoice_payments p where p.invoice_id = i.id
  );

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
  line_items        jsonb
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
    )
  from invoices i
  where i.id = v_id;
end;
$$;

revoke all on function get_invoice_by_token(text) from public;
grant execute on function get_invoice_by_token(text) to anon, authenticated;
