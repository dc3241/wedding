-- ============================================================
-- 0069_already_booked_vendor_categories.sql
-- ONB-05: already-booked vendor category ids on wedding_profile,
-- plus commit_wedding_plan structural exclusion for vendor_targets
-- whose category is in that list (checklist remains prompt-only).
-- ============================================================

alter table wedding_profile
  add column if not exists already_booked_vendor_category_ids text[]
    not null default '{}';

alter table wedding_profile
  drop constraint if exists wedding_profile_already_booked_categories_check;
alter table wedding_profile
  add constraint wedding_profile_already_booked_categories_check
  check (
    already_booked_vendor_category_ids <@ array[
      'venue', 'caterer', 'florist', 'baker', 'hair-makeup', 'jewelry',
      'photographer', 'videographer', 'dj', 'band', 'officiant', 'planner',
      'rentals'
    ]::text[]
  );

-- ---- commit_wedding_plan: exclude already-booked from vendor_targets ----

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
  v_already_booked text[];
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
    wp.include_vendors,
    wp.already_booked_vendor_category_ids
  into
    v_onboarded_at,
    v_include_budget,
    v_include_checklist,
    v_include_vendors,
    v_already_booked
  from wedding_profile wp
  where wp.project_id = p_project_id;

  if not found then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  if v_onboarded_at is not null then
    raise exception 'already_committed' using errcode = 'P0001';
  end if;

  v_already_booked := coalesce(v_already_booked, '{}'::text[]);
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
    )
    where not (r.category = any (v_already_booked));
  end if;

  update wedding_profile
  set onboarded_at = now()
  where project_id = p_project_id;
end;
$$;

grant execute on function commit_wedding_plan(uuid, jsonb, jsonb, jsonb)
  to authenticated;
