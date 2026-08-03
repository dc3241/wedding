-- ============================================================
-- 0055_guest_members_backfill.sql
-- GST-06: DATA ONLY. One guest_members row for every guests
-- household that has zero members, so the person-grain Guests
-- list has a writable line for each legacy household.
-- Idempotent: NOT EXISTS guard — re-paste inserts 0 rows.
-- Does NOT alter columns; does NOT drop party_size / meal_choice.
-- ============================================================

insert into guest_members (
  project_id,
  guest_id,
  name,
  meal_option_id,
  dietary_note,
  attending,
  sort_order
)
select
  g.project_id,
  g.id,
  g.full_name,
  null,
  null,
  (g.rsvp_status = 'attending'),
  0
from guests g
where not exists (
  select 1
  from guest_members m
  where m.guest_id = g.id
);
