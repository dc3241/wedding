-- ============================================================
-- 0113_ideation_linkedin_text.sql
-- LinkedIn is a Friday platform (text post, no KIE image).
-- Re-runnable. Hand-paste only — never supabase db push.
-- ============================================================

alter table ideation_items drop constraint if exists ideation_items_platform_check;
alter table ideation_items add constraint ideation_items_platform_check
  check (platform is null or platform in ('instagram', 'tiktok', 'pinterest', 'linkedin'));

alter table content_queue drop constraint if exists content_queue_platform_check;
alter table content_queue add constraint content_queue_platform_check
  check (platform in ('instagram', 'tiktok', 'pinterest', 'linkedin'));

alter table ideation_items drop constraint if exists ideation_items_format_check;
alter table ideation_items add constraint ideation_items_format_check
  check (format is null or format in ('static', 'carousel', 'ugc', 'photo', 'pin', 'text'));

alter table content_queue drop constraint if exists content_queue_format_check;
alter table content_queue add constraint content_queue_format_check
  check (format is null or format in ('static', 'carousel', 'ugc', 'photo', 'pin', 'text'));
