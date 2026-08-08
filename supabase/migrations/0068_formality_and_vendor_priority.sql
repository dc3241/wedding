-- ============================================================
-- 0068_formality_and_vendor_priority.sql
-- ONB-04: formality tone signal + priority vendor category ids
-- for plan-gen prompt directives (no code weighting).
-- ============================================================

alter table wedding_profile
  add column if not exists formality text,
  add column if not exists priority_vendor_category_ids text[] not null default '{}';

alter table wedding_profile
  drop constraint if exists wedding_profile_formality_check;
alter table wedding_profile
  add constraint wedding_profile_formality_check
  check (
    formality is null
    or formality in ('casual', 'semi-formal', 'formal', 'black-tie')
  );

alter table wedding_profile
  drop constraint if exists wedding_profile_priority_vendor_categories_check;
alter table wedding_profile
  add constraint wedding_profile_priority_vendor_categories_check
  check (
    priority_vendor_category_ids <@ array[
      'venue', 'caterer', 'florist', 'baker', 'hair-makeup', 'jewelry',
      'photographer', 'videographer', 'dj', 'band', 'officiant', 'planner',
      'rentals'
    ]::text[]
  );
