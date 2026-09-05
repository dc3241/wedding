-- ============================================================
-- 0108_content_bank_reddit.sql
-- ADMIN-AUD-00: widen content_bank_items.platform so Reddit threads
-- can live in the existing bank shape (idea = thread title, notes =
-- subreddit, body = why it's relevant). Audience is NOT stored —
-- it is a pure function of platform (see lib/admin/platform-audience.ts).
--
-- Do NOT touch content_queue.platform — that CHECK is
-- instagram|tiktok|pinterest for the Friday KIE batch (CONTENT-QUEUE-00),
-- a different feature.
--
-- Re-runnable: drop-if-exists before add. Hand-paste only —
-- never supabase db push.
-- ============================================================

alter table content_bank_items drop constraint if exists content_bank_items_platform_check;
alter table content_bank_items add constraint content_bank_items_platform_check
  check (platform in ('tiktok', 'instagram', 'facebook', 'pinterest', 'linkedin', 'youtube', 'reddit'));
