-- ============================================================
-- 0138_widen_hidden_tools.sql
-- Workspace tab visibility is no longer website/seating only.
-- Overview and Access stay always-on (never stored here).
-- Re-runnable.
-- ============================================================

alter table public.projects drop constraint if exists projects_hidden_tools_known;
alter table public.projects add constraint projects_hidden_tools_known
  check (
    hidden_tools <@ array[
      'calendar',
      'checklist',
      'budget',
      'vendors',
      'guests',
      'website',
      'seating',
      'timeline',
      'contracts',
      'invoices',
      'agreements',
      'notes'
    ]::text[]
  );

comment on column public.projects.hidden_tools is
  'Workspace tabs turned off for this project. Overview and Access are never stored.';

create or replace function public.guard_project_hidden_tools()
returns trigger
language plpgsql
as $$
begin
  if new.hidden_tools is not distinct from old.hidden_tools then
    return new;
  end if;

  if exists (
    select 1
    from public.projects p
    where p.id = new.id
      and public.is_account_member(p.account_id)
  ) then
    return new;
  end if;

  if exists (
    select 1
    from public.project_members pm
    where pm.project_id = new.id
      and pm.user_id = auth.uid()
      and pm.role = 'couple'
  ) then
    -- Invited couples cannot hide planner-only tabs.
    new.hidden_tools := (
      select coalesce(array_agg(x order by x), '{}')
      from (
        select unnest(coalesce(new.hidden_tools, '{}')) as x
        where x <> all (array['contracts', 'invoices']::text[])
        union
        select unnest(coalesce(old.hidden_tools, '{}')) as x
        where x = any (array['contracts', 'invoices']::text[])
      ) kept
    );
    return new;
  end if;

  raise exception 'hidden_tools_forbidden' using errcode = 'P0001';
end;
$$;

drop trigger if exists projects_hidden_tools_guard on public.projects;
create trigger projects_hidden_tools_guard
  before update on public.projects
  for each row
  execute function public.guard_project_hidden_tools();
