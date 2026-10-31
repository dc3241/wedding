-- ============================================================
-- 20261031000000_post_results.sql
-- Results the founders log on posts they approved and published
-- (views, likes, comments, shares, saves, a few notable comments,
-- and the live post URL). "Generate 10 ideas" reads the best and
-- worst performers per platform. Admin-only. Re-runnable.
-- Hand-paste only — never supabase db push.
-- ============================================================

create table if not exists post_results (
  id                uuid primary key default gen_random_uuid(),
  queue_id          uuid not null references content_queue (id) on delete cascade,
  platform          text not null,
  post_url          text,
  views             integer check (views is null or views >= 0),
  likes             integer check (likes is null or likes >= 0),
  comments          integer check (comments is null or comments >= 0),
  shares            integer check (shares is null or shares >= 0),
  saves             integer check (saves is null or saves >= 0),
  notable_comments  text,
  logged_by         uuid references auth.users (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists post_results_queue_key
  on post_results (queue_id);

create index if not exists post_results_platform_idx
  on post_results (platform, updated_at desc);

alter table post_results enable row level security;

drop policy if exists "admin manages post results" on post_results;
create policy "admin manages post results"
  on post_results for all
  to authenticated
  using (is_admin())
  with check (is_admin());
