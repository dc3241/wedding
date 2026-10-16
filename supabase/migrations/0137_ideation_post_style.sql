-- ============================================================
-- 0137_ideation_post_style.sql
-- Per-idea post style (save_this, myth, numbered, …) for shortlists
-- and Produce CTA / layout bias. Re-runnable.
-- ============================================================

alter table ideation_items
  add column if not exists post_style text;

alter table ideation_items drop constraint if exists ideation_items_post_style_check;
alter table ideation_items add constraint ideation_items_post_style_check
  check (
    post_style is null
    or post_style in (
      'tip',
      'save_this',
      'myth',
      'before_after',
      'numbered',
      'hot_take',
      'stop_doing',
      'promo'
    )
  );

alter table content_queue
  add column if not exists post_style text;

alter table content_queue drop constraint if exists content_queue_post_style_check;
alter table content_queue add constraint content_queue_post_style_check
  check (
    post_style is null
    or post_style in (
      'tip',
      'save_this',
      'myth',
      'before_after',
      'numbered',
      'hot_take',
      'stop_doing',
      'promo'
    )
  );
