-- ============================================================
-- 0099_ignored_vendor_categories.sql
-- VND-13b: per-project dismiss list for Budget-sourced To Book.
-- Category CHECK mirrors vendor_targets (0067 13-id list).
-- Toggle table: SELECT + INSERT + DELETE only (no UPDATE).
-- ============================================================

create table if not exists ignored_vendor_categories (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  category    text not null
                check (category in (
                  'venue', 'caterer', 'florist', 'baker', 'hair-makeup', 'jewelry',
                  'photographer', 'videographer', 'dj', 'band', 'officiant', 'planner',
                  'rentals'
                )),
  created_at  timestamptz not null default now(),
  unique (project_id, category)
);

create index if not exists ignored_vendor_categories_project_idx
  on ignored_vendor_categories (project_id);

alter table ignored_vendor_categories enable row level security;

drop policy if exists "ignored_vendor_categories readable by project members"
  on ignored_vendor_categories;
create policy "ignored_vendor_categories readable by project members"
  on ignored_vendor_categories for select to authenticated
  using (can_access_project(project_id));

drop policy if exists "ignored_vendor_categories insertable by project editors"
  on ignored_vendor_categories;
create policy "ignored_vendor_categories insertable by project editors"
  on ignored_vendor_categories for insert to authenticated
  with check (can_edit_project(project_id));

drop policy if exists "ignored_vendor_categories deletable by project editors"
  on ignored_vendor_categories;
create policy "ignored_vendor_categories deletable by project editors"
  on ignored_vendor_categories for delete to authenticated
  using (can_edit_project(project_id));
