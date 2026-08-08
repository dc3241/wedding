-- ============================================================
-- 0066_user_tours.sql
-- TOUR-01: user-scoped page-tour dismissal state.
-- Composite PK (user_id, tour_key). No CHECK on tour_key —
-- new keys ship with in-code tour config, not migrations.
-- Re-runnable.
-- ============================================================

create table if not exists user_tours (
  user_id      uuid not null references auth.users(id) on delete cascade,
  tour_key     text not null,
  status       text not null check (status in ('completed', 'skipped')),
  dismissed_at timestamptz not null default now(),
  primary key (user_id, tour_key)
);

alter table user_tours enable row level security;

drop policy if exists "user tours own rows" on user_tours;
create policy "user tours own rows" on user_tours
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
