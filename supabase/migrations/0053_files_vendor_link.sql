-- ============================================================
-- 0053_files_vendor_link.sql
-- Link a project file (typically kind='contract') to a
-- project_vendors involvement row so contracts show on the
-- booked-vendor object and the Contracts archive.
-- Composite FK keeps the link same-project (0026 pattern).
-- ON DELETE SET NULL (project_vendor_id) — removing a vendor
-- link never deletes the file row.
-- RLS: existing FOR ALL can_access_project on files (0011) —
-- no new policy.
-- ============================================================

alter table files
  add column if not exists project_vendor_id uuid;

alter table files
  drop constraint if exists files_project_vendor_fkey;

alter table files
  add constraint files_project_vendor_fkey
  foreign key (project_id, project_vendor_id)
  references project_vendors (project_id, id)
  on delete set null (project_vendor_id);

create index if not exists files_project_vendor_id_idx
  on files (project_vendor_id)
  where project_vendor_id is not null;
