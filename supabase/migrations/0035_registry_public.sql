-- ============================================================
-- 0035_registry_public.sql
-- Anon READ of registry_items when the project's wedding site is
-- published (anon surface #3). External link-out column rides the
-- existing wedding_websites public snapshot — no new anon surface.
-- ============================================================

-- New anon READ surface #3: published registries are publicly readable.
drop policy if exists "anon read registry items" on registry_items;
create policy "anon read registry items" on registry_items
  for select to anon
  using (exists (
    select 1 from wedding_websites w
    where w.project_id = registry_items.project_id and w.published = true
  ));

-- External link-out rides the EXISTING public snapshot (wedding_websites) — no new anon surface.
alter table wedding_websites
  add column if not exists external_registry_links jsonb not null default '[]'::jsonb;
