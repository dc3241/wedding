-- ============================================================
-- 0083_account_plan.sql
-- VENUE-01: accounts.plan — 'planner' (default) | 'venue'.
-- Venue plan requires kind = 'business' (WHITE-01 posture).
-- Own-shell white-label for venue accounts is gated in app code by
-- plan = 'venue' AND white_label_enabled — not schema alone.
-- Hand-set for pilot; no Stripe/signup wiring in this slice.
-- ============================================================

alter table accounts
  add column if not exists plan text not null default 'planner';

alter table accounts
  drop constraint if exists accounts_plan_values;

alter table accounts
  add constraint accounts_plan_values
  check (plan in ('planner', 'venue'));

alter table accounts
  drop constraint if exists accounts_plan_business_only;

alter table accounts
  add constraint accounts_plan_business_only
  check (plan = 'planner' or kind = 'business');
