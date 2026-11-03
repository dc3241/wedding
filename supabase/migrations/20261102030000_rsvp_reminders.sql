-- ============================================================
-- 20261102030000_rsvp_reminders.sql
-- RSVP-CHASE-01: assistant-proposed RSVP reminder emails to guests.
--
--  * guests.last_reminded_at — when a reminder was last SENT to this
--    household. Drives the 7-day cooldown (checked when the proposal is
--    created and again when it is approved).
--  * assistant_proposals.kind gains 'rsvp_reminder' (approve-before-send).
--
-- guests.email already exists (kept since GST-07); this slice restores it
-- in the UI. No new tables or policies. Re-runnable.
-- Hand-paste only — never supabase db push.
-- ============================================================

alter table guests
  add column if not exists last_reminded_at timestamptz;

alter table assistant_proposals drop constraint if exists assistant_proposals_kind_check;
alter table assistant_proposals add constraint assistant_proposals_kind_check
  check (kind in ('budget_change', 'vendor_quote', 'checklist_replan', 'rsvp_reminder'));

-- Checkpoint after paste:
--   select column_name from information_schema.columns
--     where table_name = 'guests' and column_name = 'last_reminded_at';   -- 1 row
--   select pg_get_constraintdef(oid) from pg_constraint where conname = 'assistant_proposals_kind_check';
