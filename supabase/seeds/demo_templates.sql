-- ============================================================
-- seeds/demo_templates.sql
-- DEMO template data for clone_demo_account.
--
-- Personal template: one couple ~6 months out (couples CTA).
-- Business template: planner book with 3 clients —
--   just started / ~6 months out / month-of.
--
-- Idempotent: safe to re-run. Uses fixed UUIDs for personal;
-- reshapes the existing business is_demo_template account.
-- Does NOT attach account_members (clone binds the visitor).
-- Hand-apply: supabase db query --linked -f this file
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- Stable ids
-- Personal template
--   account  a0000000-d300-4000-8000-000000000001
--   project  a0000000-d300-4000-8000-000000000002
-- Business template (already live): a8886e9c-53b7-47d4-a6dc-521bc2b3c363
--   just started  e390b41c-3b55-4370-8ca1-857081757bfd
--   6 months      b7c32347-722a-4c6d-8ba4-c98cd2eb77e8
--   month-of      7cb744b2-b207-4e76-b944-691798c8878c

create or replace function _demo_wipe_project(p_project_id uuid)
returns void
language plpgsql
as $$
begin
  delete from seating_assignments where project_id = p_project_id;
  delete from rsvp_attendees where project_id = p_project_id;
  delete from guest_members where project_id = p_project_id;
  delete from rsvp_submissions where project_id = p_project_id;
  delete from guests where project_id = p_project_id;
  delete from budget_payments where project_id = p_project_id;
  delete from payment_schedule where project_id = p_project_id;
  delete from budget_items where project_id = p_project_id;
  delete from budget_alert_dismissals where project_id = p_project_id;
  delete from files where project_id = p_project_id;
  delete from notes where project_id = p_project_id;
  delete from timeline_events where project_id = p_project_id;
  delete from meal_options where project_id = p_project_id;
  delete from vendor_targets where project_id = p_project_id;
  delete from tasks where project_id = p_project_id;
  delete from project_vendors where project_id = p_project_id;
  delete from seating_tables where project_id = p_project_id;
  delete from wedding_websites where project_id = p_project_id;
  delete from wedding_profile where project_id = p_project_id;
  delete from calendar_events where project_id = p_project_id;
  delete from assistant_messages where project_id = p_project_id;
end;
$$;

-- ------------------------------------------------------------
-- 1) PERSONAL TEMPLATE — Maya & Jordan, ~6 months out
-- ------------------------------------------------------------
insert into accounts (id, name, kind, is_demo, is_demo_template, created_at)
values (
  'a0000000-d300-4000-8000-000000000001',
  'Maya & Jordan',
  'personal',
  false,
  true,
  now()
)
on conflict (id) do update
set name = excluded.name,
    kind = excluded.kind,
    is_demo = false,
    is_demo_template = true;

-- Ensure no other personal templates compete with LIMIT 1 selection
update accounts
set is_demo_template = false
where kind = 'personal'
  and id <> 'a0000000-d300-4000-8000-000000000001'
  and is_demo_template = true;

insert into projects (
  id, account_id, name, wedding_date, status, total_budget, created_at, archived_at
)
values (
  'a0000000-d300-4000-8000-000000000002',
  'a0000000-d300-4000-8000-000000000001',
  'Maya & Jordan — Feb 2027',
  '2027-02-14',
  'active',
  45000,
  now(),
  null
)
on conflict (id) do update
set name = excluded.name,
    wedding_date = excluded.wedding_date,
    status = 'active',
    total_budget = excluded.total_budget,
    archived_at = null,
    account_id = excluded.account_id;

select _demo_wipe_project('a0000000-d300-4000-8000-000000000002');

-- Wipe + recreate personal rolodex vendors (account-scoped)
delete from vendors
where account_id = 'a0000000-d300-4000-8000-000000000001';

insert into vendors (
  id, account_id, name, category, contact_name, contact_email, contact_phone,
  website, is_preferred, source, address, created_at
) values
  ('a0000000-d300-4000-8000-000000000010', 'a0000000-d300-4000-8000-000000000001',
   'The Conservatory', 'venue', 'Priya Shah', 'events@conservatory.example', '555-0101',
   'https://example.com/conservatory', true, 'manual', '120 Garden Way, Oakland CA', now()),
  ('a0000000-d300-4000-8000-000000000011', 'a0000000-d300-4000-8000-000000000001',
   'Lens & Light Co.', 'photographer', 'Sam Ortiz', 'hello@lenslight.example', '555-0102',
   null, true, 'manual', null, now()),
  ('a0000000-d300-4000-8000-000000000012', 'a0000000-d300-4000-8000-000000000001',
   'Petal & Stem', 'florist', 'Nina Park', 'orders@petalstem.example', '555-0103',
   null, false, 'manual', null, now()),
  ('a0000000-d300-4000-8000-000000000013', 'a0000000-d300-4000-8000-000000000001',
   'Harbor Catering', 'caterer', 'Chris Bell', 'book@harbor.example', '555-0104',
   null, false, 'manual', null, now()),
  ('a0000000-d300-4000-8000-000000000014', 'a0000000-d300-4000-8000-000000000001',
   'Spin City DJ', 'dj', 'Alex Kim', 'dj@spincity.example', '555-0105',
   null, false, 'manual', null, now());

insert into project_vendors (id, project_id, vendor_id, status, quoted_price, role, notes, created_at) values
  ('a0000000-d300-4000-8000-000000000020', 'a0000000-d300-4000-8000-000000000002',
   'a0000000-d300-4000-8000-000000000010', 'booked', 12000, 'Ceremony + reception', 'Deposit paid', now()),
  ('a0000000-d300-4000-8000-000000000021', 'a0000000-d300-4000-8000-000000000002',
   'a0000000-d300-4000-8000-000000000011', 'booked', 4500, 'Photo', null, now()),
  ('a0000000-d300-4000-8000-000000000022', 'a0000000-d300-4000-8000-000000000002',
   'a0000000-d300-4000-8000-000000000012', 'contacted', 2800, 'Florals', 'Waiting on proposal', now()),
  ('a0000000-d300-4000-8000-000000000023', 'a0000000-d300-4000-8000-000000000002',
   'a0000000-d300-4000-8000-000000000013', 'replied', 8500, 'Dinner', 'Tasting booked', now()),
  ('a0000000-d300-4000-8000-000000000024', 'a0000000-d300-4000-8000-000000000002',
   'a0000000-d300-4000-8000-000000000014', 'to_contact', null, 'Reception DJ', null, now());

insert into wedding_profile (
  project_id, location, guest_estimate, style, traditions, priorities, vibe_notes, onboarded_at, created_at
) values (
  'a0000000-d300-4000-8000-000000000002',
  'Oakland, CA',
  110,
  'Garden, modern, intimate',
  'Short Hindu blessing before ceremony',
  'Food, photography, guest experience',
  'Want the day to feel warm and unhurried',
  now() - interval '5 months',
  now()
);

insert into vendor_targets (project_id, category, note, status, project_vendor_id, created_at) values
  ('a0000000-d300-4000-8000-000000000002', 'venue', null, 'booked', 'a0000000-d300-4000-8000-000000000020', now()),
  ('a0000000-d300-4000-8000-000000000002', 'photographer', null, 'booked', 'a0000000-d300-4000-8000-000000000021', now()),
  ('a0000000-d300-4000-8000-000000000002', 'florist', 'Need proposal', 'needed', null, now()),
  ('a0000000-d300-4000-8000-000000000002', 'caterer', null, 'needed', null, now()),
  ('a0000000-d300-4000-8000-000000000002', 'dj', null, 'needed', null, now()),
  ('a0000000-d300-4000-8000-000000000002', 'baker', null, 'needed', null, now());

insert into tasks (project_id, title, status, phase, due_date, vendor_id, position, created_at) values
  ('a0000000-d300-4000-8000-000000000002', 'Set budget & guest list', 'done', '12+ months', '2026-02-14', null, 0, now()),
  ('a0000000-d300-4000-8000-000000000002', 'Book venue', 'done', '12+ months', '2026-02-14', 'a0000000-d300-4000-8000-000000000020', 1, now()),
  ('a0000000-d300-4000-8000-000000000002', 'Book photographer', 'done', '9 months', '2026-04-14', 'a0000000-d300-4000-8000-000000000021', 0, now()),
  ('a0000000-d300-4000-8000-000000000002', 'Book catering', 'in_progress', '9 months', '2026-05-14', 'a0000000-d300-4000-8000-000000000023', 1, now()),
  ('a0000000-d300-4000-8000-000000000002', 'Shop for attire', 'in_progress', '6 months', '2026-06-14', null, 0, now()),
  ('a0000000-d300-4000-8000-000000000002', 'Hire florist', 'todo', '6 months', '2026-08-14', 'a0000000-d300-4000-8000-000000000022', 1, now()),
  ('a0000000-d300-4000-8000-000000000002', 'Book DJ or band', 'todo', '6 months', '2026-08-14', 'a0000000-d300-4000-8000-000000000024', 2, now()),
  ('a0000000-d300-4000-8000-000000000002', 'Send save-the-dates', 'todo', '6 months', '2026-09-14', null, 3, now()),
  ('a0000000-d300-4000-8000-000000000002', 'Order invitations', 'todo', '3 months', '2026-10-14', null, 0, now()),
  ('a0000000-d300-4000-8000-000000000002', 'Book hair & makeup', 'todo', '3 months', '2026-11-14', null, 1, now()),
  ('a0000000-d300-4000-8000-000000000002', 'Confirm final headcount', 'todo', '1 month', '2027-01-14', null, 0, now()),
  ('a0000000-d300-4000-8000-000000000002', 'Final walkthrough with venue', 'todo', '1 month', '2027-01-31', 'a0000000-d300-4000-8000-000000000020', 1, now()),
  ('a0000000-d300-4000-8000-000000000002', 'Rehearsal dinner', 'todo', 'week of', '2027-02-13', null, 0, now());

insert into budget_items (id, project_id, category, label, planned_amount, actual_amount, project_vendor_id, due_date, created_at) values
  ('a0000000-d300-4000-8000-000000000030', 'a0000000-d300-4000-8000-000000000002', 'venue', 'Venue package', 12000, 12000, 'a0000000-d300-4000-8000-000000000020', '2026-12-01', now()),
  ('a0000000-d300-4000-8000-000000000031', 'a0000000-d300-4000-8000-000000000002', 'photo', 'Photography', 4500, 4500, 'a0000000-d300-4000-8000-000000000021', '2026-11-01', now()),
  ('a0000000-d300-4000-8000-000000000032', 'a0000000-d300-4000-8000-000000000002', 'food', 'Catering', 9000, null, 'a0000000-d300-4000-8000-000000000023', '2027-01-15', now()),
  ('a0000000-d300-4000-8000-000000000033', 'a0000000-d300-4000-8000-000000000002', 'florals', 'Florals', 2800, null, null, null, now()),
  ('a0000000-d300-4000-8000-000000000034', 'a0000000-d300-4000-8000-000000000002', 'attire', 'Attire', 3500, 1200, null, null, now()),
  ('a0000000-d300-4000-8000-000000000035', 'a0000000-d300-4000-8000-000000000002', 'misc', 'Favors & extras', 800, null, null, null, now());

insert into budget_payments (project_id, budget_item_id, amount, paid_on, note, created_at) values
  ('a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000030', 4000, '2026-03-01', 'Venue deposit', now()),
  ('a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000031', 1500, '2026-04-20', 'Photo retainer', now()),
  ('a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000034', 1200, '2026-07-01', 'Suit deposit', now());

insert into payment_schedule (project_id, budget_item_id, amount, due_on, label, created_at) values
  ('a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000030', 8000, '2026-12-01', 'Venue balance', now()),
  ('a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000031', 3000, '2026-11-01', 'Photo balance', now()),
  ('a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000032', 9000, '2027-01-15', 'Catering', now());

insert into meal_options (id, project_id, name, description, is_kids, sort_order, created_at) values
  ('a0000000-d300-4000-8000-000000000040', 'a0000000-d300-4000-8000-000000000002', 'Herb chicken', 'Roasted with seasonal vegetables', false, 0, now()),
  ('a0000000-d300-4000-8000-000000000041', 'a0000000-d300-4000-8000-000000000002', 'Seared salmon', 'Citrus glaze', false, 1, now()),
  ('a0000000-d300-4000-8000-000000000042', 'a0000000-d300-4000-8000-000000000002', 'Mushroom risotto', 'Vegetarian', false, 2, now()),
  ('a0000000-d300-4000-8000-000000000043', 'a0000000-d300-4000-8000-000000000002', 'Kids pasta', null, true, 3, now());

-- Guests + members (include a plus-one association for clone self-FK coverage)
insert into guests (id, project_id, full_name, email, household, party_size, rsvp_status, address, rsvp_token, created_at) values
  ('a0000000-d300-4000-8000-000000000050', 'a0000000-d300-4000-8000-000000000002', 'The Chen Family', 'chens@example.com', 'Chen', 3, 'attending', '12 Oak St', encode(extensions.gen_random_bytes(16), 'hex'), now()),
  ('a0000000-d300-4000-8000-000000000051', 'a0000000-d300-4000-8000-000000000002', 'Priya Patel', 'priya@example.com', 'Patel', 2, 'pending', null, encode(extensions.gen_random_bytes(16), 'hex'), now()),
  ('a0000000-d300-4000-8000-000000000052', 'a0000000-d300-4000-8000-000000000002', 'Omar Hassan', 'omar@example.com', 'Hassan', 1, 'attending', null, encode(extensions.gen_random_bytes(16), 'hex'), now()),
  ('a0000000-d300-4000-8000-000000000053', 'a0000000-d300-4000-8000-000000000002', 'Taylor Brooks', 'taylor@example.com', 'Brooks', 2, 'pending', null, encode(extensions.gen_random_bytes(16), 'hex'), now()),
  ('a0000000-d300-4000-8000-000000000054', 'a0000000-d300-4000-8000-000000000002', 'Maya Rivera', null, 'Couple', 1, 'attending', null, encode(extensions.gen_random_bytes(16), 'hex'), now()),
  ('a0000000-d300-4000-8000-000000000055', 'a0000000-d300-4000-8000-000000000002', 'Jordan Lee', null, 'Couple', 1, 'attending', null, encode(extensions.gen_random_bytes(16), 'hex'), now());

insert into guest_members (id, project_id, guest_id, name, meal_option_id, dietary_note, attending, sort_order, relationship_side, relationship, member_type, related_to_member_id, created_at) values
  ('a0000000-d300-4000-8000-000000000060', 'a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000050', 'Wei Chen', 'a0000000-d300-4000-8000-000000000040', null, true, 0, 'partner_1', 'Friend', 'adult', null, now()),
  ('a0000000-d300-4000-8000-000000000061', 'a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000050', 'Lin Chen', 'a0000000-d300-4000-8000-000000000042', 'Vegetarian', true, 1, 'partner_1', 'Friend', 'adult', null, now()),
  ('a0000000-d300-4000-8000-000000000062', 'a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000050', 'Ava Chen', 'a0000000-d300-4000-8000-000000000043', null, true, 2, 'partner_1', 'Friend', 'child', 'a0000000-d300-4000-8000-000000000060', now()),
  ('a0000000-d300-4000-8000-000000000063', 'a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000051', 'Priya Patel', null, null, true, 0, 'partner_2', 'Cousin', 'adult', null, now()),
  ('a0000000-d300-4000-8000-000000000064', 'a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000051', 'Guest of Priya', null, null, true, 1, 'partner_2', 'Plus-one', 'adult', 'a0000000-d300-4000-8000-000000000063', now()),
  ('a0000000-d300-4000-8000-000000000065', 'a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000052', 'Omar Hassan', 'a0000000-d300-4000-8000-000000000041', null, true, 0, 'partner_1', 'College friend', 'adult', null, now()),
  ('a0000000-d300-4000-8000-000000000066', 'a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000053', 'Taylor Brooks', null, null, true, 0, 'partner_2', 'Coworker', 'adult', null, now()),
  ('a0000000-d300-4000-8000-000000000067', 'a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000054', 'Maya Rivera', null, null, true, 0, 'partner_1', 'Partner', 'adult', null, now()),
  ('a0000000-d300-4000-8000-000000000068', 'a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000055', 'Jordan Lee', null, null, true, 0, 'partner_2', 'Partner', 'adult', null, now());

insert into seating_tables (id, project_id, label, shape, seat_count, kind, pos_x, pos_y, rotation, created_at) values
  ('a0000000-d300-4000-8000-000000000070', 'a0000000-d300-4000-8000-000000000002', 'Sweetheart', 'rectangle', 2, 'sweetheart', 420, 80, 0, now()),
  ('a0000000-d300-4000-8000-000000000071', 'a0000000-d300-4000-8000-000000000002', 'Table 1', 'round', 8, 'standard', 180, 260, 0, now()),
  ('a0000000-d300-4000-8000-000000000072', 'a0000000-d300-4000-8000-000000000002', 'Table 2', 'round', 8, 'standard', 420, 260, 0, now()),
  ('a0000000-d300-4000-8000-000000000073', 'a0000000-d300-4000-8000-000000000002', 'Dance floor', 'square', 0, 'dancefloor', 300, 420, 0, now());

insert into seating_assignments (project_id, table_id, guest_id, guest_member_id, seat_index, created_at) values
  ('a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000070', 'a0000000-d300-4000-8000-000000000054', 'a0000000-d300-4000-8000-000000000067', 0, now()),
  ('a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000070', 'a0000000-d300-4000-8000-000000000055', 'a0000000-d300-4000-8000-000000000068', 1, now()),
  ('a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000071', 'a0000000-d300-4000-8000-000000000050', 'a0000000-d300-4000-8000-000000000060', 0, now()),
  ('a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000071', 'a0000000-d300-4000-8000-000000000050', 'a0000000-d300-4000-8000-000000000061', 1, now()),
  ('a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000071', 'a0000000-d300-4000-8000-000000000050', 'a0000000-d300-4000-8000-000000000062', 2, now()),
  ('a0000000-d300-4000-8000-000000000002', 'a0000000-d300-4000-8000-000000000072', 'a0000000-d300-4000-8000-000000000052', 'a0000000-d300-4000-8000-000000000065', 0, now());

insert into timeline_events (project_id, title, description, start_time, end_time, section, owner, position, created_at) values
  ('a0000000-d300-4000-8000-000000000002', 'Getting ready', null, '09:00', '13:00', 'Morning', 'Hair & makeup', 0, now()),
  ('a0000000-d300-4000-8000-000000000002', 'Ceremony', 'Garden lawn', '16:00', '16:45', 'Ceremony', 'Officiant', 1, now()),
  ('a0000000-d300-4000-8000-000000000002', 'Cocktail hour', null, '16:45', '18:00', 'Reception', 'Caterer', 2, now()),
  ('a0000000-d300-4000-8000-000000000002', 'Dinner & toasts', null, '18:00', '20:00', 'Reception', 'DJ', 3, now()),
  ('a0000000-d300-4000-8000-000000000002', 'First dance', null, '20:00', '20:15', 'Reception', 'DJ', 4, now()),
  ('a0000000-d300-4000-8000-000000000002', 'Open dancing', null, '20:15', '23:00', 'Reception', 'DJ', 5, now());

insert into notes (project_id, title, body, action_status, created_at, updated_at) values
  ('a0000000-d300-4000-8000-000000000002', 'Venue walkthrough notes', 'Ask about rain plan for the lawn ceremony.', 'needs_action', now(), now()),
  ('a0000000-d300-4000-8000-000000000002', 'Photo shot list', 'Family formals + golden hour portraits by the conservatory.', null, now(), now());

insert into wedding_websites (
  project_id, slug, published, template, theme, content,
  meal_service_style, rsvp_access_mode, song_requests_enabled,
  external_registry_links, created_at, updated_at
) values (
  'a0000000-d300-4000-8000-000000000002',
  null,
  false,
  'garden',
  'sage',
  jsonb_build_object(
    'hero', jsonb_build_object(
      'names', 'Maya & Jordan',
      'date', 'February 14, 2027',
      'tagline', 'Join us in Oakland',
      'showCountdown', true
    ),
    'story', jsonb_build_object(
      'heading', 'Our Story',
      'body', 'We met in a cooking class and have been making a mess of kitchens together ever since.',
      'visible', true
    ),
    'details', jsonb_build_object(
      'ceremonyVenue', 'The Conservatory',
      'ceremonyAddress', '120 Garden Way, Oakland CA',
      'ceremonyTime', '4:00 PM',
      'receptionVenue', 'The Conservatory',
      'receptionAddress', '120 Garden Way, Oakland CA',
      'receptionTime', '5:00 PM',
      'visible', true
    ),
    'schedule', jsonb_build_object('items', '[]'::jsonb, 'visible', true),
    'travel', jsonb_build_object('body', 'Hotels near Lake Merritt recommended.', 'places', '[]'::jsonb, 'visible', true),
    'gallery', jsonb_build_object('visible', false, 'images', '[]'::jsonb),
    'party', jsonb_build_object('visible', false, 'members', '[]'::jsonb),
    'faq', jsonb_build_object('visible', true, 'items', jsonb_build_array(
      jsonb_build_object('question', 'What should I wear?', 'answer', 'Garden formal — think dressy but comfortable for grass.')
    )),
    'registry', jsonb_build_object('visible', false),
    'rsvp', jsonb_build_object('visible', true)
  ),
  'plated',
  'gated',
  true,
  '[]'::jsonb,
  now(),
  now()
);

-- ------------------------------------------------------------
-- 2) BUSINESS TEMPLATE — reshape 3 active clients
-- ------------------------------------------------------------
do $$
declare
  v_biz uuid := 'a8886e9c-53b7-47d4-a6dc-521bc2b3c363';
  v_early uuid := 'e390b41c-3b55-4370-8ca1-857081757bfd';
  v_mid uuid := 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8';
  v_late uuid := '7cb744b2-b207-4e76-b944-691798c8878c';
begin
  update accounts
  set name = 'Events by Jordyn',
      kind = 'business',
      is_demo = false,
      is_demo_template = true
  where id = v_biz;

  -- Only this business template
  update accounts
  set is_demo_template = false
  where kind = 'business'
    and id <> v_biz
    and is_demo_template = true;

  -- Ensure projects exist / are staged
  update projects set
    name = 'Priya & Noah — just started',
    wedding_date = '2027-09-18',
    status = 'active',
    total_budget = 55000,
    archived_at = null,
    account_id = v_biz
  where id = v_early;

  update projects set
    name = 'Elena & Marcus — 6 months out',
    wedding_date = '2027-02-14',
    status = 'active',
    total_budget = 72000,
    archived_at = null,
    account_id = v_biz
  where id = v_mid;

  update projects set
    name = 'Sophie & James — month of',
    wedding_date = '2026-08-29',
    status = 'active',
    total_budget = 48000,
    archived_at = null,
    account_id = v_biz
  where id = v_late;

  perform _demo_wipe_project(v_early);
  perform _demo_wipe_project(v_mid);
  perform _demo_wipe_project(v_late);
end $$;

-- Shared planner rolodex (replace demo vendors on this account only — keep it tidy)
delete from vendors
where account_id = 'a8886e9c-53b7-47d4-a6dc-521bc2b3c363';

insert into vendors (
  id, account_id, name, category, contact_name, contact_email, is_preferred, source, created_at
) values
  ('b0000000-d300-4000-8000-000000000001', 'a8886e9c-53b7-47d4-a6dc-521bc2b3c363', 'Glasshouse Estate', 'venue', 'Riley Quinn', 'riley@glasshouse.example', true, 'manual', now()),
  ('b0000000-d300-4000-8000-000000000002', 'a8886e9c-53b7-47d4-a6dc-521bc2b3c363', 'Northlight Photo', 'photographer', 'Dana Wu', 'dana@northlight.example', true, 'manual', now()),
  ('b0000000-d300-4000-8000-000000000003', 'a8886e9c-53b7-47d4-a6dc-521bc2b3c363', 'Bloom Theory', 'florist', 'Jules Ortega', 'jules@bloom.example', true, 'manual', now()),
  ('b0000000-d300-4000-8000-000000000004', 'a8886e9c-53b7-47d4-a6dc-521bc2b3c363', 'Table & Thyme', 'caterer', 'Morgan Hale', 'morgan@tablethyme.example', true, 'manual', now()),
  ('b0000000-d300-4000-8000-000000000005', 'a8886e9c-53b7-47d4-a6dc-521bc2b3c363', 'Velvet Strings', 'band', 'Casey Nguyen', 'book@velvet.example', false, 'manual', now()),
  ('b0000000-d300-4000-8000-000000000006', 'a8886e9c-53b7-47d4-a6dc-521bc2b3c363', 'Sugar & Crumb', 'baker', 'Remy Cole', 'remy@sugarcrumb.example', false, 'manual', now()),
  ('b0000000-d300-4000-8000-000000000007', 'a8886e9c-53b7-47d4-a6dc-521bc2b3c363', 'Glow Beauty', 'hair-makeup', 'Skye Patel', 'skye@glow.example', false, 'manual', now()),
  ('b0000000-d300-4000-8000-000000000008', 'a8886e9c-53b7-47d4-a6dc-521bc2b3c363', 'City Officiants', 'officiant', 'Rev. Avery Moss', 'avery@cityofficiants.example', false, 'manual', now());

-- Leads pipeline (planner CRM)
delete from proposals where account_id = 'a8886e9c-53b7-47d4-a6dc-521bc2b3c363';
delete from leads where account_id = 'a8886e9c-53b7-47d4-a6dc-521bc2b3c363';

insert into leads (
  id, account_id, couple_name, contact_email, wedding_date, estimated_budget, venue, source, stage, notes, position, created_at, updated_at
) values
  ('b0000000-d300-4000-8000-000000000010', 'a8886e9c-53b7-47d4-a6dc-521bc2b3c363',
   'Ava & Dominic', 'ava@example.com', '2028-05-20', 65000, null, 'Instagram', 'inquiry', 'Asked about full planning', 0, now(), now()),
  ('b0000000-d300-4000-8000-000000000011', 'a8886e9c-53b7-47d4-a6dc-521bc2b3c363',
   'Harper & Quinn', 'harper@example.com', '2027-11-06', 80000, 'Glasshouse Estate', 'Referral', 'proposal', 'Sent full-service proposal', 0, now(), now()),
  ('b0000000-d300-4000-8000-000000000012', 'a8886e9c-53b7-47d4-a6dc-521bc2b3c363',
   'Lost lead example', 'gone@example.com', '2027-04-01', 40000, null, 'Website', 'lost', 'Budget mismatch', 0, now(), now());

insert into proposals (
  account_id, lead_id, title, line_items, total, status, notes, created_at, updated_at
) values (
  'a8886e9c-53b7-47d4-a6dc-521bc2b3c363',
  'b0000000-d300-4000-8000-000000000011',
  'Full planning — Harper & Quinn',
  '[{"label":"Full planning","amount":8500},{"label":"Month-of coordination","amount":3200}]'::jsonb,
  11700,
  'sent',
  null,
  now(),
  now()
);

insert into contract_templates (account_id, name, body, category, created_at, updated_at) values
  ('a8886e9c-53b7-47d4-a6dc-521bc2b3c363', 'Full planning agreement',
   'This agreement covers full wedding planning services for {{couple_names}} on {{wedding_date}}.',
   'planner', now(), now()),
  ('a8886e9c-53b7-47d4-a6dc-521bc2b3c363', 'Month-of coordination',
   'Month-of coordination package for {{couple_names}}.',
   'planner', now(), now());

-- ===== Client A: JUST STARTED (Priya & Noah) =====
insert into wedding_profile (
  project_id, location, guest_estimate, style, priorities, onboarded_at, created_at
) values (
  'e390b41c-3b55-4370-8ca1-857081757bfd',
  'Austin, TX', 140, 'Modern, desert-warm', 'Venue first, then photo', now() - interval '2 weeks', now()
);

insert into project_vendors (id, project_id, vendor_id, status, quoted_price, role, created_at) values
  ('b0000000-d300-4000-8000-000000000020', 'e390b41c-3b55-4370-8ca1-857081757bfd',
   'b0000000-d300-4000-8000-000000000001', 'to_contact', null, 'Venue shortlist', now()),
  ('b0000000-d300-4000-8000-000000000021', 'e390b41c-3b55-4370-8ca1-857081757bfd',
   'b0000000-d300-4000-8000-000000000002', 'to_contact', null, null, now());

insert into vendor_targets (project_id, category, status, created_at) values
  ('e390b41c-3b55-4370-8ca1-857081757bfd', 'venue', 'needed', now()),
  ('e390b41c-3b55-4370-8ca1-857081757bfd', 'photographer', 'needed', now()),
  ('e390b41c-3b55-4370-8ca1-857081757bfd', 'caterer', 'needed', now()),
  ('e390b41c-3b55-4370-8ca1-857081757bfd', 'florist', 'needed', now());

insert into tasks (project_id, title, status, phase, due_date, position, created_at) values
  ('e390b41c-3b55-4370-8ca1-857081757bfd', 'Set budget & guest list', 'in_progress', '12+ months', '2026-09-18', 0, now()),
  ('e390b41c-3b55-4370-8ca1-857081757bfd', 'Book venue', 'todo', '12+ months', '2026-09-18', 1, now()),
  ('e390b41c-3b55-4370-8ca1-857081757bfd', 'Book photographer', 'todo', '9 months', '2026-11-18', 0, now()),
  ('e390b41c-3b55-4370-8ca1-857081757bfd', 'Book catering', 'todo', '9 months', '2026-12-18', 1, now());

insert into budget_items (project_id, category, label, planned_amount, created_at) values
  ('e390b41c-3b55-4370-8ca1-857081757bfd', 'venue', 'Venue (estimate)', 18000, now()),
  ('e390b41c-3b55-4370-8ca1-857081757bfd', 'photo', 'Photo / video', 7000, now()),
  ('e390b41c-3b55-4370-8ca1-857081757bfd', 'food', 'Catering', 16000, now()),
  ('e390b41c-3b55-4370-8ca1-857081757bfd', 'misc', 'Buffer', 4000, now());

insert into guests (id, project_id, full_name, party_size, rsvp_status, rsvp_token, created_at) values
  ('b0000000-d300-4000-8000-000000000030', 'e390b41c-3b55-4370-8ca1-857081757bfd', 'Priya Kapoor', 1, 'attending', encode(extensions.gen_random_bytes(16), 'hex'), now()),
  ('b0000000-d300-4000-8000-000000000031', 'e390b41c-3b55-4370-8ca1-857081757bfd', 'Noah Bennett', 1, 'attending', encode(extensions.gen_random_bytes(16), 'hex'), now()),
  ('b0000000-d300-4000-8000-000000000032', 'e390b41c-3b55-4370-8ca1-857081757bfd', 'Parents (Kapoor)', 2, 'pending', encode(extensions.gen_random_bytes(16), 'hex'), now());

insert into guest_members (project_id, guest_id, name, attending, sort_order, member_type, created_at)
select 'e390b41c-3b55-4370-8ca1-857081757bfd', id, full_name, true, 0, 'adult', now()
from guests where project_id = 'e390b41c-3b55-4370-8ca1-857081757bfd';

insert into notes (project_id, title, body, created_at, updated_at) values
  ('e390b41c-3b55-4370-8ca1-857081757bfd', 'Kickoff call', 'Couple wants a warm modern vibe; no outdoor ceremony if August heat is an issue — date is Sept so OK.', now(), now());

insert into wedding_websites (
  project_id, slug, published, template, theme, content, meal_service_style, rsvp_access_mode, created_at, updated_at
) values (
  'e390b41c-3b55-4370-8ca1-857081757bfd', null, false, 'minimalist', 'ivory',
  jsonb_build_object(
    'hero', jsonb_build_object('names', 'Priya & Noah', 'date', 'September 18, 2027', 'tagline', '', 'showCountdown', true),
    'story', jsonb_build_object('heading', 'Our Story', 'body', '', 'visible', true),
    'details', jsonb_build_object('ceremonyVenue', '', 'ceremonyAddress', '', 'ceremonyTime', '', 'receptionVenue', '', 'receptionAddress', '', 'receptionTime', '', 'visible', true),
    'schedule', jsonb_build_object('items', '[]'::jsonb, 'visible', false),
    'travel', jsonb_build_object('body', '', 'places', '[]'::jsonb, 'visible', false),
    'gallery', jsonb_build_object('visible', false, 'images', '[]'::jsonb),
    'party', jsonb_build_object('visible', false, 'members', '[]'::jsonb),
    'faq', jsonb_build_object('visible', false, 'items', '[]'::jsonb),
    'registry', jsonb_build_object('visible', false),
    'rsvp', jsonb_build_object('visible', false)
  ),
  'none', 'gated', now(), now()
);

insert into calendar_events (account_id, project_id, title, event_kind, starts_at, all_day, created_at) values
  ('a8886e9c-53b7-47d4-a6dc-521bc2b3c363', 'e390b41c-3b55-4370-8ca1-857081757bfd',
   'Priya & Noah — planning kickoff', 'meeting', '2026-08-12 16:00:00+00', false, now());

-- ===== Client B: 6 MONTHS OUT (Elena & Marcus) =====
insert into wedding_profile (
  project_id, location, guest_estimate, style, traditions, priorities, onboarded_at, created_at
) values (
  'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8',
  'Napa, CA', 160, 'Romantic vineyard', 'None specific', 'Florals + dinner service', now() - interval '7 months', now()
);

insert into project_vendors (id, project_id, vendor_id, status, quoted_price, role, notes, created_at) values
  ('b0000000-d300-4000-8000-000000000040', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8',
   'b0000000-d300-4000-8000-000000000001', 'booked', 22000, 'Estate buyout', 'Contract signed', now()),
  ('b0000000-d300-4000-8000-000000000041', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8',
   'b0000000-d300-4000-8000-000000000002', 'booked', 6200, 'Photo', null, now()),
  ('b0000000-d300-4000-8000-000000000042', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8',
   'b0000000-d300-4000-8000-000000000004', 'replied', 14000, 'Dinner', 'Tasting next week', now()),
  ('b0000000-d300-4000-8000-000000000043', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8',
   'b0000000-d300-4000-8000-000000000003', 'contacted', null, 'Florals', null, now()),
  ('b0000000-d300-4000-8000-000000000044', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8',
   'b0000000-d300-4000-8000-000000000005', 'to_contact', null, 'Reception band', null, now());

insert into vendor_targets (project_id, category, status, project_vendor_id, created_at) values
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'venue', 'booked', 'b0000000-d300-4000-8000-000000000040', now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'photographer', 'booked', 'b0000000-d300-4000-8000-000000000041', now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'caterer', 'needed', null, now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'florist', 'needed', null, now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'band', 'needed', null, now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'baker', 'needed', null, now());

insert into tasks (project_id, title, status, phase, due_date, vendor_id, position, created_at) values
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Set budget & guest list', 'done', '12+ months', '2026-02-14', null, 0, now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Book venue', 'done', '12+ months', '2026-02-14', 'b0000000-d300-4000-8000-000000000040', 1, now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Book photographer', 'done', '9 months', '2026-04-14', 'b0000000-d300-4000-8000-000000000041', 0, now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Book catering', 'in_progress', '9 months', '2026-05-14', 'b0000000-d300-4000-8000-000000000042', 1, now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Hire florist', 'todo', '6 months', '2026-08-14', 'b0000000-d300-4000-8000-000000000043', 0, now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Book DJ or band', 'todo', '6 months', '2026-08-14', 'b0000000-d300-4000-8000-000000000044', 1, now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Send save-the-dates', 'in_progress', '6 months', '2026-09-01', null, 2, now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Order invitations', 'todo', '3 months', '2026-10-14', null, 0, now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Menu tasting & finalize catering', 'todo', '3 months', '2026-11-14', 'b0000000-d300-4000-8000-000000000042', 1, now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Confirm final headcount', 'todo', '1 month', '2027-01-14', null, 0, now());

insert into budget_items (id, project_id, category, label, planned_amount, actual_amount, project_vendor_id, created_at) values
  ('b0000000-d300-4000-8000-000000000050', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'venue', 'Estate buyout', 22000, 22000, 'b0000000-d300-4000-8000-000000000040', now()),
  ('b0000000-d300-4000-8000-000000000051', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'photo', 'Photography', 6200, 6200, 'b0000000-d300-4000-8000-000000000041', now()),
  ('b0000000-d300-4000-8000-000000000052', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'food', 'Catering', 15000, null, 'b0000000-d300-4000-8000-000000000042', now()),
  ('b0000000-d300-4000-8000-000000000053', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'florals', 'Florals', 4500, null, null, now()),
  ('b0000000-d300-4000-8000-000000000054', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'music', 'Band', 5000, null, null, now()),
  ('b0000000-d300-4000-8000-000000000055', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'attire', 'Attire', 4000, 1800, null, now());

insert into budget_payments (project_id, budget_item_id, amount, paid_on, note, created_at) values
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'b0000000-d300-4000-8000-000000000050', 8000, '2026-03-10', 'Venue deposit', now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'b0000000-d300-4000-8000-000000000051', 2000, '2026-04-02', 'Photo retainer', now());

insert into meal_options (id, project_id, name, is_kids, sort_order, created_at) values
  ('b0000000-d300-4000-8000-000000000060', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Filet', false, 0, now()),
  ('b0000000-d300-4000-8000-000000000061', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Sea bass', false, 1, now()),
  ('b0000000-d300-4000-8000-000000000062', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Vegetarian plate', false, 2, now());

insert into guests (id, project_id, full_name, email, party_size, rsvp_status, rsvp_token, created_at) values
  ('b0000000-d300-4000-8000-000000000070', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Elena Vargas', null, 1, 'attending', encode(extensions.gen_random_bytes(16), 'hex'), now()),
  ('b0000000-d300-4000-8000-000000000071', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Marcus Cole', null, 1, 'attending', encode(extensions.gen_random_bytes(16), 'hex'), now()),
  ('b0000000-d300-4000-8000-000000000072', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'The Vargas Family', 'vargas@example.com', 4, 'pending', encode(extensions.gen_random_bytes(16), 'hex'), now()),
  ('b0000000-d300-4000-8000-000000000073', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'The Cole Family', 'cole@example.com', 3, 'attending', encode(extensions.gen_random_bytes(16), 'hex'), now()),
  ('b0000000-d300-4000-8000-000000000074', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Samira Khan', 'samira@example.com', 2, 'pending', encode(extensions.gen_random_bytes(16), 'hex'), now()),
  ('b0000000-d300-4000-8000-000000000075', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Ben Ortiz', 'ben@example.com', 1, 'declined', encode(extensions.gen_random_bytes(16), 'hex'), now());

insert into guest_members (id, project_id, guest_id, name, attending, sort_order, member_type, created_at) values
  ('b0000000-d300-4000-8000-000000000080', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'b0000000-d300-4000-8000-000000000070', 'Elena Vargas', true, 0, 'adult', now()),
  ('b0000000-d300-4000-8000-000000000081', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'b0000000-d300-4000-8000-000000000071', 'Marcus Cole', true, 0, 'adult', now()),
  ('b0000000-d300-4000-8000-000000000082', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'b0000000-d300-4000-8000-000000000072', 'Rosa Vargas', true, 0, 'adult', now()),
  ('b0000000-d300-4000-8000-000000000083', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'b0000000-d300-4000-8000-000000000072', 'Luis Vargas', true, 1, 'adult', now()),
  ('b0000000-d300-4000-8000-000000000084', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'b0000000-d300-4000-8000-000000000073', 'Nina Cole', true, 0, 'adult', now()),
  ('b0000000-d300-4000-8000-000000000085', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'b0000000-d300-4000-8000-000000000073', 'David Cole', true, 1, 'adult', now()),
  ('b0000000-d300-4000-8000-000000000086', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'b0000000-d300-4000-8000-000000000074', 'Samira Khan', true, 0, 'adult', now()),
  ('b0000000-d300-4000-8000-000000000087', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'b0000000-d300-4000-8000-000000000074', 'Guest', true, 1, 'adult', now());

insert into seating_tables (id, project_id, label, shape, seat_count, kind, pos_x, pos_y, rotation, created_at) values
  ('b0000000-d300-4000-8000-000000000090', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Sweetheart', 'rectangle', 2, 'sweetheart', 400, 60, 0, now()),
  ('b0000000-d300-4000-8000-000000000091', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Family 1', 'round', 10, 'standard', 160, 240, 0, now()),
  ('b0000000-d300-4000-8000-000000000092', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Friends', 'round', 8, 'standard', 400, 240, 0, now());

insert into seating_assignments (project_id, table_id, guest_id, guest_member_id, seat_index, created_at) values
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'b0000000-d300-4000-8000-000000000090', 'b0000000-d300-4000-8000-000000000070', 'b0000000-d300-4000-8000-000000000080', 0, now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'b0000000-d300-4000-8000-000000000090', 'b0000000-d300-4000-8000-000000000071', 'b0000000-d300-4000-8000-000000000081', 1, now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'b0000000-d300-4000-8000-000000000091', 'b0000000-d300-4000-8000-000000000072', 'b0000000-d300-4000-8000-000000000082', 0, now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'b0000000-d300-4000-8000-000000000091', 'b0000000-d300-4000-8000-000000000072', 'b0000000-d300-4000-8000-000000000083', 1, now());

insert into timeline_events (project_id, title, start_time, section, position, created_at) values
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Ceremony', '16:30', 'Ceremony', 0, now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Cocktail hour', '17:15', 'Reception', 1, now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Dinner', '18:30', 'Reception', 2, now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Dancing', '20:00', 'Reception', 3, now());

insert into notes (project_id, title, body, action_status, created_at, updated_at) values
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Catering tasting', 'Confirm dietary counts after tasting.', 'needs_action', now(), now()),
  ('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 'Save-the-date proof', 'Couple approved soft blush palette.', 'done', now(), now());

insert into wedding_websites (
  project_id, slug, published, template, theme, content, meal_service_style, rsvp_access_mode, song_requests_enabled, created_at, updated_at
) values (
  'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', null, false, 'romance', 'blush',
  jsonb_build_object(
    'hero', jsonb_build_object('names', 'Elena & Marcus', 'date', 'February 14, 2027', 'tagline', 'A vineyard wedding in Napa', 'showCountdown', true),
    'story', jsonb_build_object('heading', 'Our Story', 'body', 'Two city kids who fell for slow weekends in wine country.', 'visible', true),
    'details', jsonb_build_object('ceremonyVenue', 'Glasshouse Estate', 'ceremonyAddress', 'Napa Valley', 'ceremonyTime', '4:30 PM', 'receptionVenue', 'Glasshouse Estate', 'receptionAddress', 'Napa Valley', 'receptionTime', '5:15 PM', 'visible', true),
    'schedule', jsonb_build_object('items', '[]'::jsonb, 'visible', true),
    'travel', jsonb_build_object('body', 'We recommend staying in downtown Napa.', 'places', '[]'::jsonb, 'visible', true),
    'gallery', jsonb_build_object('visible', false, 'images', '[]'::jsonb),
    'party', jsonb_build_object('visible', false, 'members', '[]'::jsonb),
    'faq', jsonb_build_object('visible', true, 'items', jsonb_build_array(
      jsonb_build_object('question', 'Is the wedding outdoors?', 'answer', 'Ceremony is outdoors with an indoor rain plan.')
    )),
    'registry', jsonb_build_object('visible', false),
    'rsvp', jsonb_build_object('visible', true)
  ),
  'plated', 'gated', true, now(), now()
);

insert into calendar_events (account_id, project_id, title, event_kind, starts_at, all_day, created_at) values
  ('a8886e9c-53b7-47d4-a6dc-521bc2b3c363', 'b7c32347-722a-4c6d-8ba4-c98cd2eb77e8',
   'Elena & Marcus — catering tasting', 'tasting', '2026-08-20 18:00:00+00', false, now());

-- ===== Client C: MONTH-OF (Sophie & James) =====
insert into wedding_profile (
  project_id, location, guest_estimate, style, priorities, vibe_notes, onboarded_at, created_at
) values (
  '7cb744b2-b207-4e76-b944-691798c8878c',
  'Seattle, WA', 95, 'Classic city', 'Guest experience, timing', 'Tight timeline — everything locked', now() - interval '11 months', now()
);

insert into project_vendors (id, project_id, vendor_id, status, quoted_price, role, created_at) values
  ('b0000000-d300-4000-8000-000000000100', '7cb744b2-b207-4e76-b944-691798c8878c',
   'b0000000-d300-4000-8000-000000000001', 'booked', 14000, 'Venue', now()),
  ('b0000000-d300-4000-8000-000000000101', '7cb744b2-b207-4e76-b944-691798c8878c',
   'b0000000-d300-4000-8000-000000000002', 'booked', 5200, 'Photo', now()),
  ('b0000000-d300-4000-8000-000000000102', '7cb744b2-b207-4e76-b944-691798c8878c',
   'b0000000-d300-4000-8000-000000000004', 'booked', 11000, 'Catering', now()),
  ('b0000000-d300-4000-8000-000000000103', '7cb744b2-b207-4e76-b944-691798c8878c',
   'b0000000-d300-4000-8000-000000000003', 'booked', 3200, 'Florals', now()),
  ('b0000000-d300-4000-8000-000000000104', '7cb744b2-b207-4e76-b944-691798c8878c',
   'b0000000-d300-4000-8000-000000000006', 'booked', 900, 'Cake', now()),
  ('b0000000-d300-4000-8000-000000000105', '7cb744b2-b207-4e76-b944-691798c8878c',
   'b0000000-d300-4000-8000-000000000007', 'booked', 1100, 'HMU', now()),
  ('b0000000-d300-4000-8000-000000000106', '7cb744b2-b207-4e76-b944-691798c8878c',
   'b0000000-d300-4000-8000-000000000008', 'booked', 450, 'Ceremony', now());

insert into vendor_targets (project_id, category, status, project_vendor_id, created_at) values
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'venue', 'booked', 'b0000000-d300-4000-8000-000000000100', now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'photographer', 'booked', 'b0000000-d300-4000-8000-000000000101', now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'caterer', 'booked', 'b0000000-d300-4000-8000-000000000102', now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'florist', 'booked', 'b0000000-d300-4000-8000-000000000103', now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'baker', 'booked', 'b0000000-d300-4000-8000-000000000104', now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'hair-makeup', 'booked', 'b0000000-d300-4000-8000-000000000105', now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'officiant', 'booked', 'b0000000-d300-4000-8000-000000000106', now());

insert into tasks (project_id, title, status, phase, due_date, position, created_at) values
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Set budget & guest list', 'done', '12+ months', '2025-08-29', 0, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Book venue', 'done', '12+ months', '2025-08-29', 1, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Book photographer', 'done', '9 months', '2025-10-29', 0, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Book catering', 'done', '9 months', '2025-11-29', 1, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Hire florist', 'done', '6 months', '2026-02-28', 0, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Send save-the-dates', 'done', '6 months', '2026-03-01', 1, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Order invitations', 'done', '3 months', '2026-05-29', 0, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Confirm final headcount', 'done', '1 month', '2026-07-29', 0, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Final walkthrough with venue', 'done', '1 month', '2026-08-15', 1, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Pack for honeymoon', 'in_progress', 'week of', '2026-08-22', 0, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Rehearsal dinner', 'todo', 'week of', '2026-08-28', 1, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Distribute day-of timeline', 'todo', 'week of', '2026-08-27', 2, now());

insert into budget_items (id, project_id, category, label, planned_amount, actual_amount, project_vendor_id, created_at) values
  ('b0000000-d300-4000-8000-000000000110', '7cb744b2-b207-4e76-b944-691798c8878c', 'venue', 'Venue', 14000, 14000, 'b0000000-d300-4000-8000-000000000100', now()),
  ('b0000000-d300-4000-8000-000000000111', '7cb744b2-b207-4e76-b944-691798c8878c', 'photo', 'Photo', 5200, 5200, 'b0000000-d300-4000-8000-000000000101', now()),
  ('b0000000-d300-4000-8000-000000000112', '7cb744b2-b207-4e76-b944-691798c8878c', 'food', 'Catering', 11000, 11200, 'b0000000-d300-4000-8000-000000000102', now()),
  ('b0000000-d300-4000-8000-000000000113', '7cb744b2-b207-4e76-b944-691798c8878c', 'florals', 'Florals', 3200, 3200, 'b0000000-d300-4000-8000-000000000103', now()),
  ('b0000000-d300-4000-8000-000000000114', '7cb744b2-b207-4e76-b944-691798c8878c', 'cake', 'Cake', 900, 900, 'b0000000-d300-4000-8000-000000000104', now()),
  ('b0000000-d300-4000-8000-000000000115', '7cb744b2-b207-4e76-b944-691798c8878c', 'beauty', 'Hair & makeup', 1100, 1100, 'b0000000-d300-4000-8000-000000000105', now());

insert into budget_payments (project_id, budget_item_id, amount, paid_on, note, created_at) values
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000110', 14000, '2026-07-01', 'Paid in full', now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000111', 5200, '2026-07-15', 'Paid in full', now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000112', 5000, '2026-06-01', 'Deposit', now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000112', 6200, '2026-08-01', 'Balance', now());

insert into meal_options (id, project_id, name, is_kids, sort_order, created_at) values
  ('b0000000-d300-4000-8000-000000000120', '7cb744b2-b207-4e76-b944-691798c8878c', 'Chicken', false, 0, now()),
  ('b0000000-d300-4000-8000-000000000121', '7cb744b2-b207-4e76-b944-691798c8878c', 'Salmon', false, 1, now()),
  ('b0000000-d300-4000-8000-000000000122', '7cb744b2-b207-4e76-b944-691798c8878c', 'Veg', false, 2, now()),
  ('b0000000-d300-4000-8000-000000000123', '7cb744b2-b207-4e76-b944-691798c8878c', 'Kids', true, 3, now());

insert into guests (id, project_id, full_name, email, party_size, rsvp_status, rsvp_token, created_at) values
  ('b0000000-d300-4000-8000-000000000130', '7cb744b2-b207-4e76-b944-691798c8878c', 'Sophie Nguyen', null, 1, 'attending', encode(extensions.gen_random_bytes(16), 'hex'), now()),
  ('b0000000-d300-4000-8000-000000000131', '7cb744b2-b207-4e76-b944-691798c8878c', 'James Walker', null, 1, 'attending', encode(extensions.gen_random_bytes(16), 'hex'), now()),
  ('b0000000-d300-4000-8000-000000000132', '7cb744b2-b207-4e76-b944-691798c8878c', 'Nguyen family', 'nguyen@example.com', 4, 'attending', encode(extensions.gen_random_bytes(16), 'hex'), now()),
  ('b0000000-d300-4000-8000-000000000133', '7cb744b2-b207-4e76-b944-691798c8878c', 'Walker family', 'walker@example.com', 3, 'attending', encode(extensions.gen_random_bytes(16), 'hex'), now()),
  ('b0000000-d300-4000-8000-000000000134', '7cb744b2-b207-4e76-b944-691798c8878c', 'College friends', 'friends@example.com', 6, 'attending', encode(extensions.gen_random_bytes(16), 'hex'), now()),
  ('b0000000-d300-4000-8000-000000000135', '7cb744b2-b207-4e76-b944-691798c8878c', 'Work crew', 'work@example.com', 4, 'attending', encode(extensions.gen_random_bytes(16), 'hex'), now()),
  ('b0000000-d300-4000-8000-000000000136', '7cb744b2-b207-4e76-b944-691798c8878c', 'Declined cousins', 'cousins@example.com', 2, 'declined', encode(extensions.gen_random_bytes(16), 'hex'), now());

insert into guest_members (id, project_id, guest_id, name, meal_option_id, attending, sort_order, member_type, created_at) values
  ('b0000000-d300-4000-8000-000000000140', '7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000130', 'Sophie Nguyen', 'b0000000-d300-4000-8000-000000000120', true, 0, 'adult', now()),
  ('b0000000-d300-4000-8000-000000000141', '7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000131', 'James Walker', 'b0000000-d300-4000-8000-000000000121', true, 0, 'adult', now()),
  ('b0000000-d300-4000-8000-000000000142', '7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000132', 'Mai Nguyen', 'b0000000-d300-4000-8000-000000000120', true, 0, 'adult', now()),
  ('b0000000-d300-4000-8000-000000000143', '7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000132', 'Tom Nguyen', 'b0000000-d300-4000-8000-000000000121', true, 1, 'adult', now()),
  ('b0000000-d300-4000-8000-000000000144', '7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000133', 'Helen Walker', 'b0000000-d300-4000-8000-000000000122', true, 0, 'adult', now()),
  ('b0000000-d300-4000-8000-000000000145', '7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000134', 'Chris', 'b0000000-d300-4000-8000-000000000120', true, 0, 'adult', now()),
  ('b0000000-d300-4000-8000-000000000146', '7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000134', 'Alex', 'b0000000-d300-4000-8000-000000000121', true, 1, 'adult', now()),
  ('b0000000-d300-4000-8000-000000000147', '7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000135', 'Jamie', 'b0000000-d300-4000-8000-000000000122', true, 0, 'adult', now());

insert into seating_tables (id, project_id, label, shape, seat_count, kind, pos_x, pos_y, rotation, created_at) values
  ('b0000000-d300-4000-8000-000000000150', '7cb744b2-b207-4e76-b944-691798c8878c', 'Sweetheart', 'rectangle', 2, 'sweetheart', 400, 40, 0, now()),
  ('b0000000-d300-4000-8000-000000000151', '7cb744b2-b207-4e76-b944-691798c8878c', 'Family', 'round', 8, 'standard', 160, 200, 0, now()),
  ('b0000000-d300-4000-8000-000000000152', '7cb744b2-b207-4e76-b944-691798c8878c', 'Friends A', 'round', 8, 'standard', 400, 200, 0, now()),
  ('b0000000-d300-4000-8000-000000000153', '7cb744b2-b207-4e76-b944-691798c8878c', 'Friends B', 'round', 8, 'standard', 640, 200, 0, now()),
  ('b0000000-d300-4000-8000-000000000154', '7cb744b2-b207-4e76-b944-691798c8878c', 'Dance floor', 'square', 0, 'dancefloor', 400, 380, 0, now());

insert into seating_assignments (project_id, table_id, guest_id, guest_member_id, seat_index, created_at) values
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000150', 'b0000000-d300-4000-8000-000000000130', 'b0000000-d300-4000-8000-000000000140', 0, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000150', 'b0000000-d300-4000-8000-000000000131', 'b0000000-d300-4000-8000-000000000141', 1, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000151', 'b0000000-d300-4000-8000-000000000132', 'b0000000-d300-4000-8000-000000000142', 0, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000151', 'b0000000-d300-4000-8000-000000000132', 'b0000000-d300-4000-8000-000000000143', 1, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000151', 'b0000000-d300-4000-8000-000000000133', 'b0000000-d300-4000-8000-000000000144', 2, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000152', 'b0000000-d300-4000-8000-000000000134', 'b0000000-d300-4000-8000-000000000145', 0, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000152', 'b0000000-d300-4000-8000-000000000134', 'b0000000-d300-4000-8000-000000000146', 1, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000153', 'b0000000-d300-4000-8000-000000000135', 'b0000000-d300-4000-8000-000000000147', 0, now());

insert into timeline_events (project_id, title, description, start_time, end_time, section, owner, position, created_at) values
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Hair & makeup', 'Suite 412', '08:00', '12:30', 'Morning', 'Glow Beauty', 0, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'First look', 'Rooftop', '13:30', '14:15', 'Afternoon', 'Northlight', 1, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Ceremony', null, '16:00', '16:40', 'Ceremony', 'Officiant', 2, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Cocktail hour', null, '16:40', '17:45', 'Reception', 'Caterer', 3, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Grand entrance', null, '17:45', '18:00', 'Reception', 'DJ', 4, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Dinner service', null, '18:00', '19:30', 'Reception', 'Caterer', 5, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Toasts', null, '19:30', '19:50', 'Reception', 'MOH / Best man', 6, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Cake & dancing', null, '20:00', '23:00', 'Reception', 'DJ', 7, now());

insert into notes (project_id, title, body, action_status, created_at, updated_at) values
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Day-of contacts', 'Venue day-of: 555-0199. Photographer arrives 12:45.', 'done', now(), now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Rain plan', 'Ceremony moves to atrium if needed — already confirmed.', 'done', now(), now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'Final headcount to caterer', 'Confirm kids meal count by Wednesday.', 'needs_action', now(), now());

insert into rsvp_submissions (id, project_id, name, response, party_size, email, status, matched_guest_id, created_at) values
  ('b0000000-d300-4000-8000-000000000160', '7cb744b2-b207-4e76-b944-691798c8878c', 'Nguyen family', 'yes', 4, 'nguyen@example.com', 'reviewed', 'b0000000-d300-4000-8000-000000000132', now() - interval '20 days'),
  ('b0000000-d300-4000-8000-000000000161', '7cb744b2-b207-4e76-b944-691798c8878c', 'College friends', 'yes', 6, 'friends@example.com', 'reviewed', 'b0000000-d300-4000-8000-000000000134', now() - interval '12 days');

insert into rsvp_attendees (project_id, submission_id, meal_option_id, name, sort_order, created_at) values
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000160', 'b0000000-d300-4000-8000-000000000120', 'Mai Nguyen', 0, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000160', 'b0000000-d300-4000-8000-000000000121', 'Tom Nguyen', 1, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000161', 'b0000000-d300-4000-8000-000000000120', 'Chris', 0, now()),
  ('7cb744b2-b207-4e76-b944-691798c8878c', 'b0000000-d300-4000-8000-000000000161', 'b0000000-d300-4000-8000-000000000121', 'Alex', 1, now());

insert into wedding_websites (
  project_id, slug, published, template, theme, content, meal_service_style, rsvp_access_mode, song_requests_enabled, created_at, updated_at
) values (
  '7cb744b2-b207-4e76-b944-691798c8878c', null, false, 'editorial', 'slate',
  jsonb_build_object(
    'hero', jsonb_build_object('names', 'Sophie & James', 'date', 'August 29, 2026', 'tagline', 'Seattle', 'showCountdown', true),
    'story', jsonb_build_object('heading', 'Our Story', 'body', 'From rainy coffee dates to forever.', 'visible', true),
    'details', jsonb_build_object('ceremonyVenue', 'Glasshouse Estate Seattle', 'ceremonyAddress', 'Seattle, WA', 'ceremonyTime', '4:00 PM', 'receptionVenue', 'Glasshouse Estate Seattle', 'receptionAddress', 'Seattle, WA', 'receptionTime', '5:00 PM', 'visible', true),
    'schedule', jsonb_build_object('items', '[]'::jsonb, 'visible', true),
    'travel', jsonb_build_object('body', 'Downtown hotels within 10 minutes.', 'places', '[]'::jsonb, 'visible', true),
    'gallery', jsonb_build_object('visible', false, 'images', '[]'::jsonb),
    'party', jsonb_build_object('visible', false, 'members', '[]'::jsonb),
    'faq', jsonb_build_object('visible', true, 'items', jsonb_build_array(
      jsonb_build_object('question', 'Can I bring a plus-one?', 'answer', 'Please check your invitation — we reserved seats carefully.')
    )),
    'registry', jsonb_build_object('visible', false),
    'rsvp', jsonb_build_object('visible', true)
  ),
  'plated', 'gated', true, now(), now()
);

insert into calendar_events (account_id, project_id, title, event_kind, starts_at, all_day, created_at) values
  ('a8886e9c-53b7-47d4-a6dc-521bc2b3c363', '7cb744b2-b207-4e76-b944-691798c8878c',
   'Sophie & James — final venue walkthrough', 'site_visit', '2026-08-15 15:00:00+00', false, now()),
  ('a8886e9c-53b7-47d4-a6dc-521bc2b3c363', '7cb744b2-b207-4e76-b944-691798c8878c',
   'Sophie & James — wedding day', 'other', '2026-08-29 00:00:00+00', true, now()),
  ('a8886e9c-53b7-47d4-a6dc-521bc2b3c363', null,
   'Planner admin — invoice review', 'deadline', '2026-08-18 17:00:00+00', false, now());

-- Cleanup helper (keep wipe function out of production API surface)
drop function if exists _demo_wipe_project(uuid);
