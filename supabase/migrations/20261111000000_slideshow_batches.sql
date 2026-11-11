-- ============================================================
-- 20261111000000_slideshow_batches.sql
-- SLIDESHOWS-01: strategic slideshow batches.
--
--   slideshow_settings   one row: which weekday a batch is generated, batch
--                        size, tip/engagement split, weekly summary weekday.
--   slideshow_batches    one row per generation run.
--   slideshow_posts      candidates -> selected -> (results logged). Each post
--                        carries its angle: kind, mechanic, feature, angle_key.
--   slideshow_results    numbers Dom logs about a week after posting.
--   slideshow_summaries  the conversational weekly "what's working" write-up.
--   slideshow_direction  Dom's replies to a summary, fed into the next batch.
--
-- Admin-only (is_admin()). Slide PNGs live in content-queue-assets under
-- slideshows/<batch_id>/<post_id>/. Re-runnable.
-- Hand-paste only — never supabase db push.
-- ============================================================

create table if not exists slideshow_settings (
  id                smallint primary key default 1,
  batch_weekday     smallint not null default 4,
  batch_size        smallint not null default 10,
  engagement_share  numeric(3, 2) not null default 0.50,
  summary_weekday   smallint not null default 0,
  auto_generate     boolean not null default true,
  last_batch_on     date,
  last_summary_on   date,
  updated_at        timestamptz not null default now(),
  constraint slideshow_settings_singleton check (id = 1),
  constraint slideshow_settings_batch_weekday check (batch_weekday between 0 and 6),
  constraint slideshow_settings_summary_weekday check (summary_weekday between 0 and 6),
  constraint slideshow_settings_batch_size check (batch_size between 2 and 20),
  constraint slideshow_settings_share check (engagement_share between 0.20 and 0.80)
);

insert into slideshow_settings (id) values (1) on conflict (id) do nothing;

create table if not exists slideshow_batches (
  id           uuid primary key default gen_random_uuid(),
  batch_date   date not null,
  status       text not null default 'generating'
                 check (status in ('generating', 'ready', 'failed')),
  requested    smallint not null default 10,
  produced     smallint not null default 0,
  created_by   text not null default 'cron' check (created_by in ('cron', 'manual')),
  notes        text,
  created_at   timestamptz not null default now()
);

create index if not exists slideshow_batches_date_idx
  on slideshow_batches (batch_date desc, created_at desc);

create table if not exists slideshow_posts (
  id              uuid primary key default gen_random_uuid(),
  batch_id        uuid references slideshow_batches (id) on delete set null,
  origin          text not null default 'batch' check (origin in ('batch', 'custom')),
  kind            text not null check (kind in ('tip', 'engage', 'promo')),
  mechanic        text not null,
  feature         text not null default 'none',
  angle_key       text not null,
  topic           text not null default '',
  title           text not null,
  caption         text not null default '',
  pinned_comment  text not null default '',
  hook            text not null default '',
  utm_campaign    text not null default '',
  custom_brief    text,
  slide_specs     jsonb not null default '[]'::jsonb,
  image_paths     text[] not null default '{}',
  status          text not null default 'candidate'
                    check (status in ('candidate', 'selected', 'discarded', 'expired')),
  selected_at     timestamptz,
  downloaded_at   timestamptz,
  posted_on       date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists slideshow_posts_status_idx
  on slideshow_posts (status, created_at desc);
create index if not exists slideshow_posts_batch_idx
  on slideshow_posts (batch_id);
create index if not exists slideshow_posts_angle_idx
  on slideshow_posts (angle_key, created_at desc);

create table if not exists slideshow_results (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references slideshow_posts (id) on delete cascade,
  post_url      text,
  views         integer check (views is null or views >= 0),
  likes         integer check (likes is null or likes >= 0),
  comments      integer check (comments is null or comments >= 0),
  shares        integer check (shares is null or shares >= 0),
  saves         integer check (saves is null or saves >= 0),
  link_clicks   integer check (link_clicks is null or link_clicks >= 0),
  signups       integer check (signups is null or signups >= 0),
  notes         text,
  logged_by     uuid references auth.users (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists slideshow_results_post_key
  on slideshow_results (post_id);

create table if not exists slideshow_summaries (
  id           uuid primary key default gen_random_uuid(),
  week_start   date not null,
  body         text not null,
  stats        jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create unique index if not exists slideshow_summaries_week_key
  on slideshow_summaries (week_start);

create table if not exists slideshow_direction (
  id           uuid primary key default gen_random_uuid(),
  summary_id   uuid references slideshow_summaries (id) on delete set null,
  source       text not null default 'reply' check (source in ('reply', 'note')),
  body         text not null,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists slideshow_direction_active_idx
  on slideshow_direction (active, created_at desc);

alter table slideshow_settings enable row level security;
alter table slideshow_batches enable row level security;
alter table slideshow_posts enable row level security;
alter table slideshow_results enable row level security;
alter table slideshow_summaries enable row level security;
alter table slideshow_direction enable row level security;

drop policy if exists "admin manages slideshow settings" on slideshow_settings;
create policy "admin manages slideshow settings"
  on slideshow_settings for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "admin manages slideshow batches" on slideshow_batches;
create policy "admin manages slideshow batches"
  on slideshow_batches for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "admin manages slideshow posts" on slideshow_posts;
create policy "admin manages slideshow posts"
  on slideshow_posts for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "admin manages slideshow results" on slideshow_results;
create policy "admin manages slideshow results"
  on slideshow_results for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "admin manages slideshow summaries" on slideshow_summaries;
create policy "admin manages slideshow summaries"
  on slideshow_summaries for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "admin manages slideshow direction" on slideshow_direction;
create policy "admin manages slideshow direction"
  on slideshow_direction for all to authenticated
  using (is_admin()) with check (is_admin());
