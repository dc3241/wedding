-- ============================================================
-- 20261030000000_ideation_batch_id.sql
-- Groups the ideas from one "Generate 10 ideas" click so the
-- Ideation page can show the latest batch. Re-runnable.
-- Hand-paste only — never supabase db push.
-- ============================================================

alter table ideation_items
  add column if not exists batch_id uuid;

create index if not exists ideation_items_batch_idx
  on ideation_items (batch_id, created_at desc);
