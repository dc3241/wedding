-- ============================================================
-- 0028_project_invitations.sql
-- Planner invites a couple to ONE project (not the whole book).
-- Raw token is never stored — only sha256 hex in token_hash.
-- Accept inserts project_members only (never accounts /
-- account_members); bootstrap_account_and_project stays the
-- sole writer there so 0027's already_bootstrapped guard holds.
-- Also adds the missing DELETE policy on project_members so
-- account owners can revoke a couple's access without a silent
-- no-op.
-- ============================================================

create table project_invitations (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  email        text not null,
  role         project_role not null default 'couple',
  token_hash   text not null unique,
  invited_by   uuid not null,
  expires_at   timestamptz not null,
  accepted_at  timestamptz,
  accepted_by  uuid,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index project_invitations_project_id_idx
  on project_invitations (project_id);

-- One live invitation per email per project.
create unique index project_invitations_one_live_per_email
  on project_invitations (project_id, lower(email))
  where accepted_at is null and revoked_at is null;

-- Only the owning account issues / revokes / lists invitations.
create or replace function can_manage_project_access(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from projects p
    where p.id = p_project_id
      and is_account_member(p.account_id)
  );
$$;

grant execute on function can_manage_project_access(uuid) to authenticated;

alter table project_invitations enable row level security;

create policy "account members select project invitations"
  on project_invitations for select
  to authenticated
  using (can_manage_project_access(project_id));

create policy "account members insert project invitations"
  on project_invitations for insert
  to authenticated
  with check (can_manage_project_access(project_id));

create policy "account members update project invitations"
  on project_invitations for update
  to authenticated
  using (can_manage_project_access(project_id))
  with check (can_manage_project_access(project_id));

create policy "account members delete project invitations"
  on project_invitations for delete
  to authenticated
  using (can_manage_project_access(project_id));

-- Owning account can remove a project member (e.g. revoke couple access).
-- No insert/update policies — accept_project_invitation is the only writer.
create policy "account members remove project members"
  on project_members for delete
  to authenticated
  using (can_manage_project_access(project_id));

-- Accept an invitation by raw token. Email must match auth.email().
-- pgcrypto (digest) lives in extensions.
create or replace function accept_project_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_inv project_invitations%rowtype;
  v_hash text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  select * into v_inv from project_invitations where token_hash = v_hash;
  if not found then
    raise exception 'invalid_invitation' using errcode = 'P0001';
  end if;

  if lower(v_inv.email) is distinct from lower(auth.email()) then
    raise exception 'invitation_email_mismatch' using errcode = 'P0001';
  end if;

  if v_inv.accepted_at is not null then
    if v_inv.accepted_by = auth.uid() then
      return v_inv.project_id;              -- idempotent re-run
    end if;
    raise exception 'invitation_already_accepted' using errcode = 'P0001';
  end if;

  if v_inv.revoked_at is not null then
    raise exception 'invitation_revoked' using errcode = 'P0001';
  end if;

  if v_inv.expires_at <= now() then
    raise exception 'invitation_expired' using errcode = 'P0001';
  end if;

  insert into project_members (project_id, user_id, role)
  values (v_inv.project_id, auth.uid(), v_inv.role)
  on conflict (project_id, user_id) do nothing;

  update project_invitations
     set accepted_at = now(), accepted_by = auth.uid()
   where id = v_inv.id;

  return v_inv.project_id;
end;
$$;

grant execute on function accept_project_invitation(text) to authenticated;
