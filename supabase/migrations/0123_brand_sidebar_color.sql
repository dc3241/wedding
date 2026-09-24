-- ============================================================
-- 0123_brand_sidebar_color.sql
-- Venue white-label: optional dark-rail background for PlannerShell.
-- Own-shell only — couples / public docs keep accent-only branding.
-- ============================================================

alter table accounts
  add column if not exists brand_sidebar_color text;

comment on column accounts.brand_sidebar_color is
  'Optional #RRGGBB for venue PlannerShell sidebar. Null = Soft stack ink.';
