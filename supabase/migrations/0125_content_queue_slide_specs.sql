-- ============================================================
-- 0125_content_queue_slide_specs.sql
-- Still-renderer specs for the content queue. Produce stores one
-- JSON spec per slide; Regenerate re-renders them. KIE task ids
-- stay for in-flight webhooks.
-- Re-runnable. Hand-paste only — never supabase db push.
-- ============================================================

alter table content_queue
  add column if not exists slide_specs jsonb not null default '[]'::jsonb;
