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
