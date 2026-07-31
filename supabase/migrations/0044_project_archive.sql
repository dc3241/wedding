-- ============================================================
-- 0044_project_archive.sql
-- Planners archive finished weddings off the active book.
-- Sole writer: set_project_archived (security definer).
-- Gate: can_manage_project_access (owning account members only).
-- ============================================================

alter table projects
  add column if not exists archived_at timestamptz;

create or replace function set_project_archived(
  p_project_id uuid,
  p_archived   boolean
) returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_archived_at timestamptz;
begin
  if not can_manage_project_access(p_project_id) then
    raise exception 'Not authorized to archive this project.' using errcode = '42501';
  end if;

  update projects
     set archived_at = case
                         when p_archived then coalesce(archived_at, now())
                         else null
                       end
   where id = p_project_id
   returning archived_at into v_archived_at;

  return v_archived_at;
end;
$$;

grant execute on function set_project_archived(uuid, boolean) to authenticated;
revoke execute on function set_project_archived(uuid, boolean) from anon;
