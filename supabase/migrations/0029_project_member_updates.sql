-- ============================================================
-- 0029_project_member_updates.sql
-- Couples (and collaborators) on a planner-run project may UPDATE
-- the project row. Before this, UPDATE gated only on
-- is_account_member — so invited project_members could read but
-- writes (wedding_date, total_budget) were silent no-ops.
-- viewer is excluded. account_id is immutable via trigger.
-- ============================================================

create or replace function can_edit_project(p_project_id uuid)
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
  )
  or exists (
    select 1 from project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and pm.role in ('couple', 'collaborator')
  );
$$;

grant execute on function can_edit_project(uuid) to authenticated;

drop policy if exists "members update projects" on projects;
drop policy if exists "editors update projects" on projects;

create policy "editors update projects"
  on projects for update
  to authenticated
  using (can_edit_project(id))
  with check (can_edit_project(id));

-- RLS with check cannot express column-level immutability. Without
-- this, a project member could rewrite account_id and still pass
-- can_edit_project as a member of the moved row.
create or replace function guard_project_account_id()
returns trigger
language plpgsql
as $$
begin
  if new.account_id is distinct from old.account_id then
    raise exception 'project_account_id_immutable' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists projects_account_id_immutable on projects;
create trigger projects_account_id_immutable
  before update on projects
  for each row
  execute function guard_project_account_id();
