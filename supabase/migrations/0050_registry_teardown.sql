-- ============================================================
-- 0050_registry_teardown.sql
-- REG-06: drop native gift registry (items + claims).
-- External registry links (0035 column) are DELIBERATELY KEPT — they
-- now live on the website editor/render (REG-05). Do NOT reverse 0035's
-- column or its rider to the published wedding_websites read (0022).
-- 0037 backfill needs no reversal (data lives in the kept column).
-- Re-runnable. Drops claims BEFORE items (FK order).
-- ============================================================

-- Availability RPC references registry_claims; drop before the tables.
drop function if exists registry_item_availability(uuid);

drop table if exists registry_claims;
drop table if exists registry_items;
