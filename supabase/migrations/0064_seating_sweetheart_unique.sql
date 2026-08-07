-- 0064_seating_sweetheart_unique.sql
-- One sweetheart table per project. kind='sweetheart' already allowed
-- (0024 / 0033); this migration does NOT touch the CHECK.

create unique index if not exists seating_tables_one_sweetheart_per_project
  on seating_tables (project_id)
  where kind = 'sweetheart';
