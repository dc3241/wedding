-- ============================================================
-- 0039_rsvp_attendees.sql
-- Per-person RSVP grain + atomic submit_rsvp RPC (MEAL-02).
-- Drops rsvp_anon_insert; anon writes only via submit_rsvp execute.
-- rsvp_attendees: NO anon policy, NO INSERT policy (definer RPC only).
-- Anon table surfaces stay at 5. Composite FKs mirror 0026.
-- ============================================================

-- Composite FK targets (redundant with PK(id); required for same-project FKs).
create unique index if not exists rsvp_submissions_project_id_key
  on rsvp_submissions (project_id, id);

create unique index if not exists meal_options_project_id_key
  on meal_options (project_id, id);

create table if not exists rsvp_attendees (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null,
  submission_id   uuid not null,
  meal_option_id  uuid,
  name            text,
  dietary_note    text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),

  foreign key (project_id, submission_id)
    references rsvp_submissions (project_id, id)
    on delete cascade,

  -- Column-specific SET NULL (PG >= 15): null only meal_option_id on option
  -- delete; do not touch NOT NULL project_id. MATCH SIMPLE: null meal_option_id
  -- skips the check (empty meal is legal).
  foreign key (project_id, meal_option_id)
    references meal_options (project_id, id)
    on delete set null (meal_option_id)
);

create index if not exists rsvp_attendees_submission_id_idx
  on rsvp_attendees (submission_id);

alter table rsvp_attendees enable row level security;

grant select, update, delete on rsvp_attendees to authenticated;

-- READ: any project member. Direct on project_id (composite FK keeps it honest).
drop policy if exists "members read rsvp attendees" on rsvp_attendees;
create policy "members read rsvp attendees" on rsvp_attendees
  for select to authenticated
  using (can_access_project(project_id));

-- WRITE corrections: editors only. No INSERT policy — only submit_rsvp writes.
drop policy if exists "editors update rsvp attendees" on rsvp_attendees;
create policy "editors update rsvp attendees" on rsvp_attendees
  for update to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));

drop policy if exists "editors delete rsvp attendees" on rsvp_attendees;
create policy "editors delete rsvp attendees" on rsvp_attendees
  for delete to authenticated
  using (can_edit_project(project_id));

-- Anon no longer inserts rsvp_submissions directly — only via submit_rsvp.
drop policy if exists "rsvp_anon_insert" on rsvp_submissions;
revoke insert on rsvp_submissions from anon;

-- Atomic RSVP intake. Resolves project from slug; never trusts a client project id.
create or replace function submit_rsvp(
  p_slug text,
  p_name text,
  p_response text,
  p_email text,
  p_message text,
  p_party_size int,
  p_attendees jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_published boolean;
  v_style text;
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
begin
  select w.project_id, w.published, coalesce(w.meal_service_style, 'none')
    into v_project_id, v_published, v_style
  from wedding_websites w
  where w.slug = p_slug;

  if not found or v_published is distinct from true then
    raise exception 'rsvp_unavailable' using errcode = 'P0001';
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
      project_id, name, response, party_size, email, message
    ) values (
      v_project_id,
      trim(p_name),
      'no',
      1,
      nullif(trim(coalesce(p_email, '')), ''),
      nullif(trim(coalesce(p_message, '')), '')
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
    project_id, name, response, party_size, email, message
  ) values (
    v_project_id,
    trim(p_name),
    'yes',
    v_party_size,
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_message, '')), '')
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

revoke all on function submit_rsvp(text, text, text, text, text, int, jsonb) from public;
grant execute on function submit_rsvp(text, text, text, text, text, int, jsonb) to anon, authenticated;
