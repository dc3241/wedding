-- ============================================================
-- 0081_account_invitations.sql
-- Account-level seats (TEAM-01): flat membership — any member can
-- invite / revoke / remove. No hierarchy. Mirrors 0028's invitation
-- posture at the account grain via a parallel table + cookie path.
--
-- Note: account_members.role (account_role) predates this slice,
-- defaults to 'owner' on insert, and stays unused for authorization —
-- intentional, not a gap.
-- ============================================================

-- Fellow members can see each other (was self-only).
-- is_account_member is SECURITY DEFINER, so this does not recurse.
drop policy if exists "see own memberships" on account_members;

create policy "members see fellow account members"
  on account_members for select
  to authenticated
  using (is_account_member(account_id));

-- Email resolution for the Team UI. Gate lives in-body: DEFINER
-- bypasses RLS on the auth.users join.
create or replace function list_account_members(p_account_id uuid)
returns table (
  user_id uuid,
  email text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not is_account_member(p_account_id) then
    raise exception 'not_account_member' using errcode = 'P0001';
  end if;

  return query
  select
    am.user_id,
    u.email::text,
    am.created_at
  from account_members am
  join auth.users u on u.id = am.user_id
  where am.account_id = p_account_id
  order by am.created_at asc;
end;
$$;

grant execute on function list_account_members(uuid) to authenticated;

-- ------------------------------------------------------------
-- account_invitations
-- ------------------------------------------------------------

create table account_invitations (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references accounts(id) on delete cascade,
  email        text not null,
  token_hash   text not null unique,
  invited_by   uuid not null references auth.users(id),
  expires_at   timestamptz not null default (now() + interval '14 days'),
  accepted_at  timestamptz,
  accepted_by  uuid references auth.users(id),
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index account_invitations_account_id_idx
  on account_invitations (account_id);

-- One live invitation per email per account.
create unique index account_invitations_one_live_per_email
  on account_invitations (account_id, lower(email))
  where accepted_at is null and revoked_at is null;

alter table account_invitations enable row level security;

-- Flat: any account member can list / issue / revoke / delete.
create policy "account members select account invitations"
  on account_invitations for select
  to authenticated
  using (is_account_member(account_id));

create policy "account members insert account invitations"
  on account_invitations for insert
  to authenticated
  with check (is_account_member(account_id));

create policy "account members update account invitations"
  on account_invitations for update
  to authenticated
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create policy "account members delete account invitations"
  on account_invitations for delete
  to authenticated
  using (is_account_member(account_id));

-- Accept by raw token. Email must match auth.email().
-- pgcrypto (digest) lives in extensions.
create or replace function accept_account_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_inv account_invitations%rowtype;
  v_hash text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  select * into v_inv from account_invitations where token_hash = v_hash;
  if not found then
    raise exception 'invalid_invitation' using errcode = 'P0001';
  end if;

  if lower(v_inv.email) is distinct from lower(auth.email()) then
    raise exception 'invitation_email_mismatch' using errcode = 'P0001';
  end if;

  if v_inv.accepted_at is not null then
    if v_inv.accepted_by = auth.uid() then
      return v_inv.account_id;              -- idempotent re-run
    end if;
    raise exception 'invitation_already_accepted' using errcode = 'P0001';
  end if;

  if v_inv.revoked_at is not null then
    raise exception 'invitation_revoked' using errcode = 'P0001';
  end if;

  if v_inv.expires_at <= now() then
    raise exception 'invitation_expired' using errcode = 'P0001';
  end if;

  -- role defaults to 'owner' (vestigial; unused for auth — see header note).
  insert into account_members (account_id, user_id)
  values (v_inv.account_id, auth.uid())
  on conflict (account_id, user_id) do nothing;

  update account_invitations
     set accepted_at = now(), accepted_by = auth.uid()
   where id = v_inv.id;

  return v_inv.account_id;
end;
$$;

grant execute on function accept_account_invitation(text) to authenticated;

-- Flat remove: any member may remove any member (including self).
-- Structural guard: refuse leaving the account with zero members.
create or replace function remove_account_member(
  p_account_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if not is_account_member(p_account_id) then
    raise exception 'not_account_member' using errcode = 'P0001';
  end if;

  select count(*)::integer into v_count
  from account_members
  where account_id = p_account_id;

  if v_count <= 1 then
    raise exception 'cannot_remove_last_member' using errcode = 'P0001';
  end if;

  delete from account_members
  where account_id = p_account_id
    and user_id = p_user_id;

  if not found then
    raise exception 'member_not_found' using errcode = 'P0001';
  end if;
end;
$$;

grant execute on function remove_account_member(uuid, uuid) to authenticated;
