-- ============================================================
-- 0133_files_extracted_text.sql
-- Text pulled from an uploaded PDF, Word, or plain-text file so
-- the assistant can review it without re-downloading the bytes.
-- null extraction_status = not attempted yet.
-- ready | empty (no selectable text) | unsupported | failed.
-- Hand-paste only — never supabase db push.
-- ============================================================

alter table files
  add column if not exists extracted_text text,
  add column if not exists extraction_status text,
  add column if not exists extraction_truncated boolean not null default false;

alter table files
  drop constraint if exists files_extraction_status_check;

alter table files
  add constraint files_extraction_status_check
  check (
    extraction_status is null
    or extraction_status in ('ready', 'empty', 'unsupported', 'failed')
  );
