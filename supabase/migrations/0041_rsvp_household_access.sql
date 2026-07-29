-- ============================================================
-- 0041_rsvp_household_access.sql
-- RSVP-01: guest-gated RSVP (QR token + last-name lookup).
-- Anon surface #6: lookup_rsvp_household (token/label/cap only).
-- Extends submit_rsvp with trailing p_household_token.
-- NO anon SELECT on guests. Pointer-only matched_guest_id on gated submit.
-- Uses full_name (not name) — guests column from 0006.
-- ============================================================

-- Per-household QR token. Member-readable via existing can_access_project SELECT.
-- NO anon policy — lookup_rsvp_household is the only anon path that reads it.
alter table guests add column if not exists rsvp_token text;

-- Bare gen_random_bytes mirrors 0028's bare digest under search_path including extensions.
do $$
begin
  perform set_config('search_path', 'public, extensions', true);
  update guests
  set rsvp_token = encode(gen_random_bytes(16), 'hex')
  where rsvp_token is null;
end $$;

-- Column DEFAULT cannot rely on a function search_path; qualify extensions.
alter table guests
  alter column rsvp_token set default encode(extensions.gen_random_bytes(16), 'hex');

alter table guests alter column rsvp_token set not null;

create unique index if not exists guests_rsvp_token_key on guests (rsvp_token);

-- Access mode rides the existing published anon read (surface #1).
alter table wedding_websites
  add column if not exists rsvp_access_mode text not null default 'open';

alter table wedding_websites
  drop constraint if exists wedding_websites_rsvp_access_mode_check;

alter table wedding_websites
  add constraint wedding_websites_rsvp_access_mode_check
  check (rsvp_access_mode in ('open', 'gated'));

-- Anon surface #6: minimal household lookup. Returns ONLY {token, label, cap}.
create or replace function lookup_rsvp_household(
  p_slug text,
  p_token text default null,
  p_last_name text default null
)
returns table (
  household_token text,
  party_label text,
  party_size int
)
language sql
security definer
set search_path = public, extensions
as $$
  with site as (
    select project_id
    from wedding_websites
    where slug = p_slug
      and published = true
    limit 1
  )
  select
    g.rsvp_token,
    g.full_name,
    g.party_size
  from guests g
  join site s on s.project_id = g.project_id
  where case
    when nullif(btrim(coalesce(p_token, '')), '') is not null
      then g.rsvp_token = btrim(p_token)
    when length(btrim(coalesce(p_last_name, ''))) >= 2
      then lower(btrim(p_last_name)) = any (
        string_to_array(
          lower(regexp_replace(g.full_name, '[^a-zA-Z0-9 ]', ' ', 'g')),
          ' '
        )
      )
    else false
  end
  order by g.full_name
  limit 25;
$$;

revoke execute on function lookup_rsvp_household(text, text, text) from public;
grant execute on function lookup_rsvp_household(text, text, text) to anon, authenticated;

-- Drop old submit_rsvp signature (adding a param creates a new overload otherwise).
drop function if exists submit_rsvp(text, text, text, text, text, integer, jsonb);

create or replace function submit_rsvp(
  p_slug text,
  p_name text,
  p_response text,
  p_email text,
  p_message text,
  p_party_size int,
  p_attendees jsonb,
  p_household_token text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_project_id uuid;
  v_published boolean;
  v_style text;
  v_access_mode text;
  v_option_count int;
  v_plated boolean;
  v_submission_id uuid;
  v_party_size int;
  v_attendees jsonb;
  v_elem jsonb;
  v_ord int;
  v_att_name text;
  v_meal_raw text;
  v_meal_id uuid;
  v_dietary text;
  v_matched_guest_id uuid;
begin
  select
    w.project_id,
    w.published,
    coalesce(w.meal_service_style, 'none'),
    coalesce(w.rsvp_access_mode, 'open')
  into v_project_id, v_published, v_style, v_access_mode
  from wedding_websites w
  where w.slug = p_slug;

  if not found or v_published is distinct from true then
    raise exception 'rsvp_unavailable' using errcode = 'P0001';
  end if;

  v_matched_guest_id := null;

  if v_access_mode = 'gated' then
    if nullif(btrim(coalesce(p_household_token, '')), '') is null then
      raise exception 'household_required' using errcode = 'P0001';
    end if;

    select g.id
      into v_matched_guest_id
    from guests g
    where g.project_id = v_project_id
      and g.rsvp_token = btrim(p_household_token);

    if v_matched_guest_id is null then
      raise exception 'household_invalid' using errcode = 'P0001';
    end if;
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  if p_response is distinct from 'yes' and p_response is distinct from 'no' then
    raise exception 'invalid_response' using errcode = 'P0001';
  end if;

  select count(*)::int into v_option_count
  from meal_options
  where project_id = v_project_id;

  v_plated := (v_style = 'plated' and v_option_count > 0);

  if p_attendees is null or jsonb_typeof(p_attendees) is distinct from 'array' then
    v_attendees := '[]'::jsonb;
  else
    v_attendees := p_attendees;
  end if;

  -- Decline: one submission row, zero attendees.
  if p_response = 'no' then
    insert into rsvp_submissions (
      project_id, name, response, party_size, email, message, matched_guest_id
    ) values (
      v_project_id,
      trim(p_name),
      'no',
      1,
      nullif(trim(coalesce(p_email, '')), ''),
      nullif(trim(coalesce(p_message, '')), ''),
      v_matched_guest_id
    )
    returning id into v_submission_id;

    return v_submission_id;
  end if;

  -- Accepting.
  if v_plated then
    if jsonb_array_length(v_attendees) < 1 then
      raise exception 'attendees_required' using errcode = 'P0001';
    end if;

    for v_elem in select value from jsonb_array_elements(v_attendees)
    loop
      v_att_name := nullif(trim(coalesce(v_elem->>'name', '')), '');
      if v_att_name is null then
        raise exception 'attendee_name_required' using errcode = 'P0001';
      end if;

      v_meal_raw := nullif(trim(coalesce(v_elem->>'meal_option_id', '')), '');
      if v_meal_raw is null then
        raise exception 'meal_option_required' using errcode = 'P0001';
      end if;
    end loop;

    -- Derive headcount from attendee rows — ignore p_party_size.
    v_party_size := jsonb_array_length(v_attendees);
  else
    v_party_size := greatest(1, least(20, coalesce(p_party_size, 1)));
  end if;

  insert into rsvp_submissions (
    project_id, name, response, party_size, email, message, matched_guest_id
  ) values (
    v_project_id,
    trim(p_name),
    'yes',
    v_party_size,
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_message, '')), ''),
    v_matched_guest_id
  )
  returning id into v_submission_id;

  for v_elem, v_ord in
    select value, ordinality::int
    from jsonb_array_elements(v_attendees) with ordinality
  loop
    v_att_name := nullif(trim(coalesce(v_elem->>'name', '')), '');
    v_dietary := nullif(trim(coalesce(v_elem->>'dietary_note', '')), '');

    if v_plated then
      v_meal_id := (nullif(trim(coalesce(v_elem->>'meal_option_id', '')), ''))::uuid;
    else
      -- No menu on offer (or plated misconfig) — never persist a client meal id.
      v_meal_id := null;
      if v_att_name is null and v_dietary is null then
        continue;
      end if;
    end if;

    insert into rsvp_attendees (
      project_id,
      submission_id,
      meal_option_id,
      name,
      dietary_note,
      sort_order
    ) values (
      v_project_id,
      v_submission_id,
      v_meal_id,
      v_att_name,
      v_dietary,
      v_ord - 1
    );
  end loop;

  return v_submission_id;
end;
$$;

revoke all on function submit_rsvp(text, text, text, text, text, int, jsonb, text) from public;
grant execute on function submit_rsvp(text, text, text, text, text, int, jsonb, text) to anon, authenticated;
