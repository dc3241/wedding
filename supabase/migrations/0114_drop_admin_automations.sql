-- ============================================================
-- 0114_drop_admin_automations.sql
-- Admin image generator + content automations were unused helpers
-- beside Ideation → Content Queue → Content Bank. Drop the tables.
-- Re-runnable. Hand-paste only — never supabase db push.
-- ============================================================

drop table if exists public.admin_automation_runs;
drop table if exists public.admin_automation_prompts;
