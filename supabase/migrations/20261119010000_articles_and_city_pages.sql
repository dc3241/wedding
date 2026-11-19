-- ============================================================
-- 20261119010000_articles_and_city_pages.sql
-- MEDIA-05: "Ideas" articles for the public media site.
-- MEDIA-06: per-city directory pages.
--
--  * articles — written in /admin/articles (admin-only, same FOR ALL
--    is_admin() posture as content_bank_items). Body is plain markdown.
--  * Public reads go through two definer RPCs that only ever return
--    status = 'published'. No anon SELECT on the table (new anon read
--    surface, same posture as the directory RPCs).
--  * directory_city_counts() — published listings per state/city/category,
--    so city pages and the sitemap don't scan every state.
--
-- Re-runnable: create-if-not-exists, drop-if-exists, create-or-replace.
-- ============================================================

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  dek text,
  body text not null default '',
  pillar text not null default 'planning',
  status text not null default 'draft',
  published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists articles_slug_key on public.articles (slug);
create index if not exists articles_published_idx
  on public.articles (published_at desc) where status = 'published';

alter table public.articles drop constraint if exists articles_slug_format;
alter table public.articles add constraint articles_slug_format
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 120);

alter table public.articles drop constraint if exists articles_status_values;
alter table public.articles add constraint articles_status_values
  check (status in ('draft', 'published'));

-- Pillars match the content system; keys live in lib/articles/pillars.ts.
alter table public.articles drop constraint if exists articles_pillar_values;
alter table public.articles add constraint articles_pillar_values
  check (pillar in ('planning', 'budget', 'timeline', 'guests', 'vendors', 'real-weddings', 'saving'));

alter table public.articles drop constraint if exists articles_published_has_date;
alter table public.articles add constraint articles_published_has_date
  check (status <> 'published' or published_at is not null);

alter table public.articles enable row level security;

drop policy if exists "admins manage articles" on public.articles;
create policy "admins manage articles" on public.articles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- public read RPCs (published only) ----------
create or replace function public.articles_published(
  p_pillar text default null,
  p_limit int default 60
)
returns table (slug text, title text, dek text, pillar text, published_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.slug, a.title, a.dek, a.pillar, a.published_at
  from public.articles a
  where a.status = 'published'
    and (p_pillar is null or a.pillar = p_pillar)
  order by a.published_at desc
  limit least(greatest(coalesce(p_limit, 60), 1), 200)
$$;

create or replace function public.article_by_slug(p_slug text)
returns table (
  slug text, title text, dek text, body text, pillar text,
  published_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select a.slug, a.title, a.dek, a.body, a.pillar, a.published_at, a.updated_at
  from public.articles a
  where a.status = 'published' and a.slug = p_slug
  limit 1
$$;

revoke all on function public.articles_published(text, int) from public;
revoke all on function public.article_by_slug(text) from public;
grant execute on function public.articles_published(text, int) to anon, authenticated;
grant execute on function public.article_by_slug(text) to anon, authenticated;

-- ---------- directory city counts ----------
create or replace function public.directory_city_counts()
returns table (state text, city text, category text, listing_count bigint)
language sql stable security definer set search_path = public as $$
  select l.state, l.city, l.category, count(*)::bigint
  from public.directory_listings l
  where l.published and l.city is not null and btrim(l.city) <> ''
  group by l.state, l.city, l.category
$$;

revoke all on function public.directory_city_counts() from public;
grant execute on function public.directory_city_counts() to anon, authenticated;
