-- ============================================================
-- 0117_invoice_document.sql
-- INVOICE-04: document quality on planner/venue invoices.
-- Qty × rate line items (tax/discount as kinds, not a tax engine),
-- INV-YYYY-NNN numbers, terms, account templates, and white-label
-- fields on get_invoice_by_token. First Look still never processes
-- the payment. Re-runnable. Hand-paste only — never supabase db push.
-- Next-free after 0116_invoice_schedule.sql.
-- ============================================================

-- ---------- invoice numbers ----------
create table if not exists invoice_counters (
  account_id  uuid not null references accounts (id) on delete cascade,
  year        integer not null,
  last_n      integer not null,
  primary key (account_id, year),
  constraint invoice_counters_year_check check (year >= 2000),
  constraint invoice_counters_last_n_check check (last_n >= 1)
);

alter table invoice_counters enable row level security;
-- No policies / grants — SECURITY DEFINER trigger only.

alter table invoices
  add column if not exists invoice_number text;

alter table invoices
  add column if not exists terms text;

create or replace function assign_invoice_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  y integer;
  n integer;
begin
  if nullif(btrim(coalesce(new.invoice_number, '')), '') is not null then
    new.invoice_number := btrim(new.invoice_number);
    return new;
  end if;

  y := extract(year from coalesce(new.issue_date, current_date))::integer;

  insert into invoice_counters (account_id, year, last_n)
  values (new.account_id, y, 1)
  on conflict (account_id, year)
  do update set last_n = invoice_counters.last_n + 1
  returning last_n into n;

  new.invoice_number := 'INV-' || y::text || '-' || lpad(n::text, 3, '0');
  return new;
end;
$$;

drop trigger if exists invoices_assign_number on invoices;
create trigger invoices_assign_number
  before insert on invoices
  for each row
  execute function assign_invoice_number();

do $$
declare
  r record;
  y integer;
  n integer;
  num text;
begin
  for r in
    select id, account_id, coalesce(issue_date, current_date) as d
    from invoices
    where invoice_number is null
    order by account_id, created_at, id
  loop
    y := extract(year from r.d)::integer;
    insert into invoice_counters (account_id, year, last_n)
    values (r.account_id, y, 1)
    on conflict (account_id, year)
    do update set last_n = invoice_counters.last_n + 1
    returning last_n into n;
    num := 'INV-' || y::text || '-' || lpad(n::text, 3, '0');
    update invoices set invoice_number = num where id = r.id;
  end loop;
end $$;

alter table invoices
  alter column invoice_number set not null;

create unique index if not exists invoices_account_number_idx
  on invoices (account_id, invoice_number);

-- ---------- line items: qty × rate + kind ----------
alter table invoice_line_items
  add column if not exists quantity numeric(10, 2);

alter table invoice_line_items
  add column if not exists unit_price numeric(10, 2);

alter table invoice_line_items
  add column if not exists kind text;

update invoice_line_items
set
  quantity = coalesce(quantity, 1),
  unit_price = coalesce(unit_price, amount),
  kind = coalesce(kind, 'item')
where quantity is null or unit_price is null or kind is null;

alter table invoice_line_items
  alter column quantity set default 1,
  alter column quantity set not null,
  alter column unit_price set default 0,
  alter column unit_price set not null,
  alter column kind set default 'item',
  alter column kind set not null;

alter table invoice_line_items
  drop constraint if exists invoice_line_items_amount_check;
alter table invoice_line_items
  drop constraint if exists invoice_line_items_kind_check;
alter table invoice_line_items
  drop constraint if exists invoice_line_items_quantity_check;
alter table invoice_line_items
  drop constraint if exists invoice_line_items_unit_price_check;
alter table invoice_line_items
  drop constraint if exists invoice_line_items_amount_sign_check;

alter table invoice_line_items
  add constraint invoice_line_items_kind_check
    check (kind in ('item', 'tax', 'discount')),
  add constraint invoice_line_items_quantity_check
    check (quantity > 0),
  add constraint invoice_line_items_unit_price_check
    check (unit_price >= 0),
  add constraint invoice_line_items_amount_sign_check
    check (
      (kind in ('item', 'tax') and amount >= 0)
      or (kind = 'discount' and amount <= 0)
    );

-- ---------- templates ----------
create table if not exists invoice_templates (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references accounts (id) on delete cascade,
  name         text not null,
  notes        text,
  terms        text,
  line_items   jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  constraint invoice_templates_name_check
    check (char_length(btrim(name)) > 0)
);

create index if not exists invoice_templates_account_idx
  on invoice_templates (account_id);

alter table invoice_templates enable row level security;

grant select, insert, update, delete on invoice_templates to authenticated;

drop policy if exists "invoice_templates managed by account members"
  on invoice_templates;
create policy "invoice_templates managed by account members"
  on invoice_templates for all
  to authenticated
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- ---------- public token read ----------
drop function if exists get_invoice_by_token(text);

create function get_invoice_by_token(p_token text)
returns table (
  invoice_found       boolean,
  invoice_number      text,
  client_name         text,
  status              text,
  issue_date          date,
  due_date            date,
  payment_link_url    text,
  notes               text,
  terms               text,
  total               numeric,
  collected           numeric,
  remaining           numeric,
  line_items          jsonb,
  schedule            jsonb,
  brand_name          text,
  brand_logo_url      text,
  brand_accent_color  text
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
    i.invoice_number,
    i.client_name,
    i.status,
    i.issue_date,
    i.due_date,
    i.payment_link_url,
    i.notes,
    i.terms,
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
            'sort_order', li.sort_order,
            'quantity', li.quantity,
            'unit_price', li.unit_price,
            'kind', li.kind
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
    ),
    case when a.white_label_enabled then a.brand_name else null end,
    case when a.white_label_enabled then a.brand_logo_url else null end,
    case when a.white_label_enabled then a.brand_accent_color else null end
  from invoices i
  join accounts a on a.id = i.account_id
  where i.id = v_id;
end;
$$;

revoke all on function get_invoice_by_token(text) from public;
grant execute on function get_invoice_by_token(text) to anon, authenticated;
