-- ============================================================
-- 0101_assistant_thread_audience.sql
-- Splits the shared per-project assistant conversation into two
-- threads: 'account' (business account members, or the couple
-- when they own the account directly) and 'invited' (project
-- members with no account of their own — couple or collaborator).
-- Same panel, same entry points — only the loaded history differs
-- by viewer. Apply AFTER whatever is actually next-free per grep
-- (Dom confirms 0101; verify against supabase/migrations/ anyway).
-- ============================================================

-- 1. Add nullable first — existing rows need backfill before NOT NULL.
alter table assistant_messages
  add column if not exists audience text;

-- 2. Resolve which audience the CURRENT caller belongs to on a given
--    project. Account membership wins if somehow both apply (mirrors
--    getAccountContext's own precedence). Null = no access.
create or replace function resolve_assistant_audience(p_project_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1
      from projects p
      where p.id = p_project_id
        and is_account_member(p.account_id)
    ) then 'account'
    when exists (
      select 1
      from project_members pm
      where pm.project_id = p_project_id
        and pm.user_id = auth.uid()
    ) then 'invited'
    else null
  end;
$$;

grant execute on function resolve_assistant_audience(uuid) to authenticated;

-- 3. Backfill existing rows from CURRENT membership of created_by.
--    Best-effort against present-day membership (same posture as
--    GST-06's backfill) — historical membership at send-time isn't
--    recoverable. Unresolvable rows (null created_by, membership
--    since revoked) fail safe toward 'account' rather than exposing
--    them to the invited side.
update assistant_messages am
set audience = case
  when exists (
    select 1
    from projects p
    join account_members acm on acm.account_id = p.account_id
    where p.id = am.project_id
      and acm.user_id = am.created_by
  ) then 'account'
  when exists (
    select 1
    from project_members pm
    where pm.project_id = am.project_id
      and pm.user_id = am.created_by
  ) then 'invited'
  else 'account'
end
where am.audience is null;

-- 4. Constrain now that every row has a value.
alter table assistant_messages
  alter column audience set not null;

alter table assistant_messages
  drop constraint if exists assistant_messages_audience_check;

alter table assistant_messages
  add constraint assistant_messages_audience_check
  check (audience in ('account', 'invited'));

-- 5. Read pattern index.
create index if not exists assistant_messages_project_audience_created_idx
  on assistant_messages (project_id, audience, created_at);

-- 6. Replace the project-only policies with audience-matched ones.
drop policy if exists "assistant_messages readable by project members" on assistant_messages;
drop policy if exists "assistant_messages writable by project members" on assistant_messages;
drop policy if exists "assistant_messages managed by matching audience" on assistant_messages;

create policy "assistant_messages managed by matching audience"
  on assistant_messages for all
  using (audience = resolve_assistant_audience(project_id))
  with check (audience = resolve_assistant_audience(project_id));
