-- ============================================================
-- 0111_ideation_queue_source.sql
-- Friday content-queue batch is briefed by unused Liked ideation
-- rows (with a platform), not the old hardcoded pillar cycle.
-- used_at hides consumed ideas from the Ideation UI; the backend
-- still reads them so generate/queue will not repeat them.
--
-- Re-runnable. Hand-paste only — never supabase db push.
-- ============================================================

alter table ideation_items
  add column if not exists platform text;

alter table ideation_items drop constraint if exists ideation_items_platform_check;
alter table ideation_items add constraint ideation_items_platform_check
  check (platform is null or platform in ('instagram', 'tiktok', 'pinterest'));

alter table ideation_items
  add column if not exists used_at timestamptz;

create index if not exists ideation_items_queue_ready_idx
  on ideation_items (created_at)
  where rating = 'up' and used_at is null and platform is not null;

create index if not exists ideation_items_used_at_idx
  on ideation_items (used_at)
  where used_at is not null;

alter table content_queue
  add column if not exists source_idea_id uuid references ideation_items (id) on delete set null;
