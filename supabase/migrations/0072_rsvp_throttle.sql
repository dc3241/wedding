-- ============================================================
-- 0072_rsvp_throttle.sql
-- RSVP-THROTTLE-01: real rate limit inside submit_rsvp.
-- Counts recent rows for the token-resolved matched_guest_id
-- (SECURITY DEFINER can see them; anon SELECT cannot). Threshold
-- lives only here — not duplicated client-side. Additive: gated
-- token + honeypot + 0058 badge auto-populate unchanged.
-- Idempotent: create or replace.
-- ============================================================

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
  -- Velocity cap per household (matched_guest_id). Corrections OK;
  -- rapid-fire spam is not. Single source of truth — do not mirror
  -- these in the app.
  c_throttle_window constant interval := interval '1 minute';
  c_throttle_max constant int := 3;

  v_project_id uuid;
  v_published boolean;
  v_style text;
  v_songs_enabled boolean;
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
  v_song text;
  v_matched_guest_id uuid;
  v_recent_count int;
begin
  select
    w.project_id,
    w.published,
    coalesce(w.meal_service_style, 'none'),
    coalesce(w.song_requests_enabled, false)
  into v_project_id, v_published, v_style, v_songs_enabled
  from wedding_websites w
  where w.slug = p_slug;

  if not found or v_published is distinct from true then
    raise exception 'rsvp_unavailable' using errcode = 'P0001';
  end if;

  -- Always gated: every submission must be household-token-bound.
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

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  if p_response is distinct from 'yes' and p_response is distinct from 'no' then
    raise exception 'invalid_response' using errcode = 'P0001';
  end if;

  -- RSVP-THROTTLE-01: before badge write or insert — rejected attempts
  -- must not mutate guests.rsvp_status or create a submission row.
  select count(*)::int
    into v_recent_count
  from rsvp_submissions s
  where s.matched_guest_id = v_matched_guest_id
    and s.created_at >= now() - c_throttle_window;

  if v_recent_count >= c_throttle_max then
    raise exception 'rsvp_throttled' using errcode = 'P0001';
  end if;

  -- GST-09: write household badge to the token-resolved guest.
  -- Same transaction as the submission insert. Latest submit wins.
  update guests
  set rsvp_status = case
    when p_response = 'yes' then 'attending'
    else 'declined'
  end
  where id = v_matched_guest_id;

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
    -- Server is source of truth: ignore client song text when toggle is off.
    if v_songs_enabled then
      v_song := nullif(trim(coalesce(v_elem->>'song_request', '')), '');
    else
      v_song := null;
    end if;

    if v_plated then
      v_meal_id := (nullif(trim(coalesce(v_elem->>'meal_option_id', '')), ''))::uuid;
    else
      -- No menu on offer (or plated misconfig) — never persist a client meal id.
      v_meal_id := null;
      if v_att_name is null and v_dietary is null and v_song is null then
        continue;
      end if;
    end if;

    insert into rsvp_attendees (
      project_id,
      submission_id,
      meal_option_id,
      name,
      dietary_note,
      song_request,
      sort_order
    ) values (
      v_project_id,
      v_submission_id,
      v_meal_id,
      v_att_name,
      v_dietary,
      v_song,
      v_ord - 1
    );
  end loop;

  return v_submission_id;
end;
$$;

revoke all on function submit_rsvp(text, text, text, text, text, int, jsonb, text) from public;
grant execute on function submit_rsvp(text, text, text, text, text, int, jsonb, text) to anon, authenticated;
