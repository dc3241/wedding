-- ============================================================
-- 0005_discovery_and_outreach.sql
-- Adds two things the couple-facing vendor vision needs:
--   A) discovery/enrichment fields on the rolodex (vendors)
--   B) an outreach message log (drafts + sent), all first-party data
-- Apply AFTER 0001-0004.
-- ============================================================

-- ---------- A) Discovery / enrichment on the rolodex ----------
-- Only place_id is stored from Google (allowed indefinitely). Ratings and
-- reviews are fetched LIVE and shown with attribution — never stored here.
-- ai_overview is generated from the vendor's OWN site/description, not from
-- Google reviews, so it's yours to store.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'vendors' and column_name = 'source'
  ) then
    alter table vendors add column source text not null default 'manual';
  end if;
end $$;

alter table vendors add column if not exists external_place_id text;
alter table vendors add column if not exists ai_overview text;
alter table vendors add column if not exists last_enriched_at timestamptz;

-- A couple shouldn't add the same discovered place twice.
create unique index if not exists vendors_account_place_idx
  on vendors (account_id, external_place_id)
  where external_place_id is not null;

-- The "outreach list" is just project_vendors filtered by status — no new table.
-- Suggested status vocabulary (free text, enforce in app):
--   discovered -> to_contact -> contacted -> replied -> booked -> declined

-- ---------- B) Outreach message log ----------
create table if not exists outreach_messages (
  id                uuid primary key default gen_random_uuid(),
  project_vendor_id uuid not null references project_vendors(id) on delete cascade,
  direction         text not null default 'outbound',  -- outbound | inbound | note
  channel           text not null default 'email',     -- email | sms | note
  subject           text,
  body              text,
  status            text not null default 'draft',     -- draft | sent | failed
  sent_at           timestamptz,
  send_error        text,
  updated_at        timestamptz not null default now(),
  created_by        uuid default auth.uid() references auth.users(id),
  created_at        timestamptz not null default now()
);

create index if not exists outreach_messages_project_vendor_created_idx
  on outreach_messages (project_vendor_id, created_at);

-- Access flows through the project the vendor involvement belongs to.
create or replace function can_access_project_vendor(p_pv_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select can_access_project((select project_id from project_vendors where id = p_pv_id));
$$;

alter table outreach_messages enable row level security;

drop policy if exists "outreach readable by project members" on outreach_messages;
create policy "outreach readable by project members"
  on outreach_messages for select
  using (can_access_project_vendor(project_vendor_id));

drop policy if exists "outreach writable by project members" on outreach_messages;
create policy "outreach writable by project members"
  on outreach_messages for all
  using (can_access_project_vendor(project_vendor_id))
  with check (can_access_project_vendor(project_vendor_id));

grant execute on function can_access_project_vendor(uuid) to authenticated;
