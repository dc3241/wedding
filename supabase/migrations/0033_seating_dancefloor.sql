-- ============================================================
-- 0033_seating_dancefloor.sql
-- Allow floor-plan dance floors on seating_tables (kind + 0 seats).
-- Apply AFTER 0024 / 0025.
-- ============================================================

alter table seating_tables drop constraint if exists seating_tables_kind_check;
alter table seating_tables
  add constraint seating_tables_kind_check
  check (kind in ('standard', 'sweetheart', 'head', 'dancefloor'));

alter table seating_tables drop constraint if exists seating_tables_seat_count_check;
alter table seating_tables
  add constraint seating_tables_seat_count_check
  check (
    (kind = 'dancefloor' and seat_count = 0)
    or (kind <> 'dancefloor' and seat_count between 1 and 20)
  );
