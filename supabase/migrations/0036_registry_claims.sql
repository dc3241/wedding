-- ============================================================
-- 0036_registry_claims.sql
-- Guest reserve/purchase claims (REG-03). Anon INSERT only when
-- the wedding site is published; members read identities; editors
-- override. Availability is a published-gated aggregate RPC — no
-- stored counter, no anon SELECT on claims (claimer stay couple-only).
-- ============================================================

create table if not exists registry_claims (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references projects(id) on delete cascade,
  registry_item_id uuid not null references registry_items(id) on delete cascade,
  quantity         integer not null default 1 check (quantity >= 1),
  status           text not null default 'reserved'
                     check (status in ('reserved','purchased')),
  claimer_name     text,                     -- optional; couple-only visibility
  created_at       timestamptz not null default now()
);

create index if not exists registry_claims_item_idx on registry_claims (registry_item_id);

alter table registry_claims enable row level security;

-- Anon WRITE surface #4: INSERT only, gated to a published site. No anon select/update/delete.
grant insert on registry_claims to anon;

drop policy if exists "anon insert registry claims" on registry_claims;
create policy "anon insert registry claims" on registry_claims
  for insert to anon
  with check (exists (
    select 1 from wedding_websites w
    where w.project_id = registry_claims.project_id and w.published = true
  ));

-- Couple READ (identities) and OVERRIDE.
grant select, update, delete on registry_claims to authenticated;

drop policy if exists "members read registry claims" on registry_claims;
create policy "members read registry claims" on registry_claims
  for select using (can_access_project(project_id));

drop policy if exists "editors update registry claims" on registry_claims;
create policy "editors update registry claims" on registry_claims
  for update using (can_edit_project(project_id)) with check (can_edit_project(project_id));

drop policy if exists "editors delete registry claims" on registry_claims;
create policy "editors delete registry claims" on registry_claims
  for delete using (can_edit_project(project_id));

-- Public availability: aggregate counts only, no PII. Published-gated so anon can't probe drafts.
create or replace function registry_item_availability(p_project_id uuid)
  returns table (registry_item_id uuid, claimed_qty integer)
  language sql stable security definer set search_path = public as $$
    select c.registry_item_id, coalesce(sum(c.quantity),0)::int
    from registry_claims c
    join wedding_websites w on w.project_id = c.project_id and w.published = true
    where c.project_id = p_project_id
    group by c.registry_item_id;
  $$;

grant execute on function registry_item_availability(uuid) to anon, authenticated;
