-- ============================================================
-- 0090_inquiry_reply.sql
-- AUTO-03b: send path for lead recipients + guest-count column
-- extraction can write. No LLM tables.
--
-- outreach_messages was vendor-only (project_vendor_id NOT NULL).
-- Smallest generalization: nullable vendor FK + nullable lead_id,
-- exactly one set. RLS: vendor rows stay project-scoped; lead rows
-- use is_account_member (CRM, same as agent_drafts / leads).
--
-- leads.estimated_guest_count: 03a had no guest-count column (count
-- lived in notes for the form path). Extraction needs a real field
-- the same way wedding_date already exists.
-- ============================================================

alter table leads
  add column if not exists estimated_guest_count integer;

alter table leads drop constraint if exists leads_estimated_guest_count_check;
alter table leads add constraint leads_estimated_guest_count_check
  check (
    estimated_guest_count is null
    or (estimated_guest_count >= 1 and estimated_guest_count <= 20000)
  );

alter table outreach_messages
  alter column project_vendor_id drop not null;

alter table outreach_messages
  add column if not exists lead_id uuid references leads (id) on delete cascade;

alter table outreach_messages drop constraint if exists outreach_messages_target_xor;
alter table outreach_messages add constraint outreach_messages_target_xor
  check (
    (project_vendor_id is not null and lead_id is null)
    or (project_vendor_id is null and lead_id is not null)
  );

create index if not exists outreach_messages_lead_created_idx
  on outreach_messages (lead_id, created_at)
  where lead_id is not null;

drop policy if exists "outreach readable by project members" on outreach_messages;
create policy "outreach readable by project members"
  on outreach_messages for select
  using (
    (
      project_vendor_id is not null
      and can_access_project_vendor(project_vendor_id)
    )
    or (
      lead_id is not null
      and is_account_member((select account_id from leads where id = lead_id))
    )
  );

drop policy if exists "outreach writable by project members" on outreach_messages;
create policy "outreach writable by project members"
  on outreach_messages for all
  using (
    (
      project_vendor_id is not null
      and can_access_project_vendor(project_vendor_id)
    )
    or (
      lead_id is not null
      and is_account_member((select account_id from leads where id = lead_id))
    )
  )
  with check (
    (
      project_vendor_id is not null
      and can_access_project_vendor(project_vendor_id)
    )
    or (
      lead_id is not null
      and is_account_member((select account_id from leads where id = lead_id))
    )
  );

-- Form path: persist guest count on the structured column (03a wrote notes only).
create or replace function submit_inquiry(
  p_slug text,
  p_name text,
  p_email text,
  p_message text,
  p_honeypot text default null,
  p_wedding_date date default null,
  p_guest_count int default null
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
    position
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
    v_position
  )
  returning id into v_lead_id;

  return v_lead_id;
end;
$$;

revoke all on function submit_inquiry(text, text, text, text, text, date, int) from public;
grant execute on function submit_inquiry(text, text, text, text, text, date, int) to anon, authenticated;
