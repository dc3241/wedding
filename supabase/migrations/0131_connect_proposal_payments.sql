-- ============================================================
-- 0131_connect_proposal_payments.sql
-- Proposal card payments for planner/venue accounts.
-- Direct charges on a connected account. First Look does not
-- take a cut and does not write these rows from the subscription
-- webhook. Pay stays optional; signing a proposal is unchanged.
-- Hand-paste only — never supabase db push.
-- ============================================================

create table if not exists stripe_connected_accounts (
  account_id            uuid primary key references accounts (id) on delete cascade,
  stripe_account_id     text not null,
  card_payments_status  text not null default 'pending',
  payouts_status        text not null default 'pending',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint stripe_connected_accounts_stripe_account_id_uidx
    unique (stripe_account_id),
  constraint stripe_connected_accounts_card_payments_status_check
    check (card_payments_status in ('active', 'pending', 'restricted', 'unsupported')),
  constraint stripe_connected_accounts_payouts_status_check
    check (payouts_status in ('active', 'pending', 'restricted', 'unsupported'))
);

create table if not exists proposal_payments (
  id                          uuid primary key default gen_random_uuid(),
  proposal_id                 uuid not null references proposals (id) on delete cascade,
  account_id                  uuid not null references accounts (id) on delete cascade,
  stripe_account_id           text not null,
  stripe_checkout_session_id  text not null,
  amount_cents                integer not null,
  currency                    text not null default 'usd',
  status                      text not null default 'pending',
  paid_at                     timestamptz,
  created_at                  timestamptz not null default now(),
  constraint proposal_payments_session_uidx unique (stripe_checkout_session_id),
  constraint proposal_payments_amount_check check (amount_cents > 0),
  constraint proposal_payments_currency_check check (currency = 'usd'),
  constraint proposal_payments_status_check
    check (status in ('pending', 'paid', 'failed'))
);

create index if not exists proposal_payments_proposal_idx
  on proposal_payments (proposal_id);

alter table stripe_connected_accounts enable row level security;
alter table proposal_payments enable row level security;

grant select on stripe_connected_accounts to authenticated;
grant select on proposal_payments to authenticated;

drop policy if exists "stripe_connected_accounts readable by account members"
  on stripe_connected_accounts;
create policy "stripe_connected_accounts readable by account members"
  on stripe_connected_accounts for select
  to authenticated
  using (is_account_member(account_id));

drop policy if exists "proposal_payments readable by account members"
  on proposal_payments;
create policy "proposal_payments readable by account members"
  on proposal_payments for select
  to authenticated
  using (is_account_member(account_id));

-- Return type changes, so replace cannot be create-or-replace.
drop function if exists get_proposal_by_token(text);

create function get_proposal_by_token(p_token text)
returns table (
  proposal_found      boolean,
  title               text,
  status              text,
  notes               text,
  terms               text,
  total               numeric,
  line_items          jsonb,
  accepted_at         timestamptz,
  signed_name         text,
  couple_name         text,
  wedding_date        date,
  account_name        text,
  brand_name          text,
  brand_logo_url      text,
  brand_accent_color  text,
  payments_ready      boolean,
  payment_status      text
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
    proposal_found := false;
    return next;
    return;
  end if;

  select p.id into v_id
  from proposals p
  where p.access_token = btrim(p_token)
    and p.status in ('sent', 'accepted', 'declined');

  if v_id is null then
    proposal_found := false;
    return next;
    return;
  end if;

  return query
  select
    true,
    p.title,
    p.status,
    p.notes,
    p.terms,
    p.total,
    p.line_items,
    p.accepted_at,
    p.signed_name,
    l.couple_name,
    l.wedding_date,
    a.name,
    case when a.white_label_enabled then a.brand_name else null end,
    case when a.white_label_enabled then a.brand_logo_url else null end,
    case when a.white_label_enabled then a.brand_accent_color else null end,
    exists (
      select 1
      from stripe_connected_accounts sca
      where sca.account_id = p.account_id
        and sca.card_payments_status = 'active'
    ),
    (
      select pp.status
      from proposal_payments pp
      where pp.proposal_id = p.id
      order by
        case pp.status when 'paid' then 0 when 'pending' then 1 else 2 end,
        pp.created_at desc
      limit 1
    )
  from proposals p
  join leads l on l.id = p.lead_id
  join accounts a on a.id = p.account_id
  where p.id = v_id;
end;
$$;

revoke all on function get_proposal_by_token(text) from public;
grant execute on function get_proposal_by_token(text) to anon, authenticated;
