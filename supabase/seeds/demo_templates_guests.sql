-- ============================================================
-- seeds/demo_templates_guests.sql
-- Additive patch: 4th planner client + realistic guest volumes.
-- Re-runnable. MUST run AFTER demo_templates.sql (depends on
-- business account a8886e9c-53b7-47d4-a6dc-521bc2b3c363 existing).
--
-- DESTRUCTIVE on the Mila & Griffin demo project (and guest rows
-- this file rebuilds). Refuses to run unless this session has:
--   set demo.seed_confirm = 'reseed-demo-templates';
-- Name the database with --db-url <connection-string>. Never --linked.
-- `db query --project-ref` does not retarget; with --linked it still hits
-- whatever the CLI is currently pointed at.
--
-- SQL editor: run the SET, then this file, in the same session
-- (or paste the SET as the first line).
-- CLI (PowerShell):
--   $sql = "set demo.seed_confirm = 'reseed-demo-templates';`n" + (Get-Content -Raw .\supabase\seeds\demo_templates_guests.sql)
--   $tmp = Join-Path $env:TEMP 'demo_templates_guests.apply.sql'
--   Set-Content -Path $tmp -Value $sql
--   npx supabase db query --db-url $env:STAGING_DB_URL -f $tmp
-- ============================================================

do $seed_guard$
begin
  if current_setting('demo.seed_confirm', true) is distinct from 'reseed-demo-templates' then
    raise exception 'demo_seed_refused: set demo.seed_confirm = ''reseed-demo-templates'' (see file header). Nothing applied.'
      using errcode = 'P0001';
  end if;
end
$seed_guard$;

create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------
-- 1) Fourth planner client — Mila & Griffin (~9 months out)
-- ------------------------------------------------------------
-- Fresh-DB bootstrap: project was historically assumed present.
-- Placeholder satisfies NOT NULL + FK; UPDATE below overwrites.
insert into projects (id, account_id, name)
values (
  '1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9',
  'a8886e9c-53b7-47d4-a6dc-521bc2b3c363',
  'Demo Bootstrap'
)
on conflict (id) do nothing;

do $$
declare
  v_biz uuid := 'a8886e9c-53b7-47d4-a6dc-521bc2b3c363';
  v_nine uuid := '1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9';
begin
  update projects set
    name = 'Mila & Griffin — 9 months out',
    wedding_date = '2027-05-15',
    status = 'active',
    total_budget = 58000,
    archived_at = null,
    account_id = v_biz
  where id = v_nine;

  delete from seating_assignments where project_id = v_nine;
  delete from rsvp_attendees where project_id = v_nine;
  delete from guest_members where project_id = v_nine;
  delete from rsvp_submissions where project_id = v_nine;
  delete from guests where project_id = v_nine;
  delete from budget_payments where project_id = v_nine;
  delete from payment_schedule where project_id = v_nine;
  delete from budget_items where project_id = v_nine;
  delete from budget_alert_dismissals where project_id = v_nine;
  delete from files where project_id = v_nine;
  delete from notes where project_id = v_nine;
  delete from timeline_events where project_id = v_nine;
  delete from meal_options where project_id = v_nine;
  delete from vendor_targets where project_id = v_nine;
  delete from tasks where project_id = v_nine;
  delete from project_vendors where project_id = v_nine;
  delete from seating_tables where project_id = v_nine;
  delete from wedding_websites where project_id = v_nine;
  delete from wedding_profile where project_id = v_nine;
  delete from calendar_events where project_id = v_nine;
  delete from assistant_messages where project_id = v_nine;
end $$;

insert into wedding_profile (
  project_id, location, guest_estimate, style, priorities, onboarded_at, created_at
) values (
  '1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9',
  'Portland, OR', 125, 'Indie / woodland', 'Venue + photo locked; building guest list',
  now() - interval '4 months', now()
)
on conflict (project_id) do update
set location = excluded.location,
    guest_estimate = excluded.guest_estimate,
    style = excluded.style,
    priorities = excluded.priorities;

-- Reuse existing planner rolodex vendors (must exist from demo_templates.sql)
insert into project_vendors (id, project_id, vendor_id, status, quoted_price, role, created_at) values
  ('b0000000-d300-4000-8000-000000000200', '1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9',
   'b0000000-d300-4000-8000-000000000001', 'booked', 16000, 'Venue', now()),
  ('b0000000-d300-4000-8000-000000000201', '1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9',
   'b0000000-d300-4000-8000-000000000002', 'booked', 4800, 'Photo', now()),
  ('b0000000-d300-4000-8000-000000000202', '1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9',
   'b0000000-d300-4000-8000-000000000004', 'contacted', null, 'Catering', now()),
  ('b0000000-d300-4000-8000-000000000203', '1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9',
   'b0000000-d300-4000-8000-000000000003', 'to_contact', null, 'Florals', now())
on conflict (id) do nothing;

insert into vendor_targets (project_id, category, status, project_vendor_id, created_at) values
  ('1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'venue', 'booked', 'b0000000-d300-4000-8000-000000000200', now()),
  ('1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'photographer', 'booked', 'b0000000-d300-4000-8000-000000000201', now()),
  ('1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'caterer', 'needed', null, now()),
  ('1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'florist', 'needed', null, now()),
  ('1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'dj', 'needed', null, now());

insert into tasks (project_id, title, status, phase, due_date, vendor_id, position, created_at) values
  ('1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'Set budget & guest list', 'done', '12+ months', '2026-05-15', null, 0, now()),
  ('1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'Book venue', 'done', '12+ months', '2026-05-15', 'b0000000-d300-4000-8000-000000000200', 1, now()),
  ('1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'Book photographer', 'done', '9 months', '2026-08-15', 'b0000000-d300-4000-8000-000000000201', 0, now()),
  ('1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'Book catering', 'in_progress', '9 months', '2026-08-15', 'b0000000-d300-4000-8000-000000000202', 1, now()),
  ('1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'Hire florist', 'todo', '6 months', '2026-11-15', 'b0000000-d300-4000-8000-000000000203', 0, now()),
  ('1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'Send save-the-dates', 'todo', '6 months', '2026-11-15', null, 1, now()),
  ('1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'Build out guest list', 'in_progress', '9 months', '2026-09-01', null, 2, now());

insert into budget_items (project_id, category, label, planned_amount, actual_amount, project_vendor_id, created_at) values
  ('1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'venue', 'Venue', 16000, 16000, 'b0000000-d300-4000-8000-000000000200', now()),
  ('1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'photo', 'Photo', 4800, 4800, 'b0000000-d300-4000-8000-000000000201', now()),
  ('1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'food', 'Catering', 13000, null, null, now()),
  ('1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'florals', 'Florals', 3500, null, null, now()),
  ('1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'misc', 'Buffer', 3000, null, null, now());

insert into notes (project_id, title, body, created_at, updated_at) values
  ('1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'Guest list kickoff', 'Couple sending family lists this weekend.', now(), now());

insert into wedding_websites (
  project_id, slug, published, template, theme, content, meal_service_style, rsvp_access_mode, created_at, updated_at
) values (
  '1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', null, false, 'garden', 'sage',
  jsonb_build_object(
    'hero', jsonb_build_object('names', 'Mila & Griffin', 'date', 'May 15, 2027', 'tagline', 'Portland', 'showCountdown', true),
    'story', jsonb_build_object('heading', 'Our Story', 'body', 'Trail runs, farmers markets, and a very good dog.', 'visible', true),
    'details', jsonb_build_object('ceremonyVenue', 'Glasshouse Estate', 'ceremonyAddress', 'Portland, OR', 'ceremonyTime', '3:30 PM', 'receptionVenue', 'Glasshouse Estate', 'receptionAddress', 'Portland, OR', 'receptionTime', '5:00 PM', 'visible', true),
    'schedule', jsonb_build_object('items', '[]'::jsonb, 'visible', true),
    'travel', jsonb_build_object('body', '', 'places', '[]'::jsonb, 'visible', false),
    'gallery', jsonb_build_object('visible', false, 'images', '[]'::jsonb),
    'party', jsonb_build_object('visible', false, 'members', '[]'::jsonb),
    'faq', jsonb_build_object('visible', false, 'items', '[]'::jsonb),
    'registry', jsonb_build_object('visible', false),
    'rsvp', jsonb_build_object('visible', true)
  ),
  'none', 'gated', now(), now()
)
on conflict (project_id) do nothing;

insert into calendar_events (account_id, project_id, title, event_kind, starts_at, all_day, created_at) values
  ('a8886e9c-53b7-47d4-a6dc-521bc2b3c363', '1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9',
   'Mila & Griffin — catering intro call', 'call', '2026-08-25 17:00:00+00', false, now());

-- Couple placeholders (bulk seeder skips existing names later via count target)
insert into guests (id, project_id, full_name, party_size, rsvp_status, rsvp_token, created_at) values
  ('b0000000-d300-4000-8000-000000000210', '1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'Mila Rossi', 1, 'attending', encode(extensions.gen_random_bytes(16), 'hex'), now()),
  ('b0000000-d300-4000-8000-000000000211', '1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 'Griffin Hale', 1, 'attending', encode(extensions.gen_random_bytes(16), 'hex'), now())
on conflict (id) do nothing;

insert into guest_members (project_id, guest_id, name, attending, sort_order, member_type, created_at)
select g.project_id, g.id, g.full_name, true, 0, 'adult', now()
from guests g
where g.id in (
  'b0000000-d300-4000-8000-000000000210',
  'b0000000-d300-4000-8000-000000000211'
)
and not exists (select 1 from guest_members m where m.guest_id = g.id);

-- ------------------------------------------------------------
-- 2) Bulk guests — top up each template project to a real headcount
-- ------------------------------------------------------------
create or replace function _demo_top_up_guests(
  p_project_id uuid,
  p_target_people int,
  p_pending_ratio numeric default 0.35
)
returns void
language plpgsql
as $$
declare
  v_have int;
  v_need int;
  v_i int := 0;
  v_party int;
  v_guest_id uuid;
  v_status text;
  v_first text;
  v_last text;
  v_j int;
  v_firsts text[] := array[
    'Ava','Noah','Liam','Emma','Olivia','Ethan','Sophia','Mason','Isabella','Lucas',
    'Mia','Logan','Charlotte','Jackson','Amelia','Aiden','Harper','Sebastian','Evelyn','Mateo',
    'Abigail','Henry','Elizabeth','Owen','Sofia','Wyatt','Camila','Julian','Gianna','Leo',
    'Chloe','Isaac','Penelope','Caleb','Layla','Ryan','Riley','Nathan','Zoey','Hunter',
    'Nora','Christian','Lily','Aaron','Hannah','Landon','Addison','Adrian','Eleanor','Nolan'
  ];
  v_lasts text[] := array[
    'Nguyen','Patel','Garcia','Kim','Chen','Johnson','Williams','Brown','Jones','Miller',
    'Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor',
    'Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark',
    'Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres',
    'Nguyen','Baker','Adams','Nelson','Hill','Ramsey','Campbell','Mitchell','Roberts','Carter'
  ];
begin
  select count(*) into v_have from guest_members where project_id = p_project_id;
  v_need := greatest(0, p_target_people - v_have);
  if v_need = 0 then
    return;
  end if;

  while v_need > 0 loop
    v_i := v_i + 1;
    v_party := 1 + (v_i % 4); -- 1..4
    if v_party > v_need then
      v_party := v_need;
    end if;

    v_first := v_firsts[1 + ((v_i * 7) % array_length(v_firsts, 1))];
    v_last := v_lasts[1 + ((v_i * 11) % array_length(v_lasts, 1))];

    if random() < p_pending_ratio then
      v_status := 'pending';
    elsif random() < 0.08 then
      v_status := 'declined';
    else
      v_status := 'attending';
    end if;

    v_guest_id := gen_random_uuid();

    insert into guests (
      id, project_id, full_name, email, household, party_size, rsvp_status, rsvp_token, created_at
    ) values (
      v_guest_id,
      p_project_id,
      case when v_party = 1 then v_first || ' ' || v_last
           else 'The ' || v_last || ' party' end,
      lower(v_first || '.' || v_last || v_i::text || '@example.com'),
      v_last,
      v_party,
      v_status,
      encode(extensions.gen_random_bytes(16), 'hex'),
      now()
    );

    for v_j in 0..(v_party - 1) loop
      insert into guest_members (
        project_id, guest_id, name, attending, sort_order, member_type, created_at
      ) values (
        p_project_id,
        v_guest_id,
        case
          when v_j = 0 then v_first || ' ' || v_last
          else v_firsts[1 + ((v_i + v_j * 3) % array_length(v_firsts, 1))] || ' ' || v_last
        end,
        (v_status <> 'declined'),
        v_j,
        case when v_j = 3 and v_party = 4 then 'child' else 'adult' end,
        now()
      );
    end loop;

    v_need := v_need - v_party;
  end loop;

  -- Keep wedding_profile guest_estimate aligned to roughly the list size
  update wedding_profile wp
  set guest_estimate = greatest(
    coalesce(wp.guest_estimate, 0),
    (select count(*)::int from guest_members gm where gm.project_id = p_project_id)
  )
  where wp.project_id = p_project_id;
end;
$$;

-- Personal couple (~6 months): ~110 people
select _demo_top_up_guests('a0000000-d300-4000-8000-000000000002', 110, 0.40);

-- Planner: just started — list still growing
select _demo_top_up_guests('e390b41c-3b55-4370-8ca1-857081757bfd', 40, 0.70);

-- Planner: 9 months
select _demo_top_up_guests('1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9', 90, 0.55);

-- Planner: 6 months
select _demo_top_up_guests('b7c32347-722a-4c6d-8ba4-c98cd2eb77e8', 140, 0.35);

-- Planner: month-of — mostly responded
select _demo_top_up_guests('7cb744b2-b207-4e76-b944-691798c8878c', 95, 0.12);

drop function if exists _demo_top_up_guests(uuid, int, numeric);
