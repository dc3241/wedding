-- ============================================================
-- 20261111010000_video_flow.sql
-- VIDEOS-01: idea -> script -> voiceover -> footage -> render pipeline.
--
--   video_footage   library of screen recordings / images Dom uploads once;
--                   scripts try to reuse these before asking for an upload.
--   video_posts     one row per video, from idea through finished render.
--                   script (jsonb) is an ordered list of segments, each with
--                   spoken text + a visual; editable by Dom.
--   video-assets    private storage bucket (500MB cap per file): footage,
--                   voiceovers, render jobs, finished MP4s.
--
-- Admin-only (is_admin()). Rendering happens in GitHub Actions and reports back
-- through /api/video-render/callback using video_posts.render_token.
-- Re-runnable. Hand-paste only — never supabase db push.
-- ============================================================

create table if not exists video_footage (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text not null default '',
  feature       text not null default 'none',
  tags          text[] not null default '{}',
  path          text not null,
  media_type    text not null default 'video',
  duration_sec  numeric(8, 2),
  size_bytes    bigint,
  created_at    timestamptz not null default now(),
  constraint video_footage_media_type check (media_type in ('video', 'image'))
);

create table if not exists video_posts (
  id               uuid primary key default gen_random_uuid(),
  idea_batch_id    uuid,
  kind             text not null,
  mechanic         text not null,
  feature          text not null,
  angle_key        text not null,
  title            text not null,
  hook             text not null default '',
  concept          text not null default '',
  stage            text not null default 'idea',
  script           jsonb not null default '[]'::jsonb,
  caption          text not null default '',
  pinned_comment   text not null default '',
  utm_campaign     text not null default '',
  vo_path          text,
  vo_duration      numeric(8, 3),
  vo_words         jsonb,
  vo_text          text,
  render_status    text not null default 'idle',
  render_token     text,
  render_error     text,
  video_path       text,
  rendered_at      timestamptz,
  created_by       text not null default 'manual',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint video_posts_kind check (kind in ('tip', 'engage', 'promo')),
  constraint video_posts_stage check (stage in ('idea', 'scripted', 'discarded', 'expired')),
  constraint video_posts_render_status check (render_status in ('idle', 'rendering', 'done', 'failed'))
);

create index if not exists video_posts_stage_idx on video_posts (stage, created_at desc);
create index if not exists video_posts_batch_idx on video_posts (idea_batch_id);

alter table video_footage enable row level security;
alter table video_posts enable row level security;

drop policy if exists "video_footage admin all" on video_footage;
create policy "video_footage admin all" on video_footage
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "video_posts admin all" on video_posts;
create policy "video_posts admin all" on video_posts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'video-assets', 'video-assets', false, 524288000,
  array['video/mp4', 'video/quicktime', 'video/webm', 'audio/mpeg', 'audio/mp4',
        'application/json', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "video-assets admin select" on storage.objects;
create policy "video-assets admin select"
  on storage.objects for select to authenticated
  using (bucket_id = 'video-assets' and public.is_admin());

drop policy if exists "video-assets admin insert" on storage.objects;
create policy "video-assets admin insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'video-assets' and public.is_admin());

drop policy if exists "video-assets admin update" on storage.objects;
create policy "video-assets admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'video-assets' and public.is_admin())
  with check (bucket_id = 'video-assets' and public.is_admin());

drop policy if exists "video-assets admin delete" on storage.objects;
create policy "video-assets admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'video-assets' and public.is_admin());
