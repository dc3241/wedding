-- ============================================================
-- 0003_write_access.sql
-- The read policies in 0001 don't let a user CREATE their first account,
-- membership, or project (RLS denies any write with no matching policy).
-- This migration adds the write paths the app needs, without ever using
-- the service-role key in app code.
-- Apply AFTER 0001 and 0002.
-- ============================================================

-- Helper: is the current user a member of this account?
-- SECURITY DEFINER avoids RLS recursion when called inside policies.
create or replace function is_account_member(p_account_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from account_members am
    where am.account_id = p_account_id and am.user_id = auth.uid()
  );
$$;

-- Members of an account can create and update projects in it
-- (covers a planner's "New wedding" button and renaming / setting the date).
create policy "members create projects"
  on projects for insert
  with check (is_account_member(account_id));

create policy "members update projects"
  on projects for update
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- Atomic onboarding: create an account, add the caller as owner, create the
-- first project. SECURITY DEFINER performs the inserts RLS would otherwise block
-- (the chicken-and-egg of your very first account), but the logic is fixed and
-- always acts only for the calling user (auth.uid()). Returns the new project id.
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

-- Let logged-in users call the function and helpers from the app.
grant execute on function bootstrap_account_and_project(text, text, text) to authenticated;
grant execute on function is_account_member(uuid) to authenticated;
grant execute on function can_access_project(uuid) to authenticated;