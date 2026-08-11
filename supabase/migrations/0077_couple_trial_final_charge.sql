-- ============================================================
-- 0077_couple_trial_final_charge.sql
-- PRICE-04: atomic claim + fail-closed helpers for the day-7
-- $92 off-session charge. service_role only (Edge Function).
-- No new columns — uses stripe_payment_method_id from 0076 and
-- a local transitional status 'charging' (no CHECK on status).
-- ============================================================

create or replace function claim_couple_trial_charges()
returns table (
  account_id uuid,
  stripe_customer_id text,
  stripe_payment_method_id text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Postgres requires DML + RETURNING to be a CTE, not a subquery in FROM —
  -- that's what the original syntax error was. The `c.` qualification below
  -- (not bare `account_id`) is what actually avoids ambiguity with this
  -- function's own OUT parameters of the same names — the wrapper Cursor
  -- was originally reaching for, just written as a valid construct.
  return query
  with c as (
    update subscriptions as s
    set
      status = 'charging',
      updated_at = now()
    from accounts a
    where s.account_id = a.id
      and a.kind = 'personal'
      and s.status = 'trialing'
      and s.stripe_subscription_id is null
      and s.stripe_payment_method_id is not null
      and s.current_period_end <= now()
    returning s.account_id, s.stripe_customer_id, s.stripe_payment_method_id
  )
  select c.account_id, c.stripe_customer_id, c.stripe_payment_method_id
  from c;
end;
$$;

revoke all on function claim_couple_trial_charges() from public;
grant execute on function claim_couple_trial_charges() to service_role;

create or replace function mark_couple_trial_charge_failed(p_account_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update subscriptions
  set
    status = 'canceled',
    updated_at = now()
  where account_id = p_account_id;
$$;

revoke all on function mark_couple_trial_charge_failed(uuid) from public;
grant execute on function mark_couple_trial_charge_failed(uuid) to service_role;
