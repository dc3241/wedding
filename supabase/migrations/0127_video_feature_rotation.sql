-- ============================================================
-- 0127_video_feature_rotation.sql
-- TikTok slots carry the couple-tab they promote. Assignment
-- happens in the app, starting at Overview for the next unposted
-- video. Hand-paste only — never supabase db push.
-- ============================================================

alter table content_slots
  add column if not exists feature_key text;

alter table content_slots drop constraint if exists content_slots_feature_key_check;
alter table content_slots add constraint content_slots_feature_key_check
  check (
    feature_key is null
    or (
      lane = 'video'
      and feature_key in (
        'overview',
        'calendar',
        'checklist',
        'budget',
        'vendors',
        'guests',
        'website',
        'seating',
        'timeline',
        'contracts'
      )
    )
  );
