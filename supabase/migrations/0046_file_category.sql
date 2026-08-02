-- ============================================================
-- 0046_file_category.sql
-- Optional vendor-category id on files (meaningful for kind='contract').
-- Mirrors vendors.category: text, no DB CHECK — validated in-app to
-- VENDOR_CATEGORIES ids. NULL = uncategorized.
-- UPDATE already covered by "files writable by project members" FOR ALL
-- (can_access_project) from 0011 — do not add a second write policy.
-- ============================================================

alter table files add column if not exists category text;
