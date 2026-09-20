-- ============================================================
-- 0120_schedule_republish_cols.sql
-- Drop Instagram as an origin. FB / YouTube become republish
-- checks split by audience (fbCouples / ytCouples vs fbPlanner /
-- ytPlanner) so a couples TikTok and a planner LinkedIn video do
-- not share a checkbox. Lock leftover ideation rows to the new
-- audience + format rules.
--
-- Re-runnable: the schedule rewrite only runs while old keys
-- (`ig`, `fbPage`, `youtube`) are still present.
-- Hand-paste only — never supabase db push.
-- ============================================================

update schedule_days
set
  platforms = jsonb_strip_nulls(
    jsonb_build_object(
      'tiktok', coalesce(platforms ->> 'tiktok', 'pending'),
      'pinterest', coalesce(platforms ->> 'pinterest', 'pending'),
      'fbCouples',
        case
          when platforms ->> 'fbPage' = 'done'
            or platforms ->> 'fbGroups' = 'done'
            then 'done'
          when coalesce(platforms ->> 'fbPage', 'off') = 'off'
            and coalesce(platforms ->> 'fbGroups', 'off') = 'off'
            then 'off'
          else 'pending'
        end,
      'ytCouples', 'pending',
      'linkedin', coalesce(platforms ->> 'linkedin', 'pending'),
      'fbPlanner', coalesce(platforms ->> 'linkedin', 'pending'),
      'ytPlanner', coalesce(platforms ->> 'youtube', 'pending'),
      'reddit', coalesce(platforms ->> 'reddit', 'pending'),
      'outreach', coalesce(platforms ->> 'outreach', 'pending')
    )
  ),
  updated_at = now()
where platforms ? 'ig'
   or platforms ? 'fbPage'
   or (
     platforms ? 'youtube'
     and not platforms ? 'ytPlanner'
   );

update ideation_items
set audience_group = 'couples'
where platform in ('tiktok', 'pinterest')
  and audience_group is distinct from 'couples';

update ideation_items
set audience_group = 'planner'
where platform = 'linkedin'
  and audience_group is distinct from 'planner';

update ideation_items
set format = 'ugc'
where platform = 'tiktok'
  and format is distinct from 'ugc';

update ideation_items
set format = 'pin'
where platform = 'pinterest'
  and format is distinct from 'pin';
