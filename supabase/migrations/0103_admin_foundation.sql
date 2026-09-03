-- ============================================================
-- 0103_admin_foundation.sql
-- ADMIN-00: internal admin dashboard at /admin — Dom + Jordyn only,
-- social media marketing ops (replaces the content-tracking Google
-- Sheet + a separate Cowork scheduled task). Not couples/planner-facing.
--
-- admin_roles is a flat, orthogonal role: a user_id already sitting in
-- account_members (a real couple/planner/venue account) can ALSO carry
-- an admin_roles row. The two are unrelated — is_admin() never touches
-- accounts / account_members, and getAccountContext() never touches
-- admin_roles. One role only ("admin") — no granular permissions, per
-- product decision; revisit if/when hires are added.
--
-- is_admin() takes no argument (unlike is_account_member(account_id) —
-- there is no per-row account to scope against here, just "is the
-- calling user an admin at all"). SECURITY DEFINER avoids RLS
-- recursion when called inside every admin-table policy below, same
-- reasoning as 0003's is_account_member.
--
-- Every admin table is gated by a single FOR ALL is_admin() policy —
-- flat role, so read and write share one gate. No anon policy on any
-- of these tables, ever.
--
-- Access control at the route level (app/(admin)/admin/layout.tsx)
-- calls is_admin() server-side and returns notFound() for a real,
-- authenticated non-admin user — a couple/planner account hitting
-- /admin must not be able to tell the route exists.
-- ============================================================

create table if not exists admin_roles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'admin',
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  constraint admin_roles_role_check check (role in ('admin'))
);

alter table admin_roles enable row level security;
-- No anon/authenticated policies at all — service_role only (same
-- posture as demo_start_attempts / agent_run_log). A user must never
-- be able to read or write the admin roster through PostgREST; the
-- app layer resolves "am I admin" via the is_admin() RPC below, not
-- a table read.

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from admin_roles ar where ar.user_id = auth.uid()
  );
$$;

grant execute on function is_admin() to authenticated;

-- ------------------------------------------------------------
-- Content bank — one row per platform idea. Bank tabs: TikTok
-- (type + script), Instagram/Facebook (format + content), Pinterest
-- (pin title + pin description), LinkedIn (format + post copy),
-- YouTube (empty — channel not live yet, still a valid platform).
-- type A/B/C/D only applies to TikTok rows in the source Sheet, but
-- is left nullable/available on every platform rather than split out
-- — simplest shape, matches "one concept, one column" instead of a
-- second sparse table.
-- ------------------------------------------------------------
create table if not exists content_bank_items (
  id           uuid primary key default gen_random_uuid(),
  platform     text not null,
  idea         text not null,
  type         text,
  format       text,
  title        text,
  body         text not null,
  notes        text,
  created_by   uuid references auth.users (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint content_bank_items_platform_check
    check (platform in ('tiktok', 'instagram', 'facebook', 'pinterest', 'linkedin', 'youtube')),
  constraint content_bank_items_type_check
    check (type is null or type in ('A', 'B', 'C', 'D'))
);

create index if not exists content_bank_items_platform_idx
  on content_bank_items (platform, created_at desc);

alter table content_bank_items enable row level security;

drop policy if exists "admin manages content bank" on content_bank_items;
create policy "admin manages content bank"
  on content_bank_items for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ------------------------------------------------------------
-- Schedule — one week per row, days nested under it, one performance
-- row per week. Matches the Sheet's month tabs (Mon–Sun week blocks).
-- platforms is jsonb ({tiktok: 'pending'|'done'|'off', ...}) rather
-- than nine columns — small fixed platform set, easy to port from
-- the mockup's identical shape, and a new platform is a code change
-- either way (PLATFORM_COLS), not a schema one.
-- ------------------------------------------------------------
create table if not exists schedule_weeks (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  start_date  date not null,
  end_date    date not null,
  created_at  timestamptz not null default now()
);

create unique index if not exists schedule_weeks_start_date_key
  on schedule_weeks (start_date);

alter table schedule_weeks enable row level security;

drop policy if exists "admin manages schedule weeks" on schedule_weeks;
create policy "admin manages schedule weeks"
  on schedule_weeks for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create table if not exists schedule_days (
  id             uuid primary key default gen_random_uuid(),
  week_id        uuid not null references schedule_weeks (id) on delete cascade,
  date           date not null,
  platforms      jsonb not null default '{}'::jsonb,
  notes_couples  text,
  notes_planner  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index if not exists schedule_days_week_date_key
  on schedule_days (week_id, date);

alter table schedule_days enable row level security;

drop policy if exists "admin manages schedule days" on schedule_days;
create policy "admin manages schedule days"
  on schedule_days for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create table if not exists schedule_performance (
  id             uuid primary key default gen_random_uuid(),
  week_id        uuid not null references schedule_weeks (id) on delete cascade,
  views          text,
  follower_growth text,
  dms            text,
  signups        text,
  notes          text,
  updated_at     timestamptz not null default now()
);

create unique index if not exists schedule_performance_week_key
  on schedule_performance (week_id);

alter table schedule_performance enable row level security;

drop policy if exists "admin manages schedule performance" on schedule_performance;
create policy "admin manages schedule performance"
  on schedule_performance for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ------------------------------------------------------------
-- Automations — reusable prompt templates (Prompts tab) + a run log.
-- Manual trigger only for this build (a button); recurring cron is a
-- fast-follow, not required for v1. output_text / status /
-- saved_to_bank let the UI show a run's result and whether it was
-- filed into content_bank_items.
-- ------------------------------------------------------------
create table if not exists admin_automation_prompts (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  description        text,
  prompt_template    text not null,
  is_manual_trigger  boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table admin_automation_prompts enable row level security;

drop policy if exists "admin manages automation prompts" on admin_automation_prompts;
create policy "admin manages automation prompts"
  on admin_automation_prompts for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create table if not exists admin_automation_runs (
  id             uuid primary key default gen_random_uuid(),
  prompt_id      uuid references admin_automation_prompts (id) on delete set null,
  triggered_by   uuid references auth.users (id),
  input_text     text,
  output_text    text,
  status         text not null default 'pending',
  error_message  text,
  saved_to_bank  boolean not null default false,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz,
  constraint automation_runs_status_check
    check (status in ('pending', 'running', 'completed', 'error'))
);

create index if not exists automation_runs_prompt_created_idx
  on admin_automation_runs (prompt_id, created_at desc);

alter table admin_automation_runs enable row level security;

drop policy if exists "admin manages automation runs" on admin_automation_runs;
create policy "admin manages automation runs"
  on admin_automation_runs for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ------------------------------------------------------------
-- Media library — metadata only; bytes live in the private
-- `admin-media` Storage bucket (created alongside this migration).
-- Deleting a row's storage object is an app-layer responsibility
-- (server action removes the object, then the row) so storage never
-- outlives its metadata.
-- ------------------------------------------------------------
create table if not exists media_assets (
  id             uuid primary key default gen_random_uuid(),
  filename       text not null,
  storage_path   text not null,
  uploaded_by    uuid references auth.users (id),
  file_size      bigint,
  content_type   text,
  status         text not null default 'new',
  notes          text,
  created_at     timestamptz not null default now(),
  constraint media_assets_status_check
    check (status in ('new', 'in_progress', 'ready', 'posted'))
);

create unique index if not exists media_assets_storage_path_key
  on media_assets (storage_path);

create index if not exists media_assets_created_idx
  on media_assets (created_at desc);

alter table media_assets enable row level security;

drop policy if exists "admin manages media assets" on media_assets;
create policy "admin manages media assets"
  on media_assets for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ------------------------------------------------------------
-- Ideation — AI-brainstormed candidate ideas with a like/dislike +
-- comment feedback loop. Server route reads the best- and
-- worst-rated (with comments) prior rows as few-shot context before
-- generating more — preference-tuned prompting, not fine-tuning.
-- ------------------------------------------------------------
create table if not exists ideation_items (
  id            uuid primary key default gen_random_uuid(),
  idea_text     text not null,
  requested_by  uuid references auth.users (id),
  rating        text,
  comment       text,
  created_at    timestamptz not null default now(),
  constraint ideation_items_rating_check
    check (rating is null or rating in ('up', 'down'))
);

create index if not exists ideation_items_rating_idx
  on ideation_items (rating, created_at desc);

alter table ideation_items enable row level security;

drop policy if exists "admin manages ideation items" on ideation_items;
create policy "admin manages ideation items"
  on ideation_items for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ------------------------------------------------------------
-- Seed the two confirmed admin users (Dom, Jordyn). Safe to re-paste —
-- on conflict do nothing. If either user_id doesn't exist yet in
-- auth.users, that row is silently skipped rather than failing the
-- whole migration.
-- ------------------------------------------------------------
insert into admin_roles (user_id, role)
select u.id, 'admin'
from auth.users u
where u.email in ('d.ciccaglione@icloud.com', 'eventsbyjordyn@gmail.com')
on conflict (user_id) do nothing;
