-- ============================================================
-- 0139_vendor_share.sql
-- VND-SHARE-01: standing vendor share page (no account).
-- Reuses project_vendors.confirm_token (AUTO-02) as the read token.
-- Anon surface: get_project_vendor_share(token) — SECURITY DEFINER,
-- token-gated read. Returns a scoped payload only. NO anon SELECT on
-- project_vendors / guests / budget / notes / other vendors' money.
-- Invalid token → share_found = false (invoice posture, not a raise).
--
-- share_sent_at / share_sent_email record the last owner-sent email.
-- They are not an access gate.
-- ============================================================

alter table project_vendors
  add column if not exists share_sent_at timestamptz;

alter table project_vendors
  add column if not exists share_sent_email text;

comment on column project_vendors.confirm_token is
  'Standing token for /vendor-confirm and /vendor share. Not hashed.';

create or replace function get_project_vendor_share(p_token text)
returns table (
  share_found     boolean,
  vendor_name     text,
  vendor_category text,
  wedding_name    text,
  wedding_date    date,
  location        text,
  arrival_time    time,
  scope_note      text,
  confirmed_at    timestamptz,
  quoted_price    numeric,
  venues          jsonb,
  contacts        jsonb,
  timeline        jsonb,
  payments        jsonb
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_pv_id uuid;
  v_project_id uuid;
  v_vendor_id uuid;
  v_account_id uuid;
  v_account_kind text;
  v_account_plan text;
  v_planner_name text;
  v_owner_email text;
  v_couple_email text;
begin
  if nullif(btrim(coalesce(p_token, '')), '') is null then
    share_found := false;
    return next;
    return;
  end if;

  select
    pv.id,
    pv.project_id,
    pv.vendor_id,
    pv.arrival_time,
    pv.scope_note,
    pv.confirmed_at,
    pv.quoted_price,
    v.name,
    v.category,
    p.name,
    p.wedding_date,
    p.account_id,
    a.kind,
    a.plan,
    coalesce(nullif(btrim(a.brand_name), ''), a.name)
  into
    v_pv_id,
    v_project_id,
    v_vendor_id,
    arrival_time,
    scope_note,
    confirmed_at,
    quoted_price,
    vendor_name,
    vendor_category,
    wedding_name,
    wedding_date,
    v_account_id,
    v_account_kind,
    v_account_plan,
    v_planner_name
  from project_vendors pv
  join vendors v on v.id = pv.vendor_id
  join projects p on p.id = pv.project_id
  join accounts a on a.id = p.account_id
  where pv.confirm_token = btrim(p_token);

  if v_pv_id is null then
    share_found := false;
    arrival_time := null;
    scope_note := null;
    confirmed_at := null;
    quoted_price := null;
    vendor_name := null;
    vendor_category := null;
    wedding_name := null;
    wedding_date := null;
    venues := null;
    contacts := null;
    timeline := null;
    payments := null;
    return next;
    return;
  end if;

  select wp.location
    into location
  from wedding_profile wp
  where wp.project_id = v_project_id;

  select u.email::text
    into v_owner_email
  from account_members am
  join auth.users u on u.id = am.user_id
  where am.account_id = v_account_id
  order by am.created_at asc
  limit 1;

  if v_account_kind = 'business' then
    select u.email::text
      into v_couple_email
    from project_members pm
    join auth.users u on u.id = pm.user_id
    where pm.project_id = v_project_id
      and pm.role = 'couple'
    order by pm.created_at asc
    limit 1;

    contacts := jsonb_strip_nulls(
      jsonb_build_array(
        jsonb_build_object(
          'role', 'couple',
          'name', wedding_name,
          'email', v_couple_email
        ),
        jsonb_build_object(
          'role', case when v_account_plan = 'venue' then 'venue' else 'planner' end,
          'name', v_planner_name,
          'email', v_owner_email
        )
      )
    );
  else
    contacts := jsonb_strip_nulls(
      jsonb_build_array(
        jsonb_build_object(
          'role', 'couple',
          'name', wedding_name,
          'email', v_owner_email
        )
      )
    );
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', v2.name,
        'address', v2.address
      )
      order by v2.name
    ),
    '[]'::jsonb
  )
    into venues
  from project_vendors pv2
  join vendors v2 on v2.id = pv2.vendor_id
  where pv2.project_id = v_project_id
    and pv2.status = 'booked'
    and v2.category = 'venue'
    and v2.id is distinct from v_vendor_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'title', te.title,
        'description', te.description,
        'start_time', te.start_time,
        'end_time', te.end_time,
        'section', te.section,
        'owner', te.owner
      )
      order by te.start_time nulls last, te.position, te.created_at
    ),
    '[]'::jsonb
  )
    into timeline
  from timeline_events te
  where te.project_id = v_project_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'label', ps.label,
        'amount', ps.amount,
        'due_on', ps.due_on
      )
      order by ps.due_on, ps.created_at
    ),
    '[]'::jsonb
  )
    into payments
  from payment_schedule ps
  join budget_items bi on bi.id = ps.budget_item_id
  where bi.project_vendor_id = v_pv_id;

  share_found := true;
  return next;
end;
$$;

revoke all on function get_project_vendor_share(text) from public;
grant execute on function get_project_vendor_share(text) to anon, authenticated;
