-- ============================================================
-- 0067_commit_wedding_plan.sql
-- ONB-02: category CHECKs on the four VENDOR_CATEGORIES columns,
-- plan-scope flags on wedding_profile, and atomic commit_wedding_plan
-- SECURITY DEFINER (replaces the three non-atomic client inserts in
-- commitPlan). Matches bootstrap_account_and_project conventions.
-- ============================================================

-- ---- Category CHECKs (canonical 13 ids from lib/vendor-categories.ts) ----

alter table vendor_targets
  drop constraint if exists vendor_targets_category_check;
alter table vendor_targets
  add constraint vendor_targets_category_check
  check (category in (
    'venue', 'caterer', 'florist', 'baker', 'hair-makeup', 'jewelry',
    'photographer', 'videographer', 'dj', 'band', 'officiant', 'planner',
    'rentals'
  ));

alter table vendors
  drop constraint if exists vendors_category_check;
alter table vendors
  add constraint vendors_category_check
  check (
    category is null
    or category in (
      'venue', 'caterer', 'florist', 'baker', 'hair-makeup', 'jewelry',
      'photographer', 'videographer', 'dj', 'band', 'officiant', 'planner',
      'rentals'
    )
  );

alter table files
  drop constraint if exists files_category_check;
alter table files
  add constraint files_category_check
  check (
    category is null
    or category in (
      'venue', 'caterer', 'florist', 'baker', 'hair-makeup', 'jewelry',
      'photographer', 'videographer', 'dj', 'band', 'officiant', 'planner',
      'rentals'
    )
  );

alter table contract_templates
  drop constraint if exists contract_templates_category_check;
alter table contract_templates
  add constraint contract_templates_category_check
  check (
    category is null
    or category in (
      'venue', 'caterer', 'florist', 'baker', 'hair-makeup', 'jewelry',
      'photographer', 'videographer', 'dj', 'band', 'officiant', 'planner',
      'rentals'
    )
  );

-- ---- Plan-scope flags (default true = today's behavior) ----

alter table wedding_profile
  add column if not exists include_budget boolean not null default true;
alter table wedding_profile
  add column if not exists include_checklist boolean not null default true;
alter table wedding_profile
  add column if not exists include_vendors boolean not null default true;

-- ---- Atomic plan commit ----

create or replace function commit_wedding_plan(
  p_project_id uuid,
  p_tasks jsonb,
  p_budget_items jsonb,
  p_vendor_targets jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_onboarded_at timestamptz;
  v_include_budget boolean;
  v_include_checklist boolean;
  v_include_vendors boolean;
  v_tasks jsonb;
  v_budget jsonb;
  v_vendors jsonb;
begin
  if not can_edit_project(p_project_id) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  select
    wp.onboarded_at,
    wp.include_budget,
    wp.include_checklist,
    wp.include_vendors
  into
    v_onboarded_at,
    v_include_budget,
    v_include_checklist,
    v_include_vendors
  from wedding_profile wp
  where wp.project_id = p_project_id;

  if not found then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  if v_onboarded_at is not null then
    raise exception 'already_committed' using errcode = 'P0001';
  end if;

  v_tasks := coalesce(p_tasks, '[]'::jsonb);
  v_budget := coalesce(p_budget_items, '[]'::jsonb);
  v_vendors := coalesce(p_vendor_targets, '[]'::jsonb);

  if v_include_checklist
     and jsonb_typeof(v_tasks) = 'array'
     and jsonb_array_length(v_tasks) > 0 then
    insert into tasks (project_id, title, phase, due_date, position)
    select
      p_project_id,
      r.title,
      r.phase,
      r.due_date,
      coalesce(r.position, 0)
    from jsonb_to_recordset(v_tasks) as r(
      title text,
      phase text,
      due_date date,
      position integer
    );
  end if;

  if v_include_budget
     and jsonb_typeof(v_budget) = 'array'
     and jsonb_array_length(v_budget) > 0 then
    insert into budget_items (
      project_id, category, label, planned_amount
    )
    select
      p_project_id,
      r.category,
      r.label,
      coalesce(r.planned_amount, 0)
    from jsonb_to_recordset(v_budget) as r(
      category text,
      label text,
      planned_amount numeric
    );
  end if;

  if v_include_vendors
     and jsonb_typeof(v_vendors) = 'array'
     and jsonb_array_length(v_vendors) > 0 then
    insert into vendor_targets (project_id, category, note, status)
    select
      p_project_id,
      r.category,
      r.note,
      coalesce(nullif(r.status, ''), 'needed')
    from jsonb_to_recordset(v_vendors) as r(
      category text,
      note text,
      status text
    );
  end if;

  update wedding_profile
  set onboarded_at = now()
  where project_id = p_project_id;
end;
$$;

grant execute on function commit_wedding_plan(uuid, jsonb, jsonb, jsonb)
  to authenticated;
