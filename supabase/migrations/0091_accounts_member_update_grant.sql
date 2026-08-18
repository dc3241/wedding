-- ============================================================
-- 0091_accounts_member_update_grant.sql
-- 0070 added "members update own account" RLS but never GRANTed
-- UPDATE to authenticated. Member writes (branding, inquiry_slug)
-- then fail with "permission denied for table accounts" before
-- RLS runs. SELECT already works via 0001's policy + default
-- SELECT grant.
-- ============================================================

grant update on table accounts to authenticated;
