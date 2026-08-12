-- ============================================================
-- 0079_project_template_clone.sql
-- TMPL-01: clone checklist / budget / vendor-target STRUCTURE
-- from one project into another under the same account.
-- Function only — no new tables or columns.
-- Deliberately omits client-specific fields (dates, status,
-- actuals, vendor links). Additive / re-runnable.
-- ============================================================

create or replace function clone_project_template(
  p_source_project_id uuid,
  p_target_project_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_account_id uuid;
  v_target_account_id uuid;
begin
  select account_id into v_source_account_id
  from projects
  where id = p_source_project_id;

  select account_id into v_target_account_id
  from projects
  where id = p_target_project_id;

  if v_source_account_id is null or v_target_account_id is null then
    raise exception 'project not found';
  end if;

  if v_source_account_id <> v_target_account_id then
    raise exception 'source and target project must belong to the same account';
  end if;

  if not is_account_member(v_target_account_id) then
    raise exception 'not authorized';
  end if;

  -- Idempotency / already-populated guard
  if exists (select 1 from tasks where project_id = p_target_project_id)
     or exists (select 1 from budget_items where project_id = p_target_project_id)
     or exists (select 1 from vendor_targets where project_id = p_target_project_id) then
    raise exception 'target project already has checklist/budget/vendor data';
  end if;

  -- Tasks: structure only (title, phase, position).
  -- status defaults to 'todo'; due_date / vendor_id / notes NOT copied.
  insert into tasks (project_id, title, phase, position)
  select p_target_project_id, title, phase, position
  from tasks
  where project_id = p_source_project_id
  order by phase nulls last, position, created_at;

  -- Budget items: category + label + planned_amount only.
  -- actual_amount, due_date, project_vendor_id, notes NOT copied.
  insert into budget_items (project_id, category, label, planned_amount)
  select p_target_project_id, category, label, planned_amount
  from budget_items
  where project_id = p_source_project_id
  order by category nulls last, label nulls last, created_at;

  -- Vendor targets: category only.
  -- status defaults to 'needed'; note / project_vendor_id NOT copied.
  insert into vendor_targets (project_id, category)
  select p_target_project_id, category
  from vendor_targets
  where project_id = p_source_project_id
  order by created_at;
end;
$$;

grant execute on function clone_project_template(uuid, uuid) to authenticated;
