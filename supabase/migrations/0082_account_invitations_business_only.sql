-- ============================================================
-- 0082_account_invitations_business_only.sql
-- TEAM-01 follow-on: seats are business-account only.
-- Tightens invitation INSERT RLS + accept_account_invitation so a
-- personal account cannot gain seats via PostgREST or the RPC —
-- same posture as WHITE-01's accounts_white_label_business_only CHECK.
-- ============================================================

-- 1) INSERT: membership gate + target must be business.
drop policy if exists "account members insert account invitations"
  on account_invitations;

create policy "account members insert account invitations"
  on account_invitations for insert
  to authenticated
  with check (
    is_account_member(account_id)
    and exists (
      select 1 from accounts a
      where a.id = account_id
        and a.kind = 'business'
    )
  );

-- 2) Accept: self-defending kind check (DEFINER — do not trust the action).
create or replace function accept_account_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_inv account_invitations%rowtype;
  v_hash text;
  v_kind text;
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

  select a.kind into v_kind from accounts a where a.id = v_inv.account_id;
  if v_kind is distinct from 'business' then
    raise exception 'invitation_not_business' using errcode = 'P0001';
  end if;

  -- role defaults to 'owner' (vestigial; unused for auth — see 0081 header).
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
