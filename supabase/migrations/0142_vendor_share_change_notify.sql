-- ============================================================
-- 0142_vendor_share_change_notify.sql
-- VND-SHARE-04: email when shared details change.
-- Hash is the get_project_vendor_share payload minus confirmed_at
-- (vendor's own confirm must not notify them).
-- Only vendors who already have the link (share_sent_at or claim).
-- Cron stamps the first hash with no email.
-- ============================================================

alter table project_vendors
  add column if not exists share_snapshot_hash text;

alter table project_vendors
  add column if not exists share_change_notified_at timestamptz;

create or replace function vendor_share_snapshot_hash(p_token text)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  r record;
begin
  if nullif(btrim(coalesce(p_token, '')), '') is null then
    return null;
  end if;

  select * into r from get_project_vendor_share(p_token);
  if r.share_found is not true then
    return null;
  end if;

  return md5(
    jsonb_build_object(
      'wedding_name', r.wedding_name,
      'wedding_date', r.wedding_date,
      'location', r.location,
      'arrival_time', r.arrival_time,
      'scope_note', r.scope_note,
      'quoted_price', r.quoted_price,
      'venues', coalesce(r.venues, '[]'::jsonb),
      'contacts', coalesce(r.contacts, '[]'::jsonb),
      'timeline', coalesce(r.timeline, '[]'::jsonb),
      'payments', coalesce(r.payments, '[]'::jsonb)
    )::text
  );
end;
$$;

revoke all on function vendor_share_snapshot_hash(text) from public;
revoke all on function vendor_share_snapshot_hash(text) from anon;
revoke all on function vendor_share_snapshot_hash(text) from authenticated;
grant execute on function vendor_share_snapshot_hash(text) to service_role;

create or replace function list_vendor_share_change_jobs()
returns table (
  project_vendor_id uuid,
  confirm_token     text,
  vendor_name       text,
  vendor_email      text,
  wedding_name      text,
  current_hash      text,
  stored_hash       text,
  last_notified_at  timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return query
  select
    pv.id,
    pv.confirm_token,
    v.name,
    coalesce(
      nullif(btrim(v.contact_email), ''),
      u.email::text
    ),
    p.name,
    vendor_share_snapshot_hash(pv.confirm_token),
    pv.share_snapshot_hash,
    pv.share_change_notified_at
  from project_vendors pv
  join vendors v on v.id = pv.vendor_id
  join projects p on p.id = pv.project_id
  join accounts a on a.id = p.account_id
  left join auth.users u on u.id = pv.claimed_user_id
  where p.archived_at is null
    and a.is_demo is not true
    and pv.status is distinct from 'declined'
    and (
      pv.share_sent_at is not null
      or pv.claimed_user_id is not null
    )
    and vendor_share_snapshot_hash(pv.confirm_token)
      is distinct from pv.share_snapshot_hash;
end;
$$;

revoke all on function list_vendor_share_change_jobs() from public;
revoke all on function list_vendor_share_change_jobs() from anon;
revoke all on function list_vendor_share_change_jobs() from authenticated;
grant execute on function list_vendor_share_change_jobs() to service_role;
