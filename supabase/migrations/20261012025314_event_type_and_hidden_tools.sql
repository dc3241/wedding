-- Event type for planner/venue projects and leads.
-- Existing rows stay weddings. hidden_tools turns off workspace tabs
-- (website, seating) without changing those features.

alter table public.projects
  add column event_type text not null default 'wedding'
    constraint projects_event_type_check check (event_type in ('wedding', 'event')),
  add column hidden_tools text[] not null default '{}'
    constraint projects_hidden_tools_known
      check (hidden_tools <@ array['website', 'seating']::text[]);

alter table public.leads
  add column event_type text not null default 'wedding'
    constraint leads_event_type_check check (event_type in ('wedding', 'event'));

drop function if exists public.submit_inquiry(text, text, text, text, text, date, int);

create or replace function public.submit_inquiry(
  p_slug text,
  p_name text,
  p_email text,
  p_message text,
  p_honeypot text default null,
  p_wedding_date date default null,
  p_guest_count int default null,
  p_event_type text default 'wedding'
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  c_throttle_window constant interval := interval '1 minute';
  c_throttle_max constant int := 3;

  v_account_id uuid;
  v_ip_raw text;
  v_ip_hash text;
  v_recent_count int;
  v_notes text;
  v_position int;
  v_lead_id uuid;
  v_event_type text;
begin
  if nullif(btrim(coalesce(p_honeypot, '')), '') is not null then
    raise exception 'inquiry_rejected' using errcode = 'P0001';
  end if;

  select a.id
    into v_account_id
  from accounts a
  where a.inquiry_slug = btrim(coalesce(p_slug, ''))
    and a.kind = 'business';

  if v_account_id is null then
    raise exception 'inquiry_unknown' using errcode = 'P0001';
  end if;

  if p_name is null or length(btrim(p_name)) = 0 then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  if p_email is null or length(btrim(p_email)) = 0 then
    raise exception 'email_required' using errcode = 'P0001';
  end if;

  if p_guest_count is not null and (p_guest_count < 1 or p_guest_count > 20000) then
    raise exception 'guest_count_invalid' using errcode = 'P0001';
  end if;

  v_event_type := case
    when p_event_type = 'event' then 'event'
    else 'wedding'
  end;

  v_ip_raw := nullif(
    btrim(
      split_part(
        coalesce(
          current_setting('request.headers', true)::json->>'x-forwarded-for',
          ''
        ),
        ',',
        1
      )
    ),
    ''
  );
  v_ip_hash := encode(
    digest('inquiry-form:' || lower(coalesce(v_ip_raw, 'unknown')), 'sha256'),
    'hex'
  );

  select count(*)::int
    into v_recent_count
  from inquiry_form_attempts a
  where a.ip_hash = v_ip_hash
    and a.account_id = v_account_id
    and a.created_at >= now() - c_throttle_window;

  if v_recent_count >= c_throttle_max then
    raise exception 'inquiry_throttled' using errcode = 'P0001';
  end if;

  insert into inquiry_form_attempts (account_id, ip_hash)
  values (v_account_id, v_ip_hash);

  delete from inquiry_form_attempts
  where created_at < now() - interval '48 hours';

  v_notes := nullif(btrim(coalesce(p_message, '')), '');
  if p_guest_count is not null then
    v_notes := 'Approximate guest count: ' || p_guest_count::text
      || case
        when v_notes is null then ''
        else E'\n\n' || v_notes
      end;
  end if;

  select coalesce(max(l.position), 0) + 1
    into v_position
  from leads l
  where l.account_id = v_account_id;

  insert into leads (
    account_id,
    couple_name,
    contact_email,
    wedding_date,
    estimated_guest_count,
    source,
    stage,
    notes,
    position,
    event_type
  )
  values (
    v_account_id,
    btrim(p_name),
    btrim(p_email),
    p_wedding_date,
    p_guest_count,
    'form',
    'inquiry',
    v_notes,
    v_position,
    v_event_type
  )
  returning id into v_lead_id;

  return v_lead_id;
end;
$$;

revoke all on function public.submit_inquiry(text, text, text, text, text, date, int, text) from public;
grant execute on function public.submit_inquiry(text, text, text, text, text, date, int, text) to anon, authenticated;

comment on column public.projects.event_type is 'Wedding or other event.';
comment on column public.projects.hidden_tools is 'Workspace tabs turned off: website, seating.';
comment on column public.leads.event_type is 'Wedding or other event.';
