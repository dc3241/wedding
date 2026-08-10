-- ============================================================
-- 0075_onboarding_business_no_project.sql
-- ONB-06: business (planner) bootstrap creates account +
-- account_members only — no placeholder project. Personal path
-- unchanged (account + member + one project). already_bootstrapped
-- still gates on account_members only.
-- ============================================================

create or replace function bootstrap_account_and_project(
  p_account_name text,
  p_account_kind text,
  p_project_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_project_id uuid;
  v_kind text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from account_members where user_id = auth.uid()) then
    raise exception 'already_bootstrapped' using errcode = 'P0001';
  end if;

  v_kind := coalesce(nullif(p_account_kind, ''), 'personal');

  insert into accounts (name, kind)
  values (p_account_name, v_kind)
  returning id into v_account_id;

  insert into account_members (account_id, user_id, role)
  values (v_account_id, auth.uid(), 'owner');

  if v_kind = 'business' then
    return null;
  end if;

  insert into projects (account_id, name)
  values (v_account_id, p_project_name)
  returning id into v_project_id;

  return v_project_id;
end;
$$;
