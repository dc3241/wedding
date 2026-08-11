BEGIN;

-- ===== 0001_core_tenancy.sql =====

-- ============================================================
-- 0001_core_tenancy.sql
-- Foundation: accounts, members, projects, project members.
-- A "couple" = an account that owns exactly 1 project.
-- A "planner" = an account that owns N projects (one per client).
-- Every feature table hangs off project_id and reuses can_access_project().
-- ============================================================

create type account_role as enum ('owner', 'planner', 'staff');
create type project_role as enum ('couple', 'collaborator', 'viewer');

-- The tenant. 'personal' = a DIY couple's own account; 'business' = a planner.
create table accounts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        text not null default 'personal' check (kind in ('personal', 'business')),
  created_at  timestamptz not null default now()
);

-- Who belongs to an account. Planners/staff here can see ALL projects in the account.
create table account_members (
  account_id  uuid not null references accounts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        account_role not null default 'owner',
  created_at  timestamptz not null default now(),
  primary key (account_id, user_id)
);

-- A wedding.
create table projects (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references accounts(id) on delete cascade,
  name          text not null,                 -- e.g. "Sarah & James — Oct 2026"
  wedding_date  date,
  status        text not null default 'active',
  created_at    timestamptz not null default now()
);

-- Couples a planner invites into ONE project only (cross-account collaboration).
-- A DIY couple does NOT need a row here — they reach their project via account_members.
create table project_members (
  project_id  uuid not null references projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        project_role not null default 'couple',
  created_at  timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- ============================================================
-- Access helper. SECURITY DEFINER so it can read membership tables
-- without tripping RLS recursion. This is the entire access model.
-- ============================================================
create or replace function can_access_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  -- Path 1: member of the account that owns the project (planner sees all clients)
  select exists (
    select 1
    from projects p
    join account_members am on am.account_id = p.account_id
    where p.id = p_project_id and am.user_id = auth.uid()
  )
  -- Path 2: invited directly into this one project (couple of a planned wedding)
  or exists (
    select 1 from project_members pm
    where pm.project_id = p_project_id and pm.user_id = auth.uid()
  );
$$;

-- ============================================================
-- RLS on the spine.
-- account_members uses a self-referential simple predicate (no function)
-- to avoid recursion; everything else can use can_access_project().
-- ============================================================
alter table accounts          enable row level security;
alter table account_members   enable row level security;
alter table projects          enable row level security;
alter table project_members   enable row level security;

create policy "see own memberships"
  on account_members for select
  using (user_id = auth.uid());

create policy "see own account"
  on accounts for select
  using (exists (
    select 1 from account_members am
    where am.account_id = accounts.id and am.user_id = auth.uid()
  ));

create policy "see accessible projects"
  on projects for select
  using (can_access_project(id));

create policy "see project memberships"
  on project_members for select
  using (can_access_project(project_id));

-- ============================================================
-- Worked example of a FEATURE table. Every other feature
-- (tasks, budget_items, guests, timeline_events...) follows
-- this exact shape: project_id FK + the same two policies.
-- ============================================================
create table vendors (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  name          text not null,
  category      text,                              -- florist, caterer, photographer...
  contact_email text,
  status        text not null default 'lead',      -- lead, contacted, booked, declined
  created_at    timestamptz not null default now()
);

alter table vendors enable row level security;

create policy "vendors readable by project members"
  on vendors for select
  using (can_access_project(project_id));

create policy "vendors writable by project members"
  on vendors for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

-- ===== 0002_checklist.sql =====

-- ============================================================
-- 0002_checklist.sql
-- Wedding checklist / timeline. Project-scoped, reuses can_access_project().
-- due_date can be seeded from projects.wedding_date minus an offset to
-- auto-generate a starter timeline (the "generate my checklist" feature).
-- vendor_id links a task to the vendor it concerns ("Book photographer" ->
-- that vendor row) — this is the seam between the checklist and the
-- vendor relationship system you want to hang your hat on.
-- ============================================================

create table tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null,
  status      text not null default 'todo'
                check (status in ('todo', 'in_progress', 'done')),
  phase       text,                 -- bucket: '12+ months', '9 months', '6 months', 'week of'...
  due_date    date,                 -- absolute; seed from wedding_date - offset
  vendor_id   uuid references vendors(id) on delete set null,
  position    integer not null default 0,
  notes       text,
  created_at  timestamptz not null default now()
);

create index on tasks (project_id, phase, position);

alter table tasks enable row level security;

create policy "tasks readable by project members"
  on tasks for select
  using (can_access_project(project_id));

create policy "tasks writable by project members"
  on tasks for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

-- ===== 0003_write_access.sql =====

-- ============================================================
-- 0003_write_access.sql
-- The read policies in 0001 don't let a user CREATE their first account,
-- membership, or project (RLS denies any write with no matching policy).
-- This migration adds the write paths the app needs, without ever using
-- the service-role key in app code.
-- Apply AFTER 0001 and 0002.
-- ============================================================

-- Helper: is the current user a member of this account?
-- SECURITY DEFINER avoids RLS recursion when called inside policies.
create or replace function is_account_member(p_account_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from account_members am
    where am.account_id = p_account_id and am.user_id = auth.uid()
  );
$$;

-- Members of an account can create and update projects in it
-- (covers a planner's "New wedding" button and renaming / setting the date).
create policy "members create projects"
  on projects for insert
  with check (is_account_member(account_id));

create policy "members update projects"
  on projects for update
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- Atomic onboarding: create an account, add the caller as owner, create the
-- first project. SECURITY DEFINER performs the inserts RLS would otherwise block
-- (the chicken-and-egg of your very first account), but the logic is fixed and
-- always acts only for the calling user (auth.uid()). Returns the new project id.
create or replace function bootstrap_account_and_project(
  p_account_name text,
  p_account_kind text,
  p_project_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_project_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into accounts (name, kind)
  values (p_account_name, coalesce(nullif(p_account_kind, ''), 'personal'))
  returning id into v_account_id;

  insert into account_members (account_id, user_id, role)
  values (v_account_id, auth.uid(), 'owner');

  insert into projects (account_id, name)
  values (v_account_id, p_project_name)
  returning id into v_project_id;

  return v_project_id;
end;
$$;

-- Let logged-in users call the function and helpers from the app.
grant execute on function bootstrap_account_and_project(text, text, text) to authenticated;
grant execute on function is_account_member(uuid) to authenticated;
grant execute on function can_access_project(uuid) to authenticated;

-- ===== 0004_vendors_account.sql =====

-- ============================================================
-- 0004_vendors.sql
-- Restructures vendors into two levels:
--   vendors          = account-level rolodex (the vendor as a business you know)
--   project_vendors  = a vendor's involvement in ONE wedding (status, quote, role)
-- Preserves the working checklist: the old per-project vendors table becomes
-- project_vendors, so tasks.vendor_id keeps pointing at the right rows (now the
-- per-wedding involvement, which is the correct target).
-- Apply AFTER 0001-0003.
-- ============================================================

-- 1) The old per-project vendors table becomes the involvement/join table.
--    (tasks.vendor_id follows the rename automatically.)
alter table vendors rename to project_vendors;

-- 2) The new account-level rolodex.
create table vendors (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references accounts(id) on delete cascade,
  name          text not null,
  category      text,                 -- florist, caterer, photographer, venue, DJ...
  contact_name  text,
  contact_email text,
  contact_phone text,
  website       text,
  service_area  text,
  notes         text,                 -- relationship notes across weddings
  is_preferred  boolean not null default false,  -- your own quality flag
  created_at    timestamptz not null default now()
);

-- 3) Link involvement rows to rolodex vendors, then backfill from existing data.
alter table project_vendors add column vendor_id uuid references vendors(id) on delete cascade;

do $$
declare r record; v uuid;
begin
  for r in
    select pv.id, pv.name, pv.category, pv.contact_email, p.account_id
    from project_vendors pv
    join projects p on p.id = pv.project_id
    where pv.vendor_id is null
  loop
    insert into vendors (account_id, name, category, contact_email)
    values (r.account_id, r.name, r.category, r.contact_email)
    returning id into v;
    update project_vendors set vendor_id = v where id = r.id;
  end loop;
end $$;

alter table project_vendors alter column vendor_id set not null;

-- 4) Per-wedding fields live on involvement; the descriptive fields now live on
--    the rolodex, so drop the duplicated columns. status stays (pipeline state).
alter table project_vendors add column quoted_price numeric(12,2);
alter table project_vendors add column role text;        -- their role in THIS wedding
alter table project_vendors add column notes text;       -- notes specific to this wedding
alter table project_vendors drop column name;
alter table project_vendors drop column category;
alter table project_vendors drop column contact_email;

create index on project_vendors (project_id);
create index on project_vendors (vendor_id);

-- 5) Reset RLS on the renamed involvement table (old policies dropped, scoped anew).
drop policy if exists "vendors readable by project members" on project_vendors;
drop policy if exists "vendors writable by project members" on project_vendors;

create policy "project_vendors readable by project members"
  on project_vendors for select
  using (can_access_project(project_id));

create policy "project_vendors writable by project members"
  on project_vendors for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

-- 6) Rolodex access: read if you're an account member OR the vendor is linked to a
--    wedding you can access (so an invited couple sees their own wedding's vendors,
--    but not the planner's wider rolodex or other clients' vendors).
create or replace function can_read_vendor(p_vendor_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    is_account_member((select account_id from vendors where id = p_vendor_id))
    or exists (
      select 1 from project_vendors pv
      where pv.vendor_id = p_vendor_id and can_access_project(pv.project_id)
    );
$$;

alter table vendors enable row level security;

create policy "vendors readable via account or linked project"
  on vendors for select
  using (can_read_vendor(id));

create policy "vendors managed by account members"
  on vendors for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

grant execute on function can_read_vendor(uuid) to authenticated;

-- ===== 0005_vendor_enrichment.sql =====

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

-- ===== 0006_guests.sql =====

-- ============================================================
-- 0006_guests.sql
-- Project-scoped guest list with RSVP + meal tracking. Used by both
-- the couple and planner surfaces. Follows the tasks/vendors pattern.
-- Apply AFTER 0001-0005.
-- ============================================================

create table guests (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  full_name   text not null,
  email       text,
  phone       text,
  household   text,                  -- groups a party/family onto one line
  party_size  integer not null default 1,
  rsvp_status text not null default 'pending'
                check (rsvp_status in ('pending', 'attending', 'declined')),
  meal_choice text,
  notes       text,
  created_at  timestamptz not null default now()
);

create index on guests (project_id, household, full_name);

alter table guests enable row level security;

create policy "guests readable by project members"
  on guests for select
  using (can_access_project(project_id));

create policy "guests writable by project members"
  on guests for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

-- ===== 0007_email_credentials.sql =====

-- ============================================================
-- 0007_email_credentials.sql
-- Per-user Gmail OAuth tokens for sending outreach from the couple's mailbox.
-- Tokens are read only in server actions — never exposed to the client.
-- ============================================================

create table email_credentials (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  provider      text not null default 'gmail' check (provider = 'gmail'),
  email         text not null,
  access_token  text not null,
  refresh_token text,
  token_expiry  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, provider)
);

alter table email_credentials enable row level security;

create policy "users read own email credentials"
  on email_credentials for select
  using (user_id = auth.uid());

create policy "users insert own email credentials"
  on email_credentials for insert
  with check (user_id = auth.uid());

create policy "users update own email credentials"
  on email_credentials for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users delete own email credentials"
  on email_credentials for delete
  using (user_id = auth.uid());

-- ===== 0008_outreach_send.sql =====

-- ============================================================
-- 0008_outreach_app_columns.sql
-- App columns for Gmail send/save on outreach_messages.
-- Safe to re-run (IF NOT EXISTS). Databases that applied an older 0005
-- without send_error/updated_at get patched here; fresh installs get them
-- from 0005 and this is a no-op.
-- Apply AFTER 0005.
-- ============================================================

alter table outreach_messages
  add column if not exists send_error text,
  add column if not exists updated_at timestamptz not null default now();

update outreach_messages
set updated_at = coalesce(created_at, now())
where updated_at is null;

-- ===== 0009_notes.sql =====

-- ============================================================
-- 0009_notes.sql
-- Project-scoped notes (meeting notes, freeform). Follows the
-- tasks/guests pattern. Apply AFTER 0001-0008.
-- ============================================================

create table notes (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null default 'Untitled note',
  body        text,
  created_by  uuid default auth.uid() references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on notes (project_id, updated_at desc);

alter table notes enable row level security;

create policy "notes readable by project members"
  on notes for select
  using (can_access_project(project_id));

create policy "notes writable by project members"
  on notes for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

-- ===== 0010_budget.sql =====

-- ============================================================
-- 0010_budget.sql
-- Budget: an overall target on the project, plus manual budget line items.
-- Vendor costs are NOT duplicated here — they're read live from
-- project_vendors (quoted_price where status = 'booked').
-- Apply AFTER your latest migration (0009).
-- ============================================================

-- Overall budget target the couple sets (nullable until they set it).
alter table projects add column total_budget numeric(12,2);
-- (Updating this is already covered by the existing "members update projects" policy.)

-- Manual line items for non-vendor expenses (attire, favors, misc).
create table budget_items (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  category       text,                    -- e.g. attire, decor, stationery
  label          text not null,           -- the line item name
  planned_amount numeric(12,2) not null default 0,
  actual_amount  numeric(12,2),           -- optional: what was actually paid
  notes          text,
  created_at     timestamptz not null default now()
);

create index on budget_items (project_id, category);

alter table budget_items enable row level security;

create policy "budget_items readable by project members"
  on budget_items for select
  using (can_access_project(project_id));

create policy "budget_items writable by project members"
  on budget_items for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

-- ===== 0011_files.sql =====

-- ============================================================
-- 0011_files.sql
-- Project file storage: a PRIVATE bucket + a files metadata table + storage
-- access policies that reuse can_access_project. Files are stored under a
-- "<project_id>/" folder, so the path's first segment is the project id, and
-- the storage policies authorize by that. Run in the Supabase SQL editor.
-- Apply AFTER 0010.
-- ============================================================

-- 1) Private bucket, 25MB limit, docs + images only (enforced by Storage itself).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files', 'project-files', false, 26214400,
  array[
    'application/pdf',
    'image/png', 'image/jpeg', 'image/webp', 'image/heic',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do nothing;
-- If your project blocks inserting into storage.buckets via SQL, create the bucket in the
-- Supabase console instead (Storage -> New bucket -> name 'project-files', Private, set the
-- 25MB limit and the same allowed types), then run the policies below.

-- 2) Storage access policies: a user may touch an object only if they can access the
-- project whose id is the first folder in the object's path.
create policy "project files readable by members"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-files'
    and public.can_access_project(((storage.foldername(name))[1])::uuid)
  );

create policy "project files insertable by members"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and public.can_access_project(((storage.foldername(name))[1])::uuid)
  );

create policy "project files deletable by members"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-files'
    and public.can_access_project(((storage.foldername(name))[1])::uuid)
  );

-- 3) Metadata table (the bytes live in Storage; this tracks files per project).
create table files (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  kind         text not null default 'file',   -- 'file' | 'contract' (Contracts reuses later)
  name         text not null,
  storage_path text not null,
  mime_type    text,
  size_bytes   bigint,
  uploaded_by  uuid default auth.uid() references auth.users(id),
  created_at   timestamptz not null default now()
);

create index on files (project_id, kind, created_at desc);

alter table files enable row level security;

create policy "files readable by project members"
  on files for select
  using (can_access_project(project_id));

create policy "files writable by project members"
  on files for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

-- ===== 0012_wedding_profile.sql =====

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

-- ===== 0013_vendor_targets.sql =====

-- ============================================================
-- 0013_vendor_targets.sql
-- "Vendor categories to book" — distinct from actual vendor records. The AI
-- starting plan seeds these (Photographer, Caterer, Florist...) and the couple
-- fills each by discovering + booking a real vendor later.
-- Apply AFTER 0012.
-- ============================================================

create table vendor_targets (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  category    text not null,
  note        text,
  status      text not null default 'needed'
                check (status in ('needed', 'booked', 'skipped')),
  created_at  timestamptz not null default now()
);

create index on vendor_targets (project_id);

alter table vendor_targets enable row level security;

create policy "vendor_targets readable by project members"
  on vendor_targets for select
  using (can_access_project(project_id));

create policy "vendor_targets writable by project members"
  on vendor_targets for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

-- ===== 0014_assistant_messages.sql =====

-- ============================================================
-- 0014_assistant_messages.sql
-- Per-project conversation history for the in-app AI assistant. Used by both
-- the couple and planner surfaces (project-scoped). Apply AFTER 0013.
-- ============================================================

create table assistant_messages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_by  uuid default auth.uid() references auth.users(id),
  created_at  timestamptz not null default now()
);

create index on assistant_messages (project_id, created_at);

alter table assistant_messages enable row level security;

create policy "assistant_messages readable by project members"
  on assistant_messages for select
  using (can_access_project(project_id));

create policy "assistant_messages writable by project members"
  on assistant_messages for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

-- ===== 0015_timeline_events.sql =====

-- ============================================================
-- 0015_timeline_events.sql
-- The day-of run sheet: time-ordered events for the wedding day, distinct
-- from the checklist (which is the long-range planning timeline). One ordered
-- list with an optional section grouping and an optional free-text owner.
-- Used by both couple and planner surfaces. Apply AFTER 0014.
-- ============================================================

create table timeline_events (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null,
  description text,
  start_time  time,                 -- time of day, e.g. 14:00
  end_time    time,
  section     text,                 -- optional grouping: Rehearsal, Ceremony, Reception
  owner       text,                 -- optional: who's responsible (Photographer, DJ, MOH)
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index on timeline_events (project_id, start_time, position);

alter table timeline_events enable row level security;

create policy "timeline_events readable by project members"
  on timeline_events for select
  using (can_access_project(project_id));

create policy "timeline_events writable by project members"
  on timeline_events for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

-- ===== 0016_contract_status.sql =====

-- ============================================================
-- 0016_contract_status.sql
-- Optional contract status on files rows (draft / sent / signed).
-- Nullable with no default — notes-tab uploads stay null; UI treats null as draft.
-- Apply AFTER 0015.
-- ============================================================

alter table files add column status text;

alter table files add constraint files_status_check
  check (status is null or status in ('draft', 'sent', 'signed'));

-- ===== 0017_leads.sql =====

-- ============================================================
-- 0017_leads.sql
-- Account-scoped lead pipeline for planner CRM (pre-project couples).
-- Authorizes via is_account_member — NOT can_access_project.
-- Apply AFTER 0016.
-- ============================================================

create table leads (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references accounts(id) on delete cascade,
  couple_name      text not null,
  contact_email    text,
  contact_phone    text,
  wedding_date     date,
  estimated_budget numeric,
  venue            text,
  source           text,
  stage            text not null default 'inquiry',
  notes            text,
  position         integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table leads add constraint leads_stage_check
  check (stage in ('inquiry', 'contacted', 'proposal', 'booked', 'lost'));

create index leads_account_stage_position_idx on leads (account_id, stage, position);

alter table leads enable row level security;

create policy "leads readable by account members"
  on leads for select
  using (is_account_member(account_id));

create policy "leads insertable by account members"
  on leads for insert
  with check (is_account_member(account_id));

create policy "leads updatable by account members"
  on leads for update
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create policy "leads deletable by account members"
  on leads for delete
  using (is_account_member(account_id));

-- ===== 0018_proposals.sql =====

-- ============================================================
-- 0018_proposals.sql
-- Account-scoped proposals tied to leads (CRM).
-- Authorizes via is_account_member — NOT can_access_project.
-- Apply AFTER 0017.
-- ============================================================

create table proposals (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  lead_id     uuid not null references leads(id) on delete cascade,
  title       text not null default 'Proposal',
  line_items  jsonb not null default '[]'::jsonb,
  total       numeric not null default 0,
  status      text not null default 'draft',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table proposals add constraint proposals_status_check
  check (status in ('draft', 'sent', 'accepted', 'declined'));

create index proposals_lead_id_idx on proposals (lead_id);

alter table proposals enable row level security;

create policy "proposals readable by account members"
  on proposals for select
  using (is_account_member(account_id));

create policy "proposals insertable by account members"
  on proposals for insert
  with check (is_account_member(account_id));

create policy "proposals updatable by account members"
  on proposals for update
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create policy "proposals deletable by account members"
  on proposals for delete
  using (is_account_member(account_id));

-- ===== 0019_proposal_acceptance.sql =====

-- ============================================================
-- 0019_proposal_acceptance.sql
-- Acceptance timestamp and contract terms on proposals.
-- Apply AFTER 0018.
-- ============================================================

alter table proposals add column accepted_at timestamptz;
alter table proposals add column terms text;

-- ===== 0020_subscriptions.sql =====

-- ============================================================
-- 0020_subscriptions.sql
-- One Stripe subscription row per account. Status mirrors Stripe's
-- vocabulary intentionally — no CHECK on status (Stripe may add values).
-- Authenticated users may SELECT only; writes are service-role (webhook).
-- Apply AFTER 0019.
-- ============================================================

create table subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  account_id             uuid not null unique references accounts(id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  -- Intentionally unconstrained: mirrors Stripe subscription.status strings
  -- (active, trialing, past_due, canceled, incomplete, incomplete_expired, unpaid, paused, …).
  status                 text,
  price_id               text,
  quantity               integer not null default 1,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index subscriptions_stripe_customer_id_idx on subscriptions (stripe_customer_id);
create index subscriptions_stripe_subscription_id_idx on subscriptions (stripe_subscription_id);

alter table subscriptions enable row level security;

create policy "subscriptions readable by account members"
  on subscriptions for select
  using (is_account_member(account_id));

-- ===== 0021_wedding_websites.sql =====

-- ============================================================
-- 0021_wedding_websites.sql
-- Project-scoped wedding website (auth-only in 3.6a; public read in 3.6b).
-- Self-contained content snapshot on the row; template + theme for presentation.
-- Apply AFTER 0020.
-- ============================================================

create table wedding_websites (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null unique references projects(id) on delete cascade,
  slug        text,
  published   boolean not null default false,
  template    text not null default 'classic',
  theme       text not null default 'ivory',
  content     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index wedding_websites_slug_idx
  on wedding_websites (slug)
  where slug is not null;

alter table wedding_websites enable row level security;

create policy "wedding_websites readable by project members"
  on wedding_websites for select
  using (can_access_project(project_id));

create policy "wedding_websites writable by project members"
  on wedding_websites for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

-- ===== 0022_wedding_websites_public_read.sql =====

-- ============================================================
-- 0022_wedding_websites_public_read.sql
-- Anonymous read of published wedding websites only (3.6b).
-- Apply AFTER 0021.
-- ============================================================

create policy "Public read of published wedding websites"
  on wedding_websites for select
  to anon, authenticated
  using (published = true);

-- ===== 0023_rsvp_submissions.sql =====

-- ============================================================
-- 0023_rsvp_submissions.sql
-- Anonymous RSVP intake from published wedding sites (3.6c).
-- Project-scoped review queue — separate from the guests table.
-- Apply AFTER 0022.
-- ============================================================

create table rsvp_submissions (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,
  response    text not null check (response in ('yes', 'no')),
  party_size  int not null default 1 check (party_size between 1 and 20),
  email       text,
  message     text,
  status      text not null default 'new' check (status in ('new', 'reviewed')),
  created_at  timestamptz not null default now()
);

create index rsvp_submissions_project_created_idx
  on rsvp_submissions (project_id, created_at desc);

alter table rsvp_submissions enable row level security;

-- Anon: INSERT only, gated to published sites.
grant insert on rsvp_submissions to anon;

create policy "rsvp_anon_insert" on rsvp_submissions
  for insert to anon
  with check (
    exists (
      select 1 from wedding_websites w
      where w.project_id = rsvp_submissions.project_id
        and w.published = true
    )
  );

-- Authenticated members: full inbox management via can_access_project.
grant select, update, delete on rsvp_submissions to authenticated;

create policy "rsvp_member_select" on rsvp_submissions
  for select to authenticated
  using (can_access_project(project_id));

create policy "rsvp_member_update" on rsvp_submissions
  for update to authenticated
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

create policy "rsvp_member_delete" on rsvp_submissions
  for delete to authenticated
  using (can_access_project(project_id));

-- ===== 0024_seating_tables.sql =====

-- ============================================================
-- 0024_seating_tables.sql
-- Floor-plan tables for the seating chart. Project-scoped spatial
-- entities with canvas coordinates. Apply AFTER 0023.
-- ============================================================

create table seating_tables (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  label       text not null,
  shape       text not null check (shape in ('round','square','rectangle')),
  seat_count  int not null check (seat_count between 1 and 20),
  kind        text not null default 'standard'
                check (kind in ('standard','sweetheart','head')),
  pos_x       numeric not null,
  pos_y       numeric not null,
  rotation    numeric not null default 0,
  created_at  timestamptz not null default now()
);

create index seating_tables_project_id_idx on seating_tables (project_id);

alter table seating_tables enable row level security;

grant select, insert, update, delete on seating_tables to authenticated;

create policy "seating_tables_member_select" on seating_tables
  for select to authenticated
  using (can_access_project(project_id));

create policy "seating_tables_member_insert" on seating_tables
  for insert to authenticated
  with check (can_access_project(project_id));

create policy "seating_tables_member_update" on seating_tables
  for update to authenticated
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

create policy "seating_tables_member_delete" on seating_tables
  for delete to authenticated
  using (can_access_project(project_id));

-- ===== 0025_seating_assignments.sql =====

-- ============================================================
-- 0025_seating_assignments.sql
-- Seats guests (0006) at tables (0024). project_id is denormalized onto
-- each row so RLS gates directly on it (consistent with every other
-- project-scoped table) instead of joining through seating_tables.
-- Apply AFTER 0024.
-- ============================================================

create table seating_assignments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  table_id    uuid not null references seating_tables(id) on delete cascade,
  guest_id    uuid not null references guests(id) on delete cascade,
  seat_index  int check (seat_index >= 0),   -- nullable; table-level for now,
                                              -- seat-specific UI is a later slice
  created_at  timestamptz not null default now(),

  -- A guest is seated in at most ONE place per project.
  unique (project_id, guest_id)
);

-- A specific seat at a table holds at most one guest. Multiple table-level
-- (null seat_index) assignments at the same table are allowed until the
-- seat-specific UI lands.
create unique index seating_assignments_table_seat_idx
  on seating_assignments (table_id, seat_index)
  where seat_index is not null;

create index seating_assignments_table_id_idx on seating_assignments (table_id);
create index seating_assignments_project_id_idx on seating_assignments (project_id);

-- NOTE: table occupancy (count of assignments at a table <= seat_count) is NOT
-- a DB constraint — Postgres CHECK can't span rows without a trigger. It is
-- enforced in the assignGuestToTable action as a value validation. RLS still
-- authorizes every write.

alter table seating_assignments enable row level security;

grant select, insert, update, delete on seating_assignments to authenticated;

create policy "seating_assignments_member_select" on seating_assignments
  for select to authenticated
  using (can_access_project(project_id));

create policy "seating_assignments_member_insert" on seating_assignments
  for insert to authenticated
  with check (can_access_project(project_id));

create policy "seating_assignments_member_update" on seating_assignments
  for update to authenticated
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

create policy "seating_assignments_member_delete" on seating_assignments
  for delete to authenticated
  using (can_access_project(project_id));

-- ===== 0026_budget_item_project_vendor.sql =====

-- ============================================================
-- 0026_budget_item_project_vendor.sql
-- Link a budget line item to a project_vendors involvement row.
-- Composite FK keeps the link same-project; RLS alone cannot.
-- Apply AFTER 0010 (budget_items) and 0004 (project_vendors).
-- ============================================================

-- Redundant with PK(id), but required as a composite FK target.
-- PK remains vendors_pkey (0004 rename artifact) — leave it alone.
alter table project_vendors
  add constraint project_vendors_project_id_id_key unique (project_id, id);

alter table budget_items
  add column project_vendor_id uuid;

-- Column-specific SET NULL (PG >= 15): null only project_vendor_id on vendor
-- delete; do not touch NOT NULL project_id.
alter table budget_items
  add constraint budget_items_project_vendor_fkey
  foreign key (project_id, project_vendor_id)
  references project_vendors (project_id, id)
  on delete set null (project_vendor_id);

-- One budget item per project vendor (a quote maps to one line).
create unique index budget_items_project_vendor_uidx
  on budget_items (project_id, project_vendor_id)
  where project_vendor_id is not null;

create index budget_items_project_vendor_id_idx
  on budget_items (project_vendor_id);

-- ===== 0027_bootstrap_idempotency.sql =====

-- ============================================================
-- 0027_bootstrap_idempotency.sql
-- Refuse a second bootstrap for a user who already has any
-- account_members row. Prevents double-submit from creating two
-- personal tenants and stranding the couple on /projects.
-- Does NOT unique-constrain account_members.user_id — a user may
-- hold both personal and business accounts later; the function is
-- the only writer, so the guard lives here.
-- ============================================================

create or replace function bootstrap_account_and_project(
  p_account_name text,
  p_account_kind text,
  p_project_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_project_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from account_members where user_id = auth.uid()) then
    raise exception 'already_bootstrapped' using errcode = 'P0001';
  end if;

  insert into accounts (name, kind)
  values (p_account_name, coalesce(nullif(p_account_kind, ''), 'personal'))
  returning id into v_account_id;

  insert into account_members (account_id, user_id, role)
  values (v_account_id, auth.uid(), 'owner');

  insert into projects (account_id, name)
  values (v_account_id, p_project_name)
  returning id into v_project_id;

  return v_project_id;
end;
$$;

-- ===== 0028_project_invitations.sql =====

-- ============================================================
-- 0028_project_invitations.sql
-- Planner invites a couple to ONE project (not the whole book).
-- Raw token is never stored — only sha256 hex in token_hash.
-- Accept inserts project_members only (never accounts /
-- account_members); bootstrap_account_and_project stays the
-- sole writer there so 0027's already_bootstrapped guard holds.
-- Also adds the missing DELETE policy on project_members so
-- account owners can revoke a couple's access without a silent
-- no-op.
-- ============================================================

create table project_invitations (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  email        text not null,
  role         project_role not null default 'couple',
  token_hash   text not null unique,
  invited_by   uuid not null,
  expires_at   timestamptz not null,
  accepted_at  timestamptz,
  accepted_by  uuid,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index project_invitations_project_id_idx
  on project_invitations (project_id);

-- One live invitation per email per project.
create unique index project_invitations_one_live_per_email
  on project_invitations (project_id, lower(email))
  where accepted_at is null and revoked_at is null;

-- Only the owning account issues / revokes / lists invitations.
create or replace function can_manage_project_access(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from projects p
    where p.id = p_project_id
      and is_account_member(p.account_id)
  );
$$;

grant execute on function can_manage_project_access(uuid) to authenticated;

alter table project_invitations enable row level security;

create policy "account members select project invitations"
  on project_invitations for select
  to authenticated
  using (can_manage_project_access(project_id));

create policy "account members insert project invitations"
  on project_invitations for insert
  to authenticated
  with check (can_manage_project_access(project_id));

create policy "account members update project invitations"
  on project_invitations for update
  to authenticated
  using (can_manage_project_access(project_id))
  with check (can_manage_project_access(project_id));

create policy "account members delete project invitations"
  on project_invitations for delete
  to authenticated
  using (can_manage_project_access(project_id));

-- Owning account can remove a project member (e.g. revoke couple access).
-- No insert/update policies — accept_project_invitation is the only writer.
create policy "account members remove project members"
  on project_members for delete
  to authenticated
  using (can_manage_project_access(project_id));

-- Accept an invitation by raw token. Email must match auth.email().
-- pgcrypto (digest) lives in extensions.
create or replace function accept_project_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_inv project_invitations%rowtype;
  v_hash text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  select * into v_inv from project_invitations where token_hash = v_hash;
  if not found then
    raise exception 'invalid_invitation' using errcode = 'P0001';
  end if;

  if lower(v_inv.email) is distinct from lower(auth.email()) then
    raise exception 'invitation_email_mismatch' using errcode = 'P0001';
  end if;

  if v_inv.accepted_at is not null then
    if v_inv.accepted_by = auth.uid() then
      return v_inv.project_id;              -- idempotent re-run
    end if;
    raise exception 'invitation_already_accepted' using errcode = 'P0001';
  end if;

  if v_inv.revoked_at is not null then
    raise exception 'invitation_revoked' using errcode = 'P0001';
  end if;

  if v_inv.expires_at <= now() then
    raise exception 'invitation_expired' using errcode = 'P0001';
  end if;

  insert into project_members (project_id, user_id, role)
  values (v_inv.project_id, auth.uid(), v_inv.role)
  on conflict (project_id, user_id) do nothing;

  update project_invitations
     set accepted_at = now(), accepted_by = auth.uid()
   where id = v_inv.id;

  return v_inv.project_id;
end;
$$;

grant execute on function accept_project_invitation(text) to authenticated;

-- ===== 0029_project_member_updates.sql =====

-- ============================================================
-- 0029_project_member_updates.sql
-- Couples (and collaborators) on a planner-run project may UPDATE
-- the project row. Before this, UPDATE gated only on
-- is_account_member — so invited project_members could read but
-- writes (wedding_date, total_budget) were silent no-ops.
-- viewer is excluded. account_id is immutable via trigger.
-- ============================================================

create or replace function can_edit_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from projects p
    where p.id = p_project_id
      and is_account_member(p.account_id)
  )
  or exists (
    select 1 from project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and pm.role in ('couple', 'collaborator')
  );
$$;

grant execute on function can_edit_project(uuid) to authenticated;

drop policy if exists "members update projects" on projects;
drop policy if exists "editors update projects" on projects;

create policy "editors update projects"
  on projects for update
  to authenticated
  using (can_edit_project(id))
  with check (can_edit_project(id));

-- RLS with check cannot express column-level immutability. Without
-- this, a project member could rewrite account_id and still pass
-- can_edit_project as a member of the moved row.
create or replace function guard_project_account_id()
returns trigger
language plpgsql
as $$
begin
  if new.account_id is distinct from old.account_id then
    raise exception 'project_account_id_immutable' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists projects_account_id_immutable on projects;
create trigger projects_account_id_immutable
  before update on projects
  for each row
  execute function guard_project_account_id();

-- ===== 0030_vendor_category_and_status.sql =====

-- 0030_vendor_category_and_status.sql
-- Normalizes vendors.category to VENDOR_CATEGORIES ids, pins the
-- project_vendors status vocabulary, and closes the duplicate-link gap.

-- 1. Backfill vendors.category from labels to ids. Mapping covers exactly the
--    13 canonical labels in lib/vendor-categories.ts. Legacy free text from the
--    old manual-add Input is left alone (vendorCategoryLabel falls back to the
--    raw string). Idempotent: re-running maps every id to itself.
update vendors set category = case lower(trim(category))
  when 'venue'          then 'venue'
  when 'caterer'        then 'caterer'
  when 'florist'        then 'florist'
  when 'baker'          then 'baker'
  when 'hair & makeup'  then 'hair-makeup'
  when 'jewelry'        then 'jewelry'
  when 'photographer'   then 'photographer'
  when 'videographer'   then 'videographer'
  when 'dj'             then 'dj'
  when 'band'           then 'band'
  when 'officiant'      then 'officiant'
  when 'planner'        then 'planner'
  when 'rentals'        then 'rentals'
  else category
end
where category is not null;

-- 2. One link per vendor per project (addDiscoveredVendor guarded this in app
--    code only; addVendor did not guard it at all).
create unique index if not exists project_vendors_project_vendor_key
  on project_vendors (project_id, vendor_id);

-- 3. Retire the dead 'lead' default and pin the vocabulary.
alter table project_vendors alter column status set default 'to_contact';

alter table project_vendors drop constraint if exists project_vendors_status_check;
alter table project_vendors add constraint project_vendors_status_check
  check (status in ('to_contact','contacted','booked','declined'));

-- ===== 0031_vendor_target_link.sql =====

-- 0031_vendor_target_link.sql
-- Booked vendors own their category slot via an explicit FK.
-- Re-runnable throughout. Paste by hand — do not db push.

-- 1. The slot link. Composite FK so a target can only point at a project_vendor
--    in its OWN project. MATCH SIMPLE means a null project_vendor_id skips the
--    check entirely, which is the intended "empty slot" state.
alter table vendor_targets
  add column if not exists project_vendor_id uuid;

alter table vendor_targets
  drop constraint if exists vendor_targets_project_vendor_fkey;

alter table vendor_targets
  add constraint vendor_targets_project_vendor_fkey
  foreign key (project_id, project_vendor_id)
  references project_vendors (project_id, id)
  on delete set null (project_vendor_id);

-- 2. A linked vendor is only meaningful on a booked slot.
--    The reverse is NOT required: a slot may be booked with no vendor record yet.
alter table vendor_targets
  drop constraint if exists vendor_targets_link_requires_booked;

alter table vendor_targets
  add constraint vendor_targets_link_requires_booked
  check (project_vendor_id is null or status = 'booked');

-- 3. Widen the outreach vocabulary so the drawn pipeline is reachable. Closes B2:
--    VENDOR_PIPELINE_STEPS draws To contact -> Contacted -> Replied -> Booked, and
--    'replied' was previously unstorable. 'declined' remains stored as an exit, not a stop.
alter table project_vendors
  drop constraint if exists project_vendors_status_check;

alter table project_vendors
  add constraint project_vendors_status_check
  check (status in ('to_contact','contacted','replied','booked','declined'));

-- 4. User-editable address. NOT populated from Google Places -- see bible §12,
--    "store only place_id". Manual entry only.
alter table vendors
  add column if not exists address text;

-- ===== 0032_budget_item_vendor_many.sql =====

-- ============================================================
-- 0032_budget_item_vendor_many.sql
-- Allow one project_vendor to link to many budget_items.
-- Drops the 0026 partial unique index; keeps the non-unique
-- lookup index for joins. Paste by hand — do not db push.
-- ============================================================

drop index if exists budget_items_project_vendor_uidx;

-- Retained (0026): budget_items_project_vendor_id_idx on (project_vendor_id)
-- Non-unique — still the join/lookup path after many-lines-per-vendor.

-- ===== 0033_seating_dancefloor.sql =====

-- ============================================================
-- 0033_seating_dancefloor.sql
-- Allow floor-plan dance floors on seating_tables (kind + 0 seats).
-- Apply AFTER 0024 / 0025.
-- ============================================================

alter table seating_tables drop constraint if exists seating_tables_kind_check;
alter table seating_tables
  add constraint seating_tables_kind_check
  check (kind in ('standard', 'sweetheart', 'head', 'dancefloor'));

alter table seating_tables drop constraint if exists seating_tables_seat_count_check;
alter table seating_tables
  add constraint seating_tables_seat_count_check
  check (
    (kind = 'dancefloor' and seat_count = 0)
    or (kind <> 'dancefloor' and seat_count between 1 and 20)
  );

-- ===== 0034_registry_items.sql =====

-- ============================================================
-- 0034_registry_items.sql
-- Couple-managed gift registry items (REG-01). Read for any
-- project member; writes gated on can_edit_project so a future
-- viewer role cannot mutate. No claims / public exposure yet.
-- ============================================================

create table if not exists registry_items (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  name            text not null,
  price           numeric(12,2),           -- display-only; never a budget headline
  image_url       text,                    -- hotlinked; no uploads in v1
  buy_url         text,                    -- link-out target; store label derived at render
  quantity_wanted integer not null default 1 check (quantity_wanted >= 1),
  note            text,
  created_at      timestamptz not null default now()
);

create index if not exists registry_items_project_id_idx on registry_items (project_id);

alter table registry_items enable row level security;

-- READ: any project member (couple, planner, invited couple) — read-alike gate.
drop policy if exists "members read registry items" on registry_items;
create policy "members read registry items" on registry_items
  for select using (can_access_project(project_id));

-- WRITE: editors only. Deliberately can_edit_project (NOT can_access_project) so a future
-- viewer role cannot mutate the registry. Do not weaken to can_access_project.
drop policy if exists "editors insert registry items" on registry_items;
create policy "editors insert registry items" on registry_items
  for insert with check (can_edit_project(project_id));

drop policy if exists "editors update registry items" on registry_items;
create policy "editors update registry items" on registry_items
  for update using (can_edit_project(project_id)) with check (can_edit_project(project_id));

drop policy if exists "editors delete registry items" on registry_items;
create policy "editors delete registry items" on registry_items
  for delete using (can_edit_project(project_id));

-- ===== 0035_registry_public.sql =====

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

-- ===== 0036_registry_claims.sql =====

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

-- ===== 0037_registry_legacy_links_backfill.sql =====

-- ============================================================
-- 0037_registry_legacy_links_backfill.sql
-- REG-04: consolidate website-builder legacy registry links
-- (content.registry.links) into wedding_websites.external_registry_links,
-- then clear the legacy array. Idempotent / re-runnable.
-- Hand-paste only — never supabase db push.
-- ============================================================

update wedding_websites as w
set
  external_registry_links = (
    select coalesce(
      jsonb_agg(
        jsonb_build_object('label', d.label, 'url', d.url)
        order by d.src, d.ordinality
      ),
      '[]'::jsonb
    )
    from (
      select distinct on (lower(u.url))
        u.label,
        u.url,
        u.src,
        u.ordinality
      from (
        select
          trim(both from value->>'label') as label,
          trim(both from value->>'url') as url,
          0 as src,
          ordinality
        from jsonb_array_elements(coalesce(w.external_registry_links, '[]'::jsonb))
          with ordinality
        union all
        select
          trim(both from value->>'label'),
          trim(both from value->>'url'),
          1,
          ordinality
        from jsonb_array_elements(
          coalesce(w.content->'registry'->'links', '[]'::jsonb)
        ) with ordinality
      ) u
      where coalesce(u.label, '') <> ''
        and coalesce(u.url, '') <> ''
      order by lower(u.url), u.src, u.ordinality
    ) d
  ),
  content = jsonb_set(
    coalesce(w.content, '{}'::jsonb),
    '{registry,links}',
    '[]'::jsonb,
    true
  ),
  updated_at = now()
where jsonb_typeof(coalesce(w.content->'registry'->'links', 'null'::jsonb)) = 'array'
  and jsonb_array_length(coalesce(w.content->'registry'->'links', '[]'::jsonb)) > 0;

-- ===== 0038_meal_options.sql =====

-- ============================================================
-- 0038_meal_options.sql
-- Couple-authored meal choices + catering service style (MEAL-01).
-- Style rides wedding_websites (existing anon read — ZERO new surfaces).
-- meal_options is anon surface #5: SELECT only when the site is published.
-- Writes gated on can_edit_project (WRITE-01 exemplar). No RSVP / guests changes.
-- ============================================================

-- Service style on the website row — rides Public read of published wedding websites.
alter table wedding_websites
  add column if not exists meal_service_style text not null default 'none';

alter table wedding_websites
  drop constraint if exists wedding_websites_meal_service_style_check;

alter table wedding_websites
  add constraint wedding_websites_meal_service_style_check
  check (meal_service_style in ('none', 'plated', 'buffet', 'family_style', 'stations'));

-- Couple-managed entrée / meal choices. Public RSVP wiring is MEAL-02.
create table if not exists meal_options (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,
  description text,
  is_kids     boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists meal_options_project_id_idx on meal_options (project_id);

alter table meal_options enable row level security;

-- READ: any project member.
drop policy if exists "members read meal options" on meal_options;
create policy "members read meal options" on meal_options
  for select using (can_access_project(project_id));

-- WRITE: editors only. Deliberately can_edit_project (NOT can_access_project) so a future
-- viewer role cannot mutate meal options. Do not weaken to can_access_project.
drop policy if exists "editors insert meal options" on meal_options;
create policy "editors insert meal options" on meal_options
  for insert with check (can_edit_project(project_id));

drop policy if exists "editors update meal options" on meal_options;
create policy "editors update meal options" on meal_options
  for update using (can_edit_project(project_id)) with check (can_edit_project(project_id));

drop policy if exists "editors delete meal options" on meal_options;
create policy "editors delete meal options" on meal_options
  for delete using (can_edit_project(project_id));

-- Anon READ surface #5: published sites only. Draft options must not leak.
drop policy if exists "anon read meal options" on meal_options;
create policy "anon read meal options" on meal_options
  for select to anon
  using (exists (
    select 1 from wedding_websites w
    where w.project_id = meal_options.project_id and w.published = true
  ));

-- ===== 0039_rsvp_attendees.sql =====

-- ============================================================
-- 0039_rsvp_attendees.sql
-- Per-person RSVP grain + atomic submit_rsvp RPC (MEAL-02).
-- Drops rsvp_anon_insert; anon writes only via submit_rsvp execute.
-- rsvp_attendees: NO anon policy, NO INSERT policy (definer RPC only).
-- Anon table surfaces stay at 5. Composite FKs mirror 0026.
-- ============================================================

-- Composite FK targets (redundant with PK(id); required for same-project FKs).
create unique index if not exists rsvp_submissions_project_id_key
  on rsvp_submissions (project_id, id);

create unique index if not exists meal_options_project_id_key
  on meal_options (project_id, id);

create table if not exists rsvp_attendees (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null,
  submission_id   uuid not null,
  meal_option_id  uuid,
  name            text,
  dietary_note    text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),

  foreign key (project_id, submission_id)
    references rsvp_submissions (project_id, id)
    on delete cascade,

  -- Column-specific SET NULL (PG >= 15): null only meal_option_id on option
  -- delete; do not touch NOT NULL project_id. MATCH SIMPLE: null meal_option_id
  -- skips the check (empty meal is legal).
  foreign key (project_id, meal_option_id)
    references meal_options (project_id, id)
    on delete set null (meal_option_id)
);

create index if not exists rsvp_attendees_submission_id_idx
  on rsvp_attendees (submission_id);

alter table rsvp_attendees enable row level security;

grant select, update, delete on rsvp_attendees to authenticated;

-- READ: any project member. Direct on project_id (composite FK keeps it honest).
drop policy if exists "members read rsvp attendees" on rsvp_attendees;
create policy "members read rsvp attendees" on rsvp_attendees
  for select to authenticated
  using (can_access_project(project_id));

-- WRITE corrections: editors only. No INSERT policy — only submit_rsvp writes.
drop policy if exists "editors update rsvp attendees" on rsvp_attendees;
create policy "editors update rsvp attendees" on rsvp_attendees
  for update to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));

drop policy if exists "editors delete rsvp attendees" on rsvp_attendees;
create policy "editors delete rsvp attendees" on rsvp_attendees
  for delete to authenticated
  using (can_edit_project(project_id));

-- Anon no longer inserts rsvp_submissions directly — only via submit_rsvp.
drop policy if exists "rsvp_anon_insert" on rsvp_submissions;
revoke insert on rsvp_submissions from anon;

-- Atomic RSVP intake. Resolves project from slug; never trusts a client project id.
create or replace function submit_rsvp(
  p_slug text,
  p_name text,
  p_response text,
  p_email text,
  p_message text,
  p_party_size int,
  p_attendees jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_published boolean;
  v_style text;
  v_option_count int;
  v_plated boolean;
  v_submission_id uuid;
  v_party_size int;
  v_attendees jsonb;
  v_elem jsonb;
  v_ord int;
  v_att_name text;
  v_meal_raw text;
  v_meal_id uuid;
  v_dietary text;
begin
  select w.project_id, w.published, coalesce(w.meal_service_style, 'none')
    into v_project_id, v_published, v_style
  from wedding_websites w
  where w.slug = p_slug;

  if not found or v_published is distinct from true then
    raise exception 'rsvp_unavailable' using errcode = 'P0001';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  if p_response is distinct from 'yes' and p_response is distinct from 'no' then
    raise exception 'invalid_response' using errcode = 'P0001';
  end if;

  select count(*)::int into v_option_count
  from meal_options
  where project_id = v_project_id;

  v_plated := (v_style = 'plated' and v_option_count > 0);

  if p_attendees is null or jsonb_typeof(p_attendees) is distinct from 'array' then
    v_attendees := '[]'::jsonb;
  else
    v_attendees := p_attendees;
  end if;

  -- Decline: one submission row, zero attendees.
  if p_response = 'no' then
    insert into rsvp_submissions (
      project_id, name, response, party_size, email, message
    ) values (
      v_project_id,
      trim(p_name),
      'no',
      1,
      nullif(trim(coalesce(p_email, '')), ''),
      nullif(trim(coalesce(p_message, '')), '')
    )
    returning id into v_submission_id;

    return v_submission_id;
  end if;

  -- Accepting.
  if v_plated then
    if jsonb_array_length(v_attendees) < 1 then
      raise exception 'attendees_required' using errcode = 'P0001';
    end if;

    for v_elem in select value from jsonb_array_elements(v_attendees)
    loop
      v_att_name := nullif(trim(coalesce(v_elem->>'name', '')), '');
      if v_att_name is null then
        raise exception 'attendee_name_required' using errcode = 'P0001';
      end if;

      v_meal_raw := nullif(trim(coalesce(v_elem->>'meal_option_id', '')), '');
      if v_meal_raw is null then
        raise exception 'meal_option_required' using errcode = 'P0001';
      end if;
    end loop;

    -- Derive headcount from attendee rows — ignore p_party_size.
    v_party_size := jsonb_array_length(v_attendees);
  else
    v_party_size := greatest(1, least(20, coalesce(p_party_size, 1)));
  end if;

  insert into rsvp_submissions (
    project_id, name, response, party_size, email, message
  ) values (
    v_project_id,
    trim(p_name),
    'yes',
    v_party_size,
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_message, '')), '')
  )
  returning id into v_submission_id;

  for v_elem, v_ord in
    select value, ordinality::int
    from jsonb_array_elements(v_attendees) with ordinality
  loop
    v_att_name := nullif(trim(coalesce(v_elem->>'name', '')), '');
    v_dietary := nullif(trim(coalesce(v_elem->>'dietary_note', '')), '');

    if v_plated then
      v_meal_id := (nullif(trim(coalesce(v_elem->>'meal_option_id', '')), ''))::uuid;
    else
      -- No menu on offer (or plated misconfig) — never persist a client meal id.
      v_meal_id := null;
      if v_att_name is null and v_dietary is null then
        continue;
      end if;
    end if;

    insert into rsvp_attendees (
      project_id,
      submission_id,
      meal_option_id,
      name,
      dietary_note,
      sort_order
    ) values (
      v_project_id,
      v_submission_id,
      v_meal_id,
      v_att_name,
      v_dietary,
      v_ord - 1
    );
  end loop;

  return v_submission_id;
end;
$$;

revoke all on function submit_rsvp(text, text, text, text, text, int, jsonb) from public;
grant execute on function submit_rsvp(text, text, text, text, text, int, jsonb) to anon, authenticated;

-- ===== 0040_guest_members.sql =====

-- ============================================================
-- 0040_guest_members.sql
-- Per-person guest grain + RSVP→guest match (MEAL-03).
-- Backfills meal_choice into dietary_note; does NOT drop meal_choice
-- (0041 / MEAL-03a after live verification). No anon surfaces.
-- ============================================================

-- Composite FK target (redundant with PK(id); required for same-project FKs).
create unique index if not exists guests_project_id_key
  on guests (project_id, id);

create table if not exists guest_members (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null,
  guest_id        uuid not null,
  name            text,
  meal_option_id  uuid,
  dietary_note    text,
  attending       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),

  foreign key (project_id, guest_id)
    references guests (project_id, id)
    on delete cascade,

  -- Column-specific SET NULL (PG >= 15 / 0026 pattern).
  foreign key (project_id, meal_option_id)
    references meal_options (project_id, id)
    on delete set null (meal_option_id)
);

create index if not exists guest_members_guest_id_idx
  on guest_members (guest_id);

alter table guest_members enable row level security;

grant select, insert, update, delete on guest_members to authenticated;

-- READ: any project member.
drop policy if exists "members read guest members" on guest_members;
create policy "members read guest members" on guest_members
  for select to authenticated
  using (can_access_project(project_id));

-- WRITE: editors only (WRITE-01 day-one). Do not weaken to can_access_project.
drop policy if exists "editors insert guest members" on guest_members;
create policy "editors insert guest members" on guest_members
  for insert to authenticated
  with check (can_edit_project(project_id));

drop policy if exists "editors update guest members" on guest_members;
create policy "editors update guest members" on guest_members
  for update to authenticated
  using (can_edit_project(project_id))
  with check (can_edit_project(project_id));

drop policy if exists "editors delete guest members" on guest_members;
create policy "editors delete guest members" on guest_members
  for delete to authenticated
  using (can_edit_project(project_id));

-- Match pointer on RSVP submissions (couple confirmation only).
alter table rsvp_submissions
  add column if not exists matched_guest_id uuid;

alter table rsvp_submissions
  drop constraint if exists rsvp_submissions_matched_guest_fkey;

alter table rsvp_submissions
  add constraint rsvp_submissions_matched_guest_fkey
  foreign key (project_id, matched_guest_id)
  references guests (project_id, id)
  on delete set null (matched_guest_id);

-- Conservative backfill: preserve free-text meal_choice as dietary_note.
-- Do not map to meal_option_id. Do not fabricate members from party_size.
-- Idempotent via not-exists guard.
insert into guest_members (project_id, guest_id, name, dietary_note, attending)
select
  g.project_id,
  g.id,
  null,
  g.meal_choice,
  (g.rsvp_status = 'attending')
from guests g
where g.meal_choice is not null
  and not exists (
    select 1 from guest_members m where m.guest_id = g.id
  );

-- ===== 0041_rsvp_household_access.sql =====

-- ============================================================
-- 0041_rsvp_household_access.sql
-- RSVP-01: guest-gated RSVP (QR token + last-name lookup).
-- Anon surface #6: lookup_rsvp_household (token/label/cap only).
-- Extends submit_rsvp with trailing p_household_token.
-- NO anon SELECT on guests. Pointer-only matched_guest_id on gated submit.
-- Uses full_name (not name) — guests column from 0006.
-- ============================================================

-- Per-household QR token. Member-readable via existing can_access_project SELECT.
-- NO anon policy — lookup_rsvp_household is the only anon path that reads it.
alter table guests add column if not exists rsvp_token text;

-- Bare gen_random_bytes mirrors 0028's bare digest under search_path including extensions.
do $$
begin
  perform set_config('search_path', 'public, extensions', true);
  update guests
  set rsvp_token = encode(gen_random_bytes(16), 'hex')
  where rsvp_token is null;
end $$;

-- Column DEFAULT cannot rely on a function search_path; qualify extensions.
alter table guests
  alter column rsvp_token set default encode(extensions.gen_random_bytes(16), 'hex');

alter table guests alter column rsvp_token set not null;

create unique index if not exists guests_rsvp_token_key on guests (rsvp_token);

-- Access mode rides the existing published anon read (surface #1).
alter table wedding_websites
  add column if not exists rsvp_access_mode text not null default 'open';

alter table wedding_websites
  drop constraint if exists wedding_websites_rsvp_access_mode_check;

alter table wedding_websites
  add constraint wedding_websites_rsvp_access_mode_check
  check (rsvp_access_mode in ('open', 'gated'));

-- Anon surface #6: minimal household lookup. Returns ONLY {token, label, cap}.
create or replace function lookup_rsvp_household(
  p_slug text,
  p_token text default null,
  p_last_name text default null
)
returns table (
  household_token text,
  party_label text,
  party_size int
)
language sql
security definer
set search_path = public, extensions
as $$
  with site as (
    select project_id
    from wedding_websites
    where slug = p_slug
      and published = true
    limit 1
  )
  select
    g.rsvp_token,
    g.full_name,
    g.party_size
  from guests g
  join site s on s.project_id = g.project_id
  where case
    when nullif(btrim(coalesce(p_token, '')), '') is not null
      then g.rsvp_token = btrim(p_token)
    when length(btrim(coalesce(p_last_name, ''))) >= 2
      then lower(btrim(p_last_name)) = any (
        string_to_array(
          lower(regexp_replace(g.full_name, '[^a-zA-Z0-9 ]', ' ', 'g')),
          ' '
        )
      )
    else false
  end
  order by g.full_name
  limit 25;
$$;

revoke execute on function lookup_rsvp_household(text, text, text) from public;
grant execute on function lookup_rsvp_household(text, text, text) to anon, authenticated;

-- Drop old submit_rsvp signature (adding a param creates a new overload otherwise).
drop function if exists submit_rsvp(text, text, text, text, text, integer, jsonb);

create or replace function submit_rsvp(
  p_slug text,
  p_name text,
  p_response text,
  p_email text,
  p_message text,
  p_party_size int,
  p_attendees jsonb,
  p_household_token text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_project_id uuid;
  v_published boolean;
  v_style text;
  v_access_mode text;
  v_option_count int;
  v_plated boolean;
  v_submission_id uuid;
  v_party_size int;
  v_attendees jsonb;
  v_elem jsonb;
  v_ord int;
  v_att_name text;
  v_meal_raw text;
  v_meal_id uuid;
  v_dietary text;
  v_matched_guest_id uuid;
begin
  select
    w.project_id,
    w.published,
    coalesce(w.meal_service_style, 'none'),
    coalesce(w.rsvp_access_mode, 'open')
  into v_project_id, v_published, v_style, v_access_mode
  from wedding_websites w
  where w.slug = p_slug;

  if not found or v_published is distinct from true then
    raise exception 'rsvp_unavailable' using errcode = 'P0001';
  end if;

  v_matched_guest_id := null;

  if v_access_mode = 'gated' then
    if nullif(btrim(coalesce(p_household_token, '')), '') is null then
      raise exception 'household_required' using errcode = 'P0001';
    end if;

    select g.id
      into v_matched_guest_id
    from guests g
    where g.project_id = v_project_id
      and g.rsvp_token = btrim(p_household_token);

    if v_matched_guest_id is null then
      raise exception 'household_invalid' using errcode = 'P0001';
    end if;
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  if p_response is distinct from 'yes' and p_response is distinct from 'no' then
    raise exception 'invalid_response' using errcode = 'P0001';
  end if;

  select count(*)::int into v_option_count
  from meal_options
  where project_id = v_project_id;

  v_plated := (v_style = 'plated' and v_option_count > 0);

  if p_attendees is null or jsonb_typeof(p_attendees) is distinct from 'array' then
    v_attendees := '[]'::jsonb;
  else
    v_attendees := p_attendees;
  end if;

  -- Decline: one submission row, zero attendees.
  if p_response = 'no' then
    insert into rsvp_submissions (
      project_id, name, response, party_size, email, message, matched_guest_id
    ) values (
      v_project_id,
      trim(p_name),
      'no',
      1,
      nullif(trim(coalesce(p_email, '')), ''),
      nullif(trim(coalesce(p_message, '')), ''),
      v_matched_guest_id
    )
    returning id into v_submission_id;

    return v_submission_id;
  end if;

  -- Accepting.
  if v_plated then
    if jsonb_array_length(v_attendees) < 1 then
      raise exception 'attendees_required' using errcode = 'P0001';
    end if;

    for v_elem in select value from jsonb_array_elements(v_attendees)
    loop
      v_att_name := nullif(trim(coalesce(v_elem->>'name', '')), '');
      if v_att_name is null then
        raise exception 'attendee_name_required' using errcode = 'P0001';
      end if;

      v_meal_raw := nullif(trim(coalesce(v_elem->>'meal_option_id', '')), '');
      if v_meal_raw is null then
        raise exception 'meal_option_required' using errcode = 'P0001';
      end if;
    end loop;

    -- Derive headcount from attendee rows — ignore p_party_size.
    v_party_size := jsonb_array_length(v_attendees);
  else
    v_party_size := greatest(1, least(20, coalesce(p_party_size, 1)));
  end if;

  insert into rsvp_submissions (
    project_id, name, response, party_size, email, message, matched_guest_id
  ) values (
    v_project_id,
    trim(p_name),
    'yes',
    v_party_size,
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_message, '')), ''),
    v_matched_guest_id
  )
  returning id into v_submission_id;

  for v_elem, v_ord in
    select value, ordinality::int
    from jsonb_array_elements(v_attendees) with ordinality
  loop
    v_att_name := nullif(trim(coalesce(v_elem->>'name', '')), '');
    v_dietary := nullif(trim(coalesce(v_elem->>'dietary_note', '')), '');

    if v_plated then
      v_meal_id := (nullif(trim(coalesce(v_elem->>'meal_option_id', '')), ''))::uuid;
    else
      -- No menu on offer (or plated misconfig) — never persist a client meal id.
      v_meal_id := null;
      if v_att_name is null and v_dietary is null then
        continue;
      end if;
    end if;

    insert into rsvp_attendees (
      project_id,
      submission_id,
      meal_option_id,
      name,
      dietary_note,
      sort_order
    ) values (
      v_project_id,
      v_submission_id,
      v_meal_id,
      v_att_name,
      v_dietary,
      v_ord - 1
    );
  end loop;

  return v_submission_id;
end;
$$;

revoke all on function submit_rsvp(text, text, text, text, text, int, jsonb, text) from public;
grant execute on function submit_rsvp(text, text, text, text, text, int, jsonb, text) to anon, authenticated;

-- ===== 0042_website_media.sql =====

-- ============================================================
-- 0042_website_media.sql
-- WEB-IMG-01: public website-media bucket for wedding site photos
-- (hero, later gallery / party). Path first folder = project_id.
-- Public read by design (no published gate). Writes: can_edit_project.
-- Hand-paste only — never supabase db push.
-- ============================================================

-- 1) Public bucket, 25MB (same cap as project-files), images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'website-media', 'website-media', true, 26214400,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/heic'
  ]
)
on conflict (id) do nothing;

-- 2) Public read — recorded carve-out: no published gate.
drop policy if exists "website media publicly readable" on storage.objects;
create policy "website media publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'website-media');

-- 3) Writes gated on can_edit_project (WRITE-01; not can_access_project).
drop policy if exists "website media insertable by editors" on storage.objects;
create policy "website media insertable by editors"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'website-media'
    and public.can_edit_project(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "website media updatable by editors" on storage.objects;
create policy "website media updatable by editors"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'website-media'
    and public.can_edit_project(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'website-media'
    and public.can_edit_project(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "website media deletable by editors" on storage.objects;
create policy "website media deletable by editors"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'website-media'
    and public.can_edit_project(((storage.foldername(name))[1])::uuid)
  );

-- ===== 0043_rsvp_fullname_name_lookup.sql =====

-- ============================================================
-- 0043_rsvp_full_name_lookup.sql
-- Gated RSVP name search: match normalized full_name (not last-name token).
-- Same anon surface #6 shape: returns token / party_label / party_size only.
-- ============================================================

drop function if exists lookup_rsvp_household(text, text, text);

create or replace function lookup_rsvp_household(
  p_slug text,
  p_token text default null,
  p_full_name text default null
)
returns table (
  household_token text,
  party_label text,
  party_size int
)
language sql
security definer
set search_path = public, extensions
as $$
  with site as (
    select project_id
    from wedding_websites
    where slug = p_slug
      and published = true
    limit 1
  ),
  needle as (
    select lower(
      btrim(
        regexp_replace(
          regexp_replace(coalesce(p_full_name, ''), '[^a-zA-Z0-9 ]', ' ', 'g'),
          '\s+',
          ' ',
          'g'
        )
      )
    ) as name
  )
  select
    g.rsvp_token,
    g.full_name,
    g.party_size
  from guests g
  join site s on s.project_id = g.project_id
  cross join needle n
  where case
    when nullif(btrim(coalesce(p_token, '')), '') is not null
      then g.rsvp_token = btrim(p_token)
    when length(n.name) >= 2
      then n.name = lower(
        btrim(
          regexp_replace(
            regexp_replace(coalesce(g.full_name, ''), '[^a-zA-Z0-9 ]', ' ', 'g'),
            '\s+',
            ' ',
            'g'
          )
        )
      )
    else false
  end
  order by g.full_name
  limit 25;
$$;

revoke execute on function lookup_rsvp_household(text, text, text) from public;
grant execute on function lookup_rsvp_household(text, text, text) to anon, authenticated;

-- ===== 0044_project_archive.sql =====

-- ============================================================
-- 0044_project_archive.sql
-- Planners archive finished weddings off the active book.
-- Sole writer: set_project_archived (security definer).
-- Gate: can_manage_project_access (owning account members only).
-- ============================================================

alter table projects
  add column if not exists archived_at timestamptz;

create or replace function set_project_archived(
  p_project_id uuid,
  p_archived   boolean
) returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_archived_at timestamptz;
begin
  if not can_manage_project_access(p_project_id) then
    raise exception 'Not authorized to archive this project.' using errcode = '42501';
  end if;

  update projects
     set archived_at = case
                         when p_archived then coalesce(archived_at, now())
                         else null
                       end
   where id = p_project_id
   returning archived_at into v_archived_at;

  return v_archived_at;
end;
$$;

grant execute on function set_project_archived(uuid, boolean) to authenticated;
revoke execute on function set_project_archived(uuid, boolean) from anon;

-- ===== 0045_calendar_events.sql =====

-- ============================================================
-- 0045_calendar_events.sql
-- Account-scoped planner calendar events (CAL-01).
-- Composite FK keeps project links same-account; column-specific
-- SET NULL (project_id) so delete does not touch NOT NULL account_id.
-- ============================================================

-- Enabling unique for the composite FK target (0026 pattern). id is PK, so this is trivially unique.
create unique index if not exists projects_account_id_id_key on projects (account_id, id);

create table if not exists calendar_events (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  project_id  uuid,                 -- optional link to one of THIS account's weddings
  title       text not null,
  event_kind  text not null default 'meeting'
              check (event_kind in ('meeting','call','site_visit','tasting','fitting','deadline','other')),
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  all_day     boolean not null default false,
  location    text,
  notes       text,
  created_at  timestamptz not null default now()
);

-- Composite FK: an event can only link to a project in its OWN account.
-- Column-specific SET NULL (project_id) is MANDATORY — a bare SET NULL would try to null the
-- NOT NULL account_id (0026 lesson).
alter table calendar_events drop constraint if exists calendar_events_project_fkey;
alter table calendar_events add constraint calendar_events_project_fkey
  foreign key (account_id, project_id) references projects (account_id, id)
  on delete set null (project_id);

create index if not exists calendar_events_account_starts_idx on calendar_events (account_id, starts_at);

alter table calendar_events enable row level security;
drop policy if exists "calendar events managed by account members" on calendar_events;
create policy "calendar events managed by account members" on calendar_events
  for all to authenticated
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- ===== 0046_file_category.sql =====

-- ============================================================
-- 0046_file_category.sql
-- Optional vendor-category id on files (meaningful for kind='contract').
-- Mirrors vendors.category: text, no DB CHECK — validated in-app to
-- VENDOR_CATEGORIES ids. NULL = uncategorized.
-- UPDATE already covered by "files writable by project members" FOR ALL
-- (can_access_project) from 0011 — do not add a second write policy.
-- ============================================================

alter table files add column if not exists category text;

-- ===== 0047_contract_templates.sql =====

-- ============================================================
-- 0047_contract_templates.sql
-- Account-scoped planner contract templates (CON-02).
-- category mirrors vendors.category / files.category: text, no DB CHECK.
-- ============================================================

create table if not exists contract_templates (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  name        text not null,
  body        text not null default '',
  category    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists contract_templates_account_idx on contract_templates (account_id);

alter table contract_templates enable row level security;
drop policy if exists "contract templates managed by account members" on contract_templates;
create policy "contract templates managed by account members" on contract_templates
  for all to authenticated
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- ===== 0048_budget_label_optional.sql =====

-- ============================================================
-- 0048_budget_label_optional.sql
-- BUD-05: budget_items.label is optional (Vendor Name before booking).
-- Re-runnable. Drops NOT NULL only — no CHECK, no default, no data change.
-- category and project_vendor_id untouched.
-- ============================================================

alter table budget_items alter column label drop not null;

-- ===== 0049_budget_alert_dismissals.sql =====

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

-- ===== 0050_registry_teardown.sql =====

-- ============================================================
-- 0050_registry_teardown.sql
-- REG-06: drop native gift registry (items + claims).
-- External registry links (0035 column) are DELIBERATELY KEPT — they
-- now live on the website editor/render (REG-05). Do NOT reverse 0035's
-- column or its rider to the published wedding_websites read (0022).
-- 0037 backfill needs no reversal (data lives in the kept column).
-- Re-runnable. Drops claims BEFORE items (FK order).
-- ============================================================

-- Availability RPC references registry_claims; drop before the tables.
drop function if exists registry_item_availability(uuid);

drop table if exists registry_claims;
drop table if exists registry_items;

-- ===== 0051_budget_payments.sql =====

-- ============================================================
-- 0051_budget_payments.sql
-- BUD-03: per-item due_date + project-scoped payment ledger.
-- Additive / re-runnable. Paste by hand — do not db push.
-- actual_amount is NOT renamed (now means Actual/cost; Paid = ledger).
-- NO backfill. NO contracted_amount.
-- WRITE-01: budget_payments writes gate on can_access_project — sharp edge.
-- ============================================================

-- Due date: "due in full to vendor" (date only — no timestamp).
alter table budget_items
  add column if not exists due_date date;

-- Composite FK target for budget_payments (PK alone is not enough).
create unique index if not exists budget_items_project_id_id_key
  on budget_items (project_id, id);

create table if not exists budget_payments (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  budget_item_id  uuid not null,
  amount          numeric(12,2) not null,
  paid_on         date,
  note            text,
  created_at      timestamptz not null default now(),
  constraint budget_payments_item_fkey
    foreign key (project_id, budget_item_id)
    references budget_items (project_id, id)
    on delete cascade
);

create index if not exists budget_payments_budget_item_id_idx
  on budget_payments (budget_item_id);

create index if not exists budget_payments_project_id_idx
  on budget_payments (project_id);

alter table budget_payments enable row level security;

drop policy if exists "budget_payments writable by project members" on budget_payments;
create policy "budget_payments writable by project members"
  on budget_payments for all to authenticated
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

-- ===== 0052_payment_schedule.sql =====

-- ============================================================
-- 0052_payment_schedule.sql
-- BUD-SCHED-01: dated installments per budget item (owed timeline).
-- Additive / re-runnable. Does NOT drop budget_items.due_date.
-- Backfill: existing due_date → one "Balance" installment (once).
-- WRITE-01: can_access_project gate — sharp edge for future viewer.
-- ============================================================

create table if not exists payment_schedule (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null,
  budget_item_id uuid not null,
  amount         numeric(12,2) not null,
  due_on         date not null,
  label          text,
  created_at     timestamptz not null default now()
);

alter table payment_schedule drop constraint if exists payment_schedule_item_fkey;
alter table payment_schedule add constraint payment_schedule_item_fkey
  foreign key (project_id, budget_item_id) references budget_items (project_id, id)
  on delete cascade;

create index if not exists payment_schedule_item_idx on payment_schedule (budget_item_id);
create index if not exists payment_schedule_project_idx on payment_schedule (project_id);
create index if not exists payment_schedule_due_idx on payment_schedule (project_id, due_on);

alter table payment_schedule enable row level security;

drop policy if exists "payment schedule accessible by project members" on payment_schedule;
create policy "payment schedule accessible by project members" on payment_schedule
  for all to authenticated
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

-- Backfill: each existing due_date → one "Balance" installment. No-op on re-run
-- (skips if any schedule row already exists).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'budget_items'
      and column_name = 'due_date'
  )
  and not exists (select 1 from payment_schedule) then
    insert into payment_schedule (project_id, budget_item_id, amount, due_on, label)
    select project_id, id, coalesce(actual_amount, 0), due_date, 'Balance'
    from budget_items
    where due_date is not null;
  end if;
end $$;

-- ===== 0053_files_vendor_link.sql =====

-- ============================================================
-- 0053_files_vendor_link.sql
-- Link a project file (typically kind='contract') to a
-- project_vendors involvement row so contracts show on the
-- booked-vendor object and the Contracts archive.
-- Composite FK keeps the link same-project (0026 pattern).
-- ON DELETE SET NULL (project_vendor_id) — removing a vendor
-- link never deletes the file row.
-- RLS: existing FOR ALL can_access_project on files (0011) —
-- no new policy.
-- ============================================================

alter table files
  add column if not exists project_vendor_id uuid;

alter table files
  drop constraint if exists files_project_vendor_fkey;

alter table files
  add constraint files_project_vendor_fkey
  foreign key (project_id, project_vendor_id)
  references project_vendors (project_id, id)
  on delete set null (project_vendor_id);

create index if not exists files_project_vendor_id_idx
  on files (project_vendor_id)
  where project_vendor_id is not null;

-- ===== 0054_rsvp_gated_only.sql =====

-- ============================================================
-- 0054_rsvp_gated_only.sql
-- GST-04: RSVP is gated-only. submit_rsvp always requires a
-- household token (no open/anonymous branch). Column
-- wedding_websites.rsvp_access_mode left as-is (default/CHECK
-- unchanged); enforcement is in this RPC + app UI.
-- lookup_rsvp_household unchanged.
-- ============================================================

create or replace function submit_rsvp(
  p_slug text,
  p_name text,
  p_response text,
  p_email text,
  p_message text,
  p_party_size int,
  p_attendees jsonb,
  p_household_token text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_project_id uuid;
  v_published boolean;
  v_style text;
  v_option_count int;
  v_plated boolean;
  v_submission_id uuid;
  v_party_size int;
  v_attendees jsonb;
  v_elem jsonb;
  v_ord int;
  v_att_name text;
  v_meal_raw text;
  v_meal_id uuid;
  v_dietary text;
  v_matched_guest_id uuid;
begin
  select
    w.project_id,
    w.published,
    coalesce(w.meal_service_style, 'none')
  into v_project_id, v_published, v_style
  from wedding_websites w
  where w.slug = p_slug;

  if not found or v_published is distinct from true then
    raise exception 'rsvp_unavailable' using errcode = 'P0001';
  end if;

  -- Always gated: every submission must be household-token-bound.
  if nullif(btrim(coalesce(p_household_token, '')), '') is null then
    raise exception 'household_required' using errcode = 'P0001';
  end if;

  select g.id
    into v_matched_guest_id
  from guests g
  where g.project_id = v_project_id
    and g.rsvp_token = btrim(p_household_token);

  if v_matched_guest_id is null then
    raise exception 'household_invalid' using errcode = 'P0001';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  if p_response is distinct from 'yes' and p_response is distinct from 'no' then
    raise exception 'invalid_response' using errcode = 'P0001';
  end if;

  select count(*)::int into v_option_count
  from meal_options
  where project_id = v_project_id;

  v_plated := (v_style = 'plated' and v_option_count > 0);

  if p_attendees is null or jsonb_typeof(p_attendees) is distinct from 'array' then
    v_attendees := '[]'::jsonb;
  else
    v_attendees := p_attendees;
  end if;

  -- Decline: one submission row, zero attendees.
  if p_response = 'no' then
    insert into rsvp_submissions (
      project_id, name, response, party_size, email, message, matched_guest_id
    ) values (
      v_project_id,
      trim(p_name),
      'no',
      1,
      nullif(trim(coalesce(p_email, '')), ''),
      nullif(trim(coalesce(p_message, '')), ''),
      v_matched_guest_id
    )
    returning id into v_submission_id;

    return v_submission_id;
  end if;

  -- Accepting.
  if v_plated then
    if jsonb_array_length(v_attendees) < 1 then
      raise exception 'attendees_required' using errcode = 'P0001';
    end if;

    for v_elem in select value from jsonb_array_elements(v_attendees)
    loop
      v_att_name := nullif(trim(coalesce(v_elem->>'name', '')), '');
      if v_att_name is null then
        raise exception 'attendee_name_required' using errcode = 'P0001';
      end if;

      v_meal_raw := nullif(trim(coalesce(v_elem->>'meal_option_id', '')), '');
      if v_meal_raw is null then
        raise exception 'meal_option_required' using errcode = 'P0001';
      end if;
    end loop;

    -- Derive headcount from attendee rows — ignore p_party_size.
    v_party_size := jsonb_array_length(v_attendees);
  else
    v_party_size := greatest(1, least(20, coalesce(p_party_size, 1)));
  end if;

  insert into rsvp_submissions (
    project_id, name, response, party_size, email, message, matched_guest_id
  ) values (
    v_project_id,
    trim(p_name),
    'yes',
    v_party_size,
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_message, '')), ''),
    v_matched_guest_id
  )
  returning id into v_submission_id;

  for v_elem, v_ord in
    select value, ordinality::int
    from jsonb_array_elements(v_attendees) with ordinality
  loop
    v_att_name := nullif(trim(coalesce(v_elem->>'name', '')), '');
    v_dietary := nullif(trim(coalesce(v_elem->>'dietary_note', '')), '');

    if v_plated then
      v_meal_id := (nullif(trim(coalesce(v_elem->>'meal_option_id', '')), ''))::uuid;
    else
      -- No menu on offer (or plated misconfig) — never persist a client meal id.
      v_meal_id := null;
      if v_att_name is null and v_dietary is null then
        continue;
      end if;
    end if;

    insert into rsvp_attendees (
      project_id,
      submission_id,
      meal_option_id,
      name,
      dietary_note,
      sort_order
    ) values (
      v_project_id,
      v_submission_id,
      v_meal_id,
      v_att_name,
      v_dietary,
      v_ord - 1
    );
  end loop;

  return v_submission_id;
end;
$$;

revoke all on function submit_rsvp(text, text, text, text, text, int, jsonb, text) from public;
grant execute on function submit_rsvp(text, text, text, text, text, int, jsonb, text) to anon, authenticated;

-- ===== 0055_guest_members_backfill.sql =====

-- ============================================================
-- 0055_guest_members_backfill.sql
-- GST-06: DATA ONLY. One guest_members row for every guests
-- household that has zero members, so the person-grain Guests
-- list has a writable line for each legacy household.
-- Idempotent: NOT EXISTS guard — re-paste inserts 0 rows.
-- Does NOT alter columns; does NOT drop party_size / meal_choice.
-- ============================================================

insert into guest_members (
  project_id,
  guest_id,
  name,
  meal_option_id,
  dietary_note,
  attending,
  sort_order
)
select
  g.project_id,
  g.id,
  g.full_name,
  null,
  null,
  (g.rsvp_status = 'attending'),
  0
from guests g
where not exists (
  select 1
  from guest_members m
  where m.guest_id = g.id
);

-- ===== 0056_guest_member_relationship.sql =====

-- ============================================================
-- 0056_guest_member_relationship.sql
-- GST-07: household mailing address + per-person relationship
-- (side token + curated picklist value). Additive only.
-- Does NOT drop email / party_size / meal_choice.
-- Idempotent: re-paste is a no-op.
-- ============================================================

alter table guests
  add column if not exists address text;

alter table guest_members
  add column if not exists relationship_side text;

alter table guest_members
  drop constraint if exists guest_members_relationship_side_check;

alter table guest_members
  add constraint guest_members_relationship_side_check
  check (relationship_side in ('partner_1', 'partner_2'));

alter table guest_members
  add column if not exists relationship text;

-- ===== 0057_song_requests.sql =====

-- ============================================================
-- 0057_song_requests.sql
-- GST-08 (4b): event-level song_requests_enabled on
-- wedding_websites + per-attendee song_request on rsvp_attendees.
-- Additive. No policy change (rides published anon whole-row
-- read on wedding_websites + submit_rsvp insert path).
-- Replaces submit_rsvp to persist song when enabled and to keep
-- non-plated song-only rows (name OR dietary OR song).
-- Idempotent: re-paste is a no-op for columns; RPC is replaced.
-- ============================================================

alter table wedding_websites
  add column if not exists song_requests_enabled boolean not null default false;

alter table rsvp_attendees
  add column if not exists song_request text;

create or replace function submit_rsvp(
  p_slug text,
  p_name text,
  p_response text,
  p_email text,
  p_message text,
  p_party_size int,
  p_attendees jsonb,
  p_household_token text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_project_id uuid;
  v_published boolean;
  v_style text;
  v_songs_enabled boolean;
  v_option_count int;
  v_plated boolean;
  v_submission_id uuid;
  v_party_size int;
  v_attendees jsonb;
  v_elem jsonb;
  v_ord int;
  v_att_name text;
  v_meal_raw text;
  v_meal_id uuid;
  v_dietary text;
  v_song text;
  v_matched_guest_id uuid;
begin
  select
    w.project_id,
    w.published,
    coalesce(w.meal_service_style, 'none'),
    coalesce(w.song_requests_enabled, false)
  into v_project_id, v_published, v_style, v_songs_enabled
  from wedding_websites w
  where w.slug = p_slug;

  if not found or v_published is distinct from true then
    raise exception 'rsvp_unavailable' using errcode = 'P0001';
  end if;

  -- Always gated: every submission must be household-token-bound.
  if nullif(btrim(coalesce(p_household_token, '')), '') is null then
    raise exception 'household_required' using errcode = 'P0001';
  end if;

  select g.id
    into v_matched_guest_id
  from guests g
  where g.project_id = v_project_id
    and g.rsvp_token = btrim(p_household_token);

  if v_matched_guest_id is null then
    raise exception 'household_invalid' using errcode = 'P0001';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  if p_response is distinct from 'yes' and p_response is distinct from 'no' then
    raise exception 'invalid_response' using errcode = 'P0001';
  end if;

  select count(*)::int into v_option_count
  from meal_options
  where project_id = v_project_id;

  v_plated := (v_style = 'plated' and v_option_count > 0);

  if p_attendees is null or jsonb_typeof(p_attendees) is distinct from 'array' then
    v_attendees := '[]'::jsonb;
  else
    v_attendees := p_attendees;
  end if;

  -- Decline: one submission row, zero attendees.
  if p_response = 'no' then
    insert into rsvp_submissions (
      project_id, name, response, party_size, email, message, matched_guest_id
    ) values (
      v_project_id,
      trim(p_name),
      'no',
      1,
      nullif(trim(coalesce(p_email, '')), ''),
      nullif(trim(coalesce(p_message, '')), ''),
      v_matched_guest_id
    )
    returning id into v_submission_id;

    return v_submission_id;
  end if;

  -- Accepting.
  if v_plated then
    if jsonb_array_length(v_attendees) < 1 then
      raise exception 'attendees_required' using errcode = 'P0001';
    end if;

    for v_elem in select value from jsonb_array_elements(v_attendees)
    loop
      v_att_name := nullif(trim(coalesce(v_elem->>'name', '')), '');
      if v_att_name is null then
        raise exception 'attendee_name_required' using errcode = 'P0001';
      end if;

      v_meal_raw := nullif(trim(coalesce(v_elem->>'meal_option_id', '')), '');
      if v_meal_raw is null then
        raise exception 'meal_option_required' using errcode = 'P0001';
      end if;
    end loop;

    -- Derive headcount from attendee rows — ignore p_party_size.
    v_party_size := jsonb_array_length(v_attendees);
  else
    v_party_size := greatest(1, least(20, coalesce(p_party_size, 1)));
  end if;

  insert into rsvp_submissions (
    project_id, name, response, party_size, email, message, matched_guest_id
  ) values (
    v_project_id,
    trim(p_name),
    'yes',
    v_party_size,
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_message, '')), ''),
    v_matched_guest_id
  )
  returning id into v_submission_id;

  for v_elem, v_ord in
    select value, ordinality::int
    from jsonb_array_elements(v_attendees) with ordinality
  loop
    v_att_name := nullif(trim(coalesce(v_elem->>'name', '')), '');
    v_dietary := nullif(trim(coalesce(v_elem->>'dietary_note', '')), '');
    -- Server is source of truth: ignore client song text when toggle is off.
    if v_songs_enabled then
      v_song := nullif(trim(coalesce(v_elem->>'song_request', '')), '');
    else
      v_song := null;
    end if;

    if v_plated then
      v_meal_id := (nullif(trim(coalesce(v_elem->>'meal_option_id', '')), ''))::uuid;
    else
      -- No menu on offer (or plated misconfig) — never persist a client meal id.
      v_meal_id := null;
      if v_att_name is null and v_dietary is null and v_song is null then
        continue;
      end if;
    end if;

    insert into rsvp_attendees (
      project_id,
      submission_id,
      meal_option_id,
      name,
      dietary_note,
      song_request,
      sort_order
    ) values (
      v_project_id,
      v_submission_id,
      v_meal_id,
      v_att_name,
      v_dietary,
      v_song,
      v_ord - 1
    );
  end loop;

  return v_submission_id;
end;
$$;

revoke all on function submit_rsvp(text, text, text, text, text, int, jsonb, text) from public;
grant execute on function submit_rsvp(text, text, text, text, text, int, jsonb, text) to anon, authenticated;

-- ===== 0058_rsvp_autopopulate.sql =====

-- ============================================================
-- 0058_rsvp_autopopulate.sql
-- GST-09 (#10): Option A — auto-set guests.rsvp_status on gated
-- submit_rsvp (token-bound household only). Preserves ALL 0057
-- behavior (gated enforcement, plated meals, songs, continue
-- guard). Adds ONLY the badge UPDATE after match+response
-- validation, same transaction as the submission insert.
-- Does NOT touch guest_members.attending. No new column/policy.
-- Idempotent: create or replace.
-- ============================================================

create or replace function submit_rsvp(
  p_slug text,
  p_name text,
  p_response text,
  p_email text,
  p_message text,
  p_party_size int,
  p_attendees jsonb,
  p_household_token text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_project_id uuid;
  v_published boolean;
  v_style text;
  v_songs_enabled boolean;
  v_option_count int;
  v_plated boolean;
  v_submission_id uuid;
  v_party_size int;
  v_attendees jsonb;
  v_elem jsonb;
  v_ord int;
  v_att_name text;
  v_meal_raw text;
  v_meal_id uuid;
  v_dietary text;
  v_song text;
  v_matched_guest_id uuid;
begin
  select
    w.project_id,
    w.published,
    coalesce(w.meal_service_style, 'none'),
    coalesce(w.song_requests_enabled, false)
  into v_project_id, v_published, v_style, v_songs_enabled
  from wedding_websites w
  where w.slug = p_slug;

  if not found or v_published is distinct from true then
    raise exception 'rsvp_unavailable' using errcode = 'P0001';
  end if;

  -- Always gated: every submission must be household-token-bound.
  if nullif(btrim(coalesce(p_household_token, '')), '') is null then
    raise exception 'household_required' using errcode = 'P0001';
  end if;

  select g.id
    into v_matched_guest_id
  from guests g
  where g.project_id = v_project_id
    and g.rsvp_token = btrim(p_household_token);

  if v_matched_guest_id is null then
    raise exception 'household_invalid' using errcode = 'P0001';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  if p_response is distinct from 'yes' and p_response is distinct from 'no' then
    raise exception 'invalid_response' using errcode = 'P0001';
  end if;

  -- GST-09: write household badge to the token-resolved guest.
  -- Same transaction as the submission insert. Latest submit wins.
  update guests
  set rsvp_status = case
    when p_response = 'yes' then 'attending'
    else 'declined'
  end
  where id = v_matched_guest_id;

  select count(*)::int into v_option_count
  from meal_options
  where project_id = v_project_id;

  v_plated := (v_style = 'plated' and v_option_count > 0);

  if p_attendees is null or jsonb_typeof(p_attendees) is distinct from 'array' then
    v_attendees := '[]'::jsonb;
  else
    v_attendees := p_attendees;
  end if;

  -- Decline: one submission row, zero attendees.
  if p_response = 'no' then
    insert into rsvp_submissions (
      project_id, name, response, party_size, email, message, matched_guest_id
    ) values (
      v_project_id,
      trim(p_name),
      'no',
      1,
      nullif(trim(coalesce(p_email, '')), ''),
      nullif(trim(coalesce(p_message, '')), ''),
      v_matched_guest_id
    )
    returning id into v_submission_id;

    return v_submission_id;
  end if;

  -- Accepting.
  if v_plated then
    if jsonb_array_length(v_attendees) < 1 then
      raise exception 'attendees_required' using errcode = 'P0001';
    end if;

    for v_elem in select value from jsonb_array_elements(v_attendees)
    loop
      v_att_name := nullif(trim(coalesce(v_elem->>'name', '')), '');
      if v_att_name is null then
        raise exception 'attendee_name_required' using errcode = 'P0001';
      end if;

      v_meal_raw := nullif(trim(coalesce(v_elem->>'meal_option_id', '')), '');
      if v_meal_raw is null then
        raise exception 'meal_option_required' using errcode = 'P0001';
      end if;
    end loop;

    -- Derive headcount from attendee rows — ignore p_party_size.
    v_party_size := jsonb_array_length(v_attendees);
  else
    v_party_size := greatest(1, least(20, coalesce(p_party_size, 1)));
  end if;

  insert into rsvp_submissions (
    project_id, name, response, party_size, email, message, matched_guest_id
  ) values (
    v_project_id,
    trim(p_name),
    'yes',
    v_party_size,
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_message, '')), ''),
    v_matched_guest_id
  )
  returning id into v_submission_id;

  for v_elem, v_ord in
    select value, ordinality::int
    from jsonb_array_elements(v_attendees) with ordinality
  loop
    v_att_name := nullif(trim(coalesce(v_elem->>'name', '')), '');
    v_dietary := nullif(trim(coalesce(v_elem->>'dietary_note', '')), '');
    -- Server is source of truth: ignore client song text when toggle is off.
    if v_songs_enabled then
      v_song := nullif(trim(coalesce(v_elem->>'song_request', '')), '');
    else
      v_song := null;
    end if;

    if v_plated then
      v_meal_id := (nullif(trim(coalesce(v_elem->>'meal_option_id', '')), ''))::uuid;
    else
      -- No menu on offer (or plated misconfig) — never persist a client meal id.
      v_meal_id := null;
      if v_att_name is null and v_dietary is null and v_song is null then
        continue;
      end if;
    end if;

    insert into rsvp_attendees (
      project_id,
      submission_id,
      meal_option_id,
      name,
      dietary_note,
      song_request,
      sort_order
    ) values (
      v_project_id,
      v_submission_id,
      v_meal_id,
      v_att_name,
      v_dietary,
      v_song,
      v_ord - 1
    );
  end loop;

  return v_submission_id;
end;
$$;

revoke all on function submit_rsvp(text, text, text, text, text, int, jsonb, text) from public;
grant execute on function submit_rsvp(text, text, text, text, text, int, jsonb, text) to anon, authenticated;

-- ===== 0059_seating_member_grain.sql =====

-- 0059_seating_member_grain.sql — per-person seating grain.
-- Idempotent: no-ops on the already-migrated dev DB; runs from household grain on fresh prod.

-- 0. FK target — add only if absent (an FK may already depend on it; never drop it)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'guest_members_project_id_id_key') then
    alter table guest_members add constraint guest_members_project_id_id_key unique (project_id, id);
  end if;
end $$;

-- 1. member-grain column + composite FK (0026 pattern)
alter table seating_assignments add column if not exists guest_member_id uuid;
alter table seating_assignments drop constraint if exists seating_assignments_member_fk;
alter table seating_assignments add constraint seating_assignments_member_fk
  foreign key (project_id, guest_member_id)
  references guest_members (project_id, id) on delete cascade;

-- 2. drop household-grain unique before backfill
alter table seating_assignments
  drop constraint if exists seating_assignments_project_id_guest_id_key;

-- 3a. map each existing row to its first member (correlated subquery — the 42P10 fix)
update seating_assignments sa
set guest_member_id = (
  select gm.id from guest_members gm
  where gm.project_id = sa.project_id and gm.guest_id = sa.guest_id
  order by gm.sort_order, gm.created_at limit 1
)
where sa.guest_member_id is null;

-- 3b. insert remaining members of each seated household (idempotent)
insert into seating_assignments (project_id, table_id, guest_id, guest_member_id, seat_index)
select sa.project_id, sa.table_id, sa.guest_id, gm.id, null
from seating_assignments sa
join guest_members gm on gm.project_id = sa.project_id and gm.guest_id = sa.guest_id
where sa.guest_member_id is not null
  and gm.id <> sa.guest_member_id
  and not exists (
    select 1 from seating_assignments x
    where x.project_id = sa.project_id and x.guest_member_id = gm.id
  );

-- 4. member-grain unique (one seat per person)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'seating_assignments_project_id_guest_member_id_key') then
    alter table seating_assignments
      add constraint seating_assignments_project_id_guest_member_id_key unique (project_id, guest_member_id);
  end if;
end $$;

-- 5. guest_id write-dead
alter table seating_assignments alter column guest_id drop not null;

COMMIT;
