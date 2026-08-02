-- ============================================================
-- 0049_budget_alert_dismissals.sql
-- BUD-08: dismiss-until-worse for Needs Attention over-plan alerts.
-- Re-runnable. Project-scoped; can_edit_project write gate.
-- ============================================================

create table if not exists budget_alert_dismissals (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  category       text not null,              -- free-text budget category the alert is keyed on
  alert_kind     text not null default 'over_plan'
                 check (alert_kind in ('over_plan')),
  overage_at_dismiss numeric not null,       -- snapshot of actualTotal - plannedTotal at dismiss
  created_at     timestamptz not null default now(),
  -- One live dismissal per (project, category, kind); re-dismissing updates the snapshot (see action).
  -- UNIQUE constraint (not index-only) so PostgREST upsert onConflict resolves.
  constraint budget_alert_dismissals_unique unique (project_id, category, alert_kind)
);

alter table budget_alert_dismissals enable row level security;

drop policy if exists "budget alert dismissals editable by project editors" on budget_alert_dismissals;
create policy "budget alert dismissals editable by project editors" on budget_alert_dismissals
  for all to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));
