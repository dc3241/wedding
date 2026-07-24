-- 0030_vendor_category_and_status.sql
-- Normalizes vendors.category to VENDOR_CATEGORIES ids, pins the
-- project_vendors status vocabulary, and closes the duplicate-link gap.

-- 1. Backfill vendors.category from labels to ids. Mapping covers exactly the
--    13 canonical labels in lib/vendor-categories.ts. Legacy free text from the
--    old manual-add Input is left alone (vendorCategoryLabel falls back to the
--    raw string). Idempotent: re-running maps every id to itself.
update vendors set category = case lower(trim(category))
  when 'venue'          then 'venue'
  when 'caterer'        then 'caterer'
  when 'florist'        then 'florist'
  when 'baker'          then 'baker'
  when 'hair & makeup'  then 'hair-makeup'
  when 'jewelry'        then 'jewelry'
  when 'photographer'   then 'photographer'
  when 'videographer'   then 'videographer'
  when 'dj'             then 'dj'
  when 'band'           then 'band'
  when 'officiant'      then 'officiant'
  when 'planner'        then 'planner'
  when 'rentals'        then 'rentals'
  else category
end
where category is not null;

-- 2. One link per vendor per project (addDiscoveredVendor guarded this in app
--    code only; addVendor did not guard it at all).
create unique index if not exists project_vendors_project_vendor_key
  on project_vendors (project_id, vendor_id);

-- 3. Retire the dead 'lead' default and pin the vocabulary.
alter table project_vendors alter column status set default 'to_contact';

alter table project_vendors drop constraint if exists project_vendors_status_check;
alter table project_vendors add constraint project_vendors_status_check
  check (status in ('to_contact','contacted','booked','declined'));