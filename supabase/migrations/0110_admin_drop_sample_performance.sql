-- ============================================================
-- 0110_admin_drop_sample_performance.sql
-- Remove the ADMIN-SEED-01 sample performance row so Overview /
-- Performance stay empty until real weekly numbers are typed on
-- Schedule. Matches the seeded values only — will not delete a
-- week that has been overwritten with different figures.
--
-- Re-runnable. Hand-paste only — never supabase db push.
-- ============================================================

delete from schedule_performance sp
using schedule_weeks sw
where sp.week_id = sw.id
  and sw.start_date = '2026-09-07'
  and sp.views = '14.2k'
  and sp.follower_growth = '+38'
  and sp.dms = '6'
  and sp.signups = '2'
  and sp.notes = 'Story+plug budget post (IG) drove most saves & DMs';
