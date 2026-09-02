-- ============================================================
-- 0102_invoices.sql
-- INVOICE-01: planner invoicing with an external payment link.
-- Account-member RLS only — invited couples/collaborators get zero
-- authenticated access. Their view is the public token page.
-- account_id is denormalized for RLS (automation_runs posture) and
-- pinned to the project's account by trigger (0029 spirit).
-- Anon surface: get_invoice_by_token(token) — SECURITY DEFINER,
-- token-gated read, no project_id / account_id in the payload.
-- Next-free after 0101_assistant_thread_audience.sql.
-- ============================================================

-- ---------- invoices ----------
create table if not exists invoices (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references projects (id) on delete cascade,
  account_id        uuid not null references accounts (id) on delete cascade,
  client_name       text,
  client_email      text,
  status            text not null default 'draft',
  issue_date        date not null default current_date,
  due_date          date,
  payment_link_url  text,
  notes             text,
  access_token      text not null unique
                    default encode(extensions.gen_random_bytes(16), 'hex'),
  paid_at           timestamptz,
  sent_at           timestamptz,
  created_at        timestamptz not null default now(),
  constraint invoices_status_check
    check (status in ('draft', 'sent', 'paid', 'void'))
);

create index if not exists invoices_project_idx
  on invoices (project_id);

create index if not exists invoices_account_idx
  on invoices (account_id);

alter table invoices enable row level security;

grant select, insert, update, delete on invoices to authenticated;

drop policy if exists "invoices managed by account members" on invoices;
create policy "invoices managed by account members"
  on invoices for all
  to authenticated
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- Pin account_id to the owning project on insert; immutable after.
create or replace function guard_invoice_account_id()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_account_id uuid;
begin
  select p.account_id into v_account_id
  from projects p
  where p.id = new.project_id;

  if v_account_id is null then
    raise exception 'invoice_project_not_found' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' then
    new.account_id := v_account_id;
    return new;
  end if;

  if new.account_id is distinct from old.account_id then
    raise exception 'invoice_account_id_immutable' using errcode = 'P0001';
  end if;
  if new.account_id is distinct from v_account_id then
    raise exception 'invoice_account_id_mismatch' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists invoices_account_id_guard on invoices;
create trigger invoices_account_id_guard
  before insert or update on invoices
  for each row
  execute function guard_invoice_account_id();

-- ---------- invoice_line_items ----------
create table if not exists invoice_line_items (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references invoices (id) on delete cascade,
  description  text not null,
  amount       numeric(10, 2) not null,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  constraint invoice_line_items_amount_check
    check (amount >= 0)
);

create index if not exists invoice_line_items_invoice_idx
  on invoice_line_items (invoice_id);

alter table invoice_line_items enable row level security;

grant select, insert, update, delete on invoice_line_items to authenticated;

drop policy if exists "invoice_line_items managed by account members"
  on invoice_line_items;
create policy "invoice_line_items managed by account members"
  on invoice_line_items for all
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

-- ---------- public token read ----------
-- Unknown token returns one row with invoice_found = false and nulls.
-- Never returns project_id, account_id, access_token, or another invoice.
create or replace function get_invoice_by_token(p_token text)
returns table (
  invoice_found     boolean,
  client_name       text,
  status            text,
  issue_date        date,
  due_date          date,
  payment_link_url  text,
  notes             text,
  total             numeric,
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
