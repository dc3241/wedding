-- 0031_vendor_target_link.sql
-- Booked vendors own their category slot via an explicit FK.
-- Re-runnable throughout. Paste by hand — do not db push.

-- 1. The slot link. Composite FK so a target can only point at a project_vendor
--    in its OWN project. MATCH SIMPLE means a null project_vendor_id skips the
--    check entirely, which is the intended "empty slot" state.
alter table vendor_targets
  add column if not exists project_vendor_id uuid;

alter table vendor_targets
  drop constraint if exists vendor_targets_project_vendor_fkey;

alter table vendor_targets
  add constraint vendor_targets_project_vendor_fkey
  foreign key (project_id, project_vendor_id)
  references project_vendors (project_id, id)
  on delete set null (project_vendor_id);

-- 2. A linked vendor is only meaningful on a booked slot.
--    The reverse is NOT required: a slot may be booked with no vendor record yet.
alter table vendor_targets
  drop constraint if exists vendor_targets_link_requires_booked;

alter table vendor_targets
  add constraint vendor_targets_link_requires_booked
  check (project_vendor_id is null or status = 'booked');

-- 3. Widen the outreach vocabulary so the drawn pipeline is reachable. Closes B2:
--    VENDOR_PIPELINE_STEPS draws To contact -> Contacted -> Replied -> Booked, and
--    'replied' was previously unstorable. 'declined' remains stored as an exit, not a stop.
alter table project_vendors
  drop constraint if exists project_vendors_status_check;

alter table project_vendors
  add constraint project_vendors_status_check
  check (status in ('to_contact','contacted','replied','booked','declined'));

-- 4. User-editable address. NOT populated from Google Places -- see bible §12,
--    "store only place_id". Manual entry only.
alter table vendors
  add column if not exists address text;
