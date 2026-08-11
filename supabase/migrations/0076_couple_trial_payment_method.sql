-- ============================================================
-- 0076_couple_trial_payment_method.sql
-- PRICE-03: save card on $7 couple trial-week Checkout for the
-- day-7 $92 off-session charge (PRICE-04). Nullable; unused by
-- planner rows. Same free-text posture as other Stripe id columns.
-- ============================================================

alter table subscriptions
  add column if not exists stripe_payment_method_id text;
