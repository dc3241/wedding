-- PLANNER-HELP-01 — paid sessions with a real planner (couples).
--
-- Couples buy credits (single quick 30-min, single full 60-min, 3-pack,
-- final-stretch 4-pack, or a monthly plan that grants 2 full credits per paid
-- invoice). They spend a credit by requesting a session; an admin (Dom /
-- Jordyn) schedules it, runs the Zoom call, then marks it completed with a
-- recap.
--
-- Credits remaining is DERIVED at read (grants minus consuming sessions on
-- that grant) — same posture as budget Paid deriving from the ledger. No
-- stored balance column.
--
-- Writers:
--   planner_session_grants       — service role only (Stripe webhook +
--                                  Checkout-return reconcile). Idempotent on
--                                  stripe_ref (checkout session id / invoice id).
--   planner_sessions             — request_planner_session / cancel_planner_session
--                                  RPCs for couples; is_admin() for scheduling.
--   planner_support_subscriptions— service role only (webhook).
-- No anon surface. Admin tables follow the 0103 is_admin() posture.

-- ---------------------------------------------------------------------------
-- Credit grants (ledger)
-- ---------------------------------------------------------------------------
create table if not exists public.planner_session_grants (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  offer text not null,
  session_kind text not null,
  quantity integer not null,
  expires_at timestamptz not null,
  stripe_ref text not null,
  amount_cents integer,
  created_at timestamptz not null default now()
);

alter table public.planner_session_grants
  drop constraint if exists planner_session_grants_offer_check;
alter table public.planner_session_grants
  add constraint planner_session_grants_offer_check
  check (offer in ('quick', 'single', 'pack_3', 'final_stretch', 'monthly', 'comp'));

alter table public.planner_session_grants
  drop constraint if exists planner_session_grants_kind_check;
alter table public.planner_session_grants
  add constraint planner_session_grants_kind_check
  check (session_kind in ('quick', 'full'));

alter table public.planner_session_grants
  drop constraint if exists planner_session_grants_quantity_check;
alter table public.planner_session_grants
  add constraint planner_session_grants_quantity_check
  check (quantity between 1 and 20);

create unique index if not exists planner_session_grants_stripe_ref_key
  on public.planner_session_grants (stripe_ref);

create index if not exists planner_session_grants_account_idx
  on public.planner_session_grants (account_id, expires_at);

alter table public.planner_session_grants enable row level security;

drop policy if exists "members read own planner grants" on public.planner_session_grants;
create policy "members read own planner grants"
  on public.planner_session_grants for select to authenticated
  using (is_account_member(account_id));

drop policy if exists "admins read planner grants" on public.planner_session_grants;
create policy "admins read planner grants"
  on public.planner_session_grants for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Sessions (one row per requested call; consumes one credit of its grant)
-- ---------------------------------------------------------------------------
create table if not exists public.planner_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  grant_id uuid not null references public.planner_session_grants(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  requested_by uuid references auth.users(id) on delete set null,
  session_kind text not null,
  status text not null default 'requested',
  question text not null,
  preferred_times text,
  scheduled_at timestamptz,
  meeting_url text,
  recap text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.planner_sessions
  drop constraint if exists planner_sessions_kind_check;
alter table public.planner_sessions
  add constraint planner_sessions_kind_check
  check (session_kind in ('quick', 'full'));

alter table public.planner_sessions
  drop constraint if exists planner_sessions_status_check;
alter table public.planner_sessions
  add constraint planner_sessions_status_check
  check (status in ('requested', 'scheduled', 'completed', 'no_show', 'canceled'));

alter table public.planner_sessions
  drop constraint if exists planner_sessions_question_check;
alter table public.planner_sessions
  add constraint planner_sessions_question_check
  check (char_length(question) between 10 and 4000);

create index if not exists planner_sessions_account_idx
  on public.planner_sessions (account_id, created_at desc);
create index if not exists planner_sessions_grant_idx
  on public.planner_sessions (grant_id);
create index if not exists planner_sessions_status_idx
  on public.planner_sessions (status, scheduled_at);

alter table public.planner_sessions enable row level security;

-- Couples read their own sessions. Writes go through the RPCs below.
drop policy if exists "members read own planner sessions" on public.planner_sessions;
create policy "members read own planner sessions"
  on public.planner_sessions for select to authenticated
  using (is_account_member(account_id));

-- Admins schedule / complete / cancel.
drop policy if exists "admins manage planner sessions" on public.planner_sessions;
create policy "admins manage planner sessions"
  on public.planner_sessions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, update on table public.planner_sessions to authenticated;
grant select on table public.planner_session_grants to authenticated;

-- ---------------------------------------------------------------------------
-- Monthly support subscription mirror (separate from `subscriptions`, which is
-- one row per account and owns assistant entitlement — a support plan must
-- never overwrite it).
-- ---------------------------------------------------------------------------
create table if not exists public.planner_support_subscriptions (
  stripe_subscription_id text primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists planner_support_subscriptions_account_idx
  on public.planner_support_subscriptions (account_id);

alter table public.planner_support_subscriptions enable row level security;

drop policy if exists "members read own planner support" on public.planner_support_subscriptions;
create policy "members read own planner support"
  on public.planner_support_subscriptions for select to authenticated
  using (is_account_member(account_id));

drop policy if exists "admins read planner support" on public.planner_support_subscriptions;
create policy "admins read planner support"
  on public.planner_support_subscriptions for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- request_planner_session — atomically spend one credit.
-- Picks the matching-kind grant that expires soonest and still has room.
-- ---------------------------------------------------------------------------
create or replace function public.request_planner_session(
  p_account_id uuid,
  p_session_kind text,
  p_question text,
  p_preferred_times text default null,
  p_project_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grant_id uuid;
  v_session_id uuid;
begin
  if auth.uid() is null or not is_account_member(p_account_id) then
    raise exception 'not_authorized';
  end if;

  if p_session_kind not in ('quick', 'full') then
    raise exception 'invalid_session_kind';
  end if;

  if p_question is null or char_length(btrim(p_question)) < 10 then
    raise exception 'question_too_short';
  end if;

  if p_project_id is not null and not exists (
    select 1 from projects
    where id = p_project_id and account_id = p_account_id
  ) then
    raise exception 'invalid_project';
  end if;

  -- Serialize concurrent requests for the same account.
  perform 1 from accounts where id = p_account_id for update;

  select g.id into v_grant_id
  from planner_session_grants g
  where g.account_id = p_account_id
    and g.session_kind = p_session_kind
    and g.expires_at > now()
    and g.quantity > (
      select count(*) from planner_sessions s
      where s.grant_id = g.id and s.status <> 'canceled'
    )
  order by g.expires_at asc, g.created_at asc
  limit 1;

  if v_grant_id is null then
    raise exception 'no_credits';
  end if;

  insert into planner_sessions (
    account_id, grant_id, project_id, requested_by,
    session_kind, question, preferred_times
  ) values (
    p_account_id, v_grant_id, p_project_id, auth.uid(),
    p_session_kind, btrim(p_question), nullif(btrim(coalesce(p_preferred_times, '')), '')
  )
  returning id into v_session_id;

  return v_session_id;
end;
$$;

revoke all on function public.request_planner_session(uuid, text, text, text, uuid) from public;
grant execute on function public.request_planner_session(uuid, text, text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- cancel_planner_session — couple cancels; credit returns to its grant.
-- Requested: any time. Scheduled: only with 24h+ notice.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_planner_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row planner_sessions%rowtype;
begin
  select * into v_row from planner_sessions where id = p_session_id for update;

  if not found or auth.uid() is null or not is_account_member(v_row.account_id) then
    raise exception 'not_authorized';
  end if;

  if v_row.status = 'requested' then
    null;
  elsif v_row.status = 'scheduled'
    and v_row.scheduled_at is not null
    and v_row.scheduled_at > now() + interval '24 hours' then
    null;
  else
    raise exception 'cannot_cancel';
  end if;

  update planner_sessions
     set status = 'canceled', updated_at = now()
   where id = p_session_id;
end;
$$;

revoke all on function public.cancel_planner_session(uuid) from public;
grant execute on function public.cancel_planner_session(uuid) to authenticated;

-- Supabase grants EXECUTE to anon by default; these are authenticated-only.
revoke execute on function public.request_planner_session(uuid, text, text, text, uuid) from anon;
revoke execute on function public.cancel_planner_session(uuid) from anon;
