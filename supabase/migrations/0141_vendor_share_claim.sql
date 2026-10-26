-- ============================================================
-- 0141_vendor_share_claim.sql
-- VND-SHARE-03: optional login to remember a vendor involvement.
-- Not a fourth account class. No project_members (would leak via
-- can_access_project). Claimed users stay off CoupleShell.
-- Token page remains the working surface; /vendor-home is the list.
-- ============================================================

alter table project_vendors
  add column if not exists claimed_user_id uuid references auth.users (id) on delete set null;

create index if not exists project_vendors_claimed_user_idx
  on project_vendors (claimed_user_id)
  where claimed_user_id is not null;

-- Editors have UPDATE on project_vendors. Lock this column unless the
-- claim RPC sets wedding.allow_vendor_claim for the transaction.
create or replace function guard_project_vendors_claimed_user()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and new.claimed_user_id is distinct from old.claimed_user_id
     and current_setting('wedding.allow_vendor_claim', true) is distinct from '1'
  then
    raise exception 'claimed_user_id_locked' using errcode = '42501';
  end if;
  if tg_op = 'INSERT'
     and new.claimed_user_id is not null
     and current_setting('wedding.allow_vendor_claim', true) is distinct from '1'
  then
    raise exception 'claimed_user_id_locked' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_project_vendors_claimed_user on project_vendors;
create trigger guard_project_vendors_claimed_user
  before insert or update on project_vendors
  for each row
  execute function guard_project_vendors_claimed_user();

-- ---------- claim ----------
create or replace function claim_vendor_share(p_token text)
returns table (
  claimed    boolean,
  error_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_pv_id uuid;
  v_claimed uuid;
begin
  claimed := false;
  error_code := null;
  v_uid := auth.uid();

  if v_uid is null then
    error_code := 'not_authenticated';
    return next;
    return;
  end if;

  if exists (
    select 1 from account_members am where am.user_id = v_uid
  ) then
    error_code := 'has_account';
    return next;
    return;
  end if;

  if nullif(btrim(coalesce(p_token, '')), '') is null then
    error_code := 'invalid_token';
    return next;
    return;
  end if;

  select pv.id, pv.claimed_user_id
    into v_pv_id, v_claimed
  from project_vendors pv
  where pv.confirm_token = btrim(p_token);

  if v_pv_id is null then
    error_code := 'invalid_token';
    return next;
    return;
  end if;

  if v_claimed is not null and v_claimed <> v_uid then
    error_code := 'claimed';
    return next;
    return;
  end if;

  if v_claimed is null then
    perform set_config('wedding.allow_vendor_claim', '1', true);
    update project_vendors
    set claimed_user_id = v_uid
    where id = v_pv_id;
  end if;

  claimed := true;
  return next;
end;
$$;

revoke all on function claim_vendor_share(text) from public;
revoke all on function claim_vendor_share(text) from anon;
grant execute on function claim_vendor_share(text) to authenticated;

-- ---------- status (logged-in token page) ----------
create or replace function vendor_share_claim_status(p_token text)
returns table (
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_claimed uuid;
begin
  v_uid := auth.uid();

  if nullif(btrim(coalesce(p_token, '')), '') is null then
    status := 'invalid';
    return next;
    return;
  end if;

  select pv.claimed_user_id into v_claimed
  from project_vendors pv
  where pv.confirm_token = btrim(p_token);

  if not found then
    status := 'invalid';
    return next;
    return;
  end if;

  if v_claimed is null then
    status := 'unclaimed';
  elsif v_uid is not null and v_claimed = v_uid then
    status := 'mine';
  else
    status := 'other';
  end if;
  return next;
end;
$$;

revoke all on function vendor_share_claim_status(text) from public;
revoke all on function vendor_share_claim_status(text) from anon;
grant execute on function vendor_share_claim_status(text) to authenticated;

-- ---------- list (portal) ----------
create or replace function list_claimed_vendor_shares()
returns table (
  project_vendor_id uuid,
  confirm_token     text,
  vendor_name       text,
  vendor_category   text,
  wedding_name      text,
  wedding_date      date,
  unread_count      int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return;
  end if;

  return query
  select
    pv.id,
    pv.confirm_token,
    v.name,
    v.category,
    p.name,
    p.wedding_date,
    (
      select count(*)::int
      from vendor_share_messages m
      where m.project_vendor_id = pv.id
        and m.author = 'owner'
        and (
          pv.share_vendor_last_read_at is null
          or m.created_at > pv.share_vendor_last_read_at
        )
    )
  from project_vendors pv
  join vendors v on v.id = pv.vendor_id
  join projects p on p.id = pv.project_id
  where pv.claimed_user_id = v_uid
  order by p.wedding_date nulls last, p.name;
end;
$$;

revoke all on function list_claimed_vendor_shares() from public;
revoke all on function list_claimed_vendor_shares() from anon;
grant execute on function list_claimed_vendor_shares() to authenticated;
