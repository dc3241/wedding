-- ============================================================
-- 0012_wedding_profile.sql
-- Captures a couple's onboarding inputs (one row per project). The wedding
-- DATE and BUDGET target already live on projects (wedding_date, total_budget);
-- the wizard writes those too. This table holds the rest of the preferences
-- that the AI plan generator (2.1b) will use.
-- Apply AFTER 0011.
-- ============================================================

create table wedding_profile (
  project_id      uuid primary key references projects(id) on delete cascade,
  location        text,
  guest_estimate  integer,
  style           text,           -- vibe / style descriptors (e.g. "modern, garden, intimate")
  traditions      text,           -- cultural / religious traditions to honor
  priorities      text,           -- what matters most to them (free text)
  vibe_notes      text,           -- anything else they want the plan to reflect
  onboarded_at    timestamptz,    -- set when they finish the wizard; gates the onboarding flow
  created_at      timestamptz not null default now()
);

alter table wedding_profile enable row level security;

create policy "wedding_profile readable by project members"
  on wedding_profile for select
  using (can_access_project(project_id));

create policy "wedding_profile writable by project members"
  on wedding_profile for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));