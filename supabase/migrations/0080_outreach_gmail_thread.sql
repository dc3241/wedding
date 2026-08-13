-- ============================================================
-- 0080_outreach_gmail_thread.sql
-- Store Gmail threadId from users.messages.send for "View in Gmail"
-- deep links. Nullable; no backfill — legacy rows stay null.
-- No RLS change — rides existing outreach read/write policies.
-- ============================================================

alter table outreach_messages
  add column if not exists gmail_thread_id text;
