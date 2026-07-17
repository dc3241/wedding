-- ============================================================
-- 0027_bootstrap_idempotency.sql
-- Refuse a second bootstrap for a user who already has any
-- account_members row. Prevents double-submit from creating two
-- personal tenants and stranding the couple on /projects.
-- Does NOT unique-constrain account_members.user_id — a user may
-- hold both personal and business accounts later; the function is
-- the only writer, so the guard lives here.
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
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from account_members where user_id = auth.uid()) then
    raise exception 'already_bootstrapped' using errcode = 'P0001';
  end if;

  insert into accounts (name, kind)
  values (p_account_name, coalesce(nullif(p_account_kind, ''), 'personal'))
  returning id into v_account_id;

  insert into account_members (account_id, user_id, role)
  values (v_account_id, auth.uid(), 'owner');

  insert into projects (account_id, name)
  values (v_account_id, p_project_name)
  returning id into v_project_id;

  return v_project_id;
end;
$$;
