-- ============================================================
-- 0056_guest_member_relationship.sql
-- GST-07: household mailing address + per-person relationship
-- (side token + curated picklist value). Additive only.
-- Does NOT drop email / party_size / meal_choice.
-- Idempotent: re-paste is a no-op.
-- ============================================================

alter table guests
  add column if not exists address text;

alter table guest_members
  add column if not exists relationship_side text;

alter table guest_members
  drop constraint if exists guest_members_relationship_side_check;

alter table guest_members
  add constraint guest_members_relationship_side_check
  check (relationship_side in ('partner_1', 'partner_2'));

alter table guest_members
  add column if not exists relationship text;
