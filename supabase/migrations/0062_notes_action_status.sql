-- ============================================================
-- 0062_notes_action_status.sql
-- Optional action lifecycle on project notes:
--   null           — ordinary note
--   needs_action   — pinned, rosewood indicator
--   done           — confirmed / completed
-- Hand-paste only — never supabase db push.
-- ============================================================

alter table notes
  add column if not exists action_status text;

alter table notes
  drop constraint if exists notes_action_status_check;

alter table notes
  add constraint notes_action_status_check
  check (action_status is null or action_status in ('needs_action', 'done'));
