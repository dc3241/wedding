-- ============================================================
-- 0020_subscriptions.sql
-- One Stripe subscription row per account. Status mirrors Stripe's
-- vocabulary intentionally — no CHECK on status (Stripe may add values).
-- Authenticated users may SELECT only; writes are service-role (webhook).
-- Apply AFTER 0019.
-- ============================================================

create table subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  account_id             uuid not null unique references accounts(id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  -- Intentionally unconstrained: mirrors Stripe subscription.status strings
  -- (active, trialing, past_due, canceled, incomplete, incomplete_expired, unpaid, paused, …).
  status                 text,
  price_id               text,
  quantity               integer not null default 1,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index subscriptions_stripe_customer_id_idx on subscriptions (stripe_customer_id);
create index subscriptions_stripe_subscription_id_idx on subscriptions (stripe_subscription_id);

alter table subscriptions enable row level security;

create policy "subscriptions readable by account members"
  on subscriptions for select
  using (is_account_member(account_id));
