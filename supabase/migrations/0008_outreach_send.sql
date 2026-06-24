-- ============================================================
-- 0008_outreach_app_columns.sql
-- App columns for Gmail send/save on outreach_messages.
-- Safe to re-run (IF NOT EXISTS). Databases that applied an older 0005
-- without send_error/updated_at get patched here; fresh installs get them
-- from 0005 and this is a no-op.
-- Apply AFTER 0005.
-- ============================================================

alter table outreach_messages
  add column if not exists send_error text,
  add column if not exists updated_at timestamptz not null default now();

update outreach_messages
set updated_at = coalesce(created_at, now())
where updated_at is null;
