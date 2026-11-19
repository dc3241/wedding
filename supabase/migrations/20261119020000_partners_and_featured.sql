-- ============================================================
-- 20261119020000_partners_and_featured.sql
-- MEDIA-07: affiliate + sponsor partner links on the public media site.
-- MEDIA-08: featured (paid, labeled) directory listings.
--
--  * partner_links — admin-managed (FOR ALL is_admin()). kind 'affiliate'
--    shows "we may earn a commission"; kind 'sponsor' shows "Sponsored".
--    placements[] says where a card may appear (keys in lib/partners.ts).
--    The destination url is NEVER returned to anon: cards link to
--    /go/<slug>, which calls partner_click() for the url.
--  * partner_link_clicks — one row per link per day (counts only, no IP,
--    no visitor data). Written only by partner_click().
--  * directory_listings.featured_until — a listing is featured while this
--    is in the future. Featured listings get a labeled strip above the
--    normal list; the normal list's order (city, then name) never changes,
--    so the directory stays "no one pays to rank".
--
-- New anon surfaces (definer RPCs only, no anon table access):
--   partner_links_for(placement)  read, active links, no url
--   partner_links_by_slugs(slugs) read, same shape, for inline article cards
--   partner_click(slug)           write, bumps the day's count, returns url
--   directory_featured(state, categories[])  read, published + featured now
-- Re-runnable.
-- ============================================================

create table if not exists public.partner_links (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  kind text not null default 'affiliate',
  partner_name text not null,
  title text not null,
  body text,
  cta_label text not null default 'Learn more',
  url text not null,
  image_url text,
  placements text[] not null default '{}',
  active boolean not null default true,
  starts_on date,
  ends_on date,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists partner_links_slug_key on public.partner_links (slug);

alter table public.partner_links drop constraint if exists partner_links_slug_format;
alter table public.partner_links add constraint partner_links_slug_format
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 80);
alter table public.partner_links drop constraint if exists partner_links_kind_values;
alter table public.partner_links add constraint partner_links_kind_values
  check (kind in ('affiliate', 'sponsor'));
alter table public.partner_links drop constraint if exists partner_links_url_https;
alter table public.partner_links add constraint partner_links_url_https
  check (url ~ '^https://');
alter table public.partner_links drop constraint if exists partner_links_image_https;
alter table public.partner_links add constraint partner_links_image_https
  check (image_url is null or image_url ~ '^https://');
alter table public.partner_links drop constraint if exists partner_links_dates;
alter table public.partner_links add constraint partner_links_dates
  check (starts_on is null or ends_on is null or ends_on >= starts_on);

alter table public.partner_links enable row level security;
drop policy if exists "admins manage partner links" on public.partner_links;
create policy "admins manage partner links" on public.partner_links
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.partner_link_clicks (
  link_id uuid not null references public.partner_links (id) on delete cascade,
  day date not null,
  clicks int not null default 0,
  primary key (link_id, day)
);

alter table public.partner_link_clicks enable row level security;
drop policy if exists "admins read partner clicks" on public.partner_link_clicks;
create policy "admins read partner clicks" on public.partner_link_clicks
  for select to authenticated
  using (public.is_admin());

create or replace function public.partner_links_for(p_placement text)
returns table (
  slug text, kind text, partner_name text, title text, body text,
  cta_label text, image_url text
)
language sql stable security definer set search_path = public as $$
  select p.slug, p.kind, p.partner_name, p.title, p.body, p.cta_label, p.image_url
  from public.partner_links p
  where p.active
    and p_placement = any (p.placements)
    and (p.starts_on is null or p.starts_on <= current_date)
    and (p.ends_on is null or p.ends_on >= current_date)
  order by p.sort_order, p.created_at
  limit 6
$$;

create or replace function public.partner_click(p_slug text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_url text;
begin
  select p.id, p.url into v_id, v_url
  from public.partner_links p
  where p.slug = p_slug
    and p.active
    and (p.starts_on is null or p.starts_on <= current_date)
    and (p.ends_on is null or p.ends_on >= current_date);

  if v_id is null then
    return null;
  end if;

  insert into public.partner_link_clicks (link_id, day, clicks)
  values (v_id, current_date, 1)
  on conflict (link_id, day) do update
    set clicks = partner_link_clicks.clicks + 1;

  return v_url;
end;
$$;

-- Cards an article names inline with [[partner:slug]].
create or replace function public.partner_links_by_slugs(p_slugs text[])
returns table (
  slug text, kind text, partner_name text, title text, body text,
  cta_label text, image_url text
)
language sql stable security definer set search_path = public as $$
  select p.slug, p.kind, p.partner_name, p.title, p.body, p.cta_label, p.image_url
  from public.partner_links p
  where p.active
    and p.slug = any (p_slugs[1:20])
    and (p.starts_on is null or p.starts_on <= current_date)
    and (p.ends_on is null or p.ends_on >= current_date)
$$;

revoke all on function public.partner_links_by_slugs(text[]) from public;
grant execute on function public.partner_links_by_slugs(text[]) to anon, authenticated;
revoke all on function public.partner_links_for(text) from public;
revoke all on function public.partner_click(text) from public;
grant execute on function public.partner_links_for(text) to anon, authenticated;
grant execute on function public.partner_click(text) to anon, authenticated;

-- ---------- featured directory listings ----------
alter table public.directory_listings
  add column if not exists featured_until timestamptz;

create index if not exists directory_listings_featured_idx
  on public.directory_listings (state, featured_until)
  where published and featured_until is not null;

create or replace function public.directory_featured(p_state text, p_categories text[])
returns table (
  id uuid, slug text, name text, category text, city text, state text,
  venue_type text, website text, verified boolean, claimed boolean
)
language sql stable security definer set search_path = public as $$
  select l.id, l.slug, l.name, l.category, l.city, l.state,
         l.venue_type, l.website, l.verified,
         (l.claimed_account_id is not null)
  from public.directory_listings l
  where l.published
    and l.state = upper(p_state)
    and l.category = any (p_categories)
    and l.featured_until > now()
  order by l.featured_until desc
  limit 3
$$;

revoke all on function public.directory_featured(text, text[]) from public;
grant execute on function public.directory_featured(text, text[]) to anon, authenticated;

-- Admin: set or clear a listing's featured window (directory_listings has
-- no client policies, so this definer RPC is the only app write path).
create or replace function public.admin_set_listing_featured(p_listing_id uuid, p_until timestamptz)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  update public.directory_listings set featured_until = p_until where id = p_listing_id;
end;
$$;

-- Admin search for the featured picker.
create or replace function public.admin_search_listings(p_query text)
returns table (
  id uuid, slug text, name text, category text, city text, state text,
  published boolean, featured_until timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  return query
    select l.id, l.slug, l.name, l.category, l.city, l.state, l.published, l.featured_until
    from public.directory_listings l
    where (coalesce(btrim(p_query), '') = '' and l.featured_until is not null)
       or (coalesce(btrim(p_query), '') <> '' and l.name ilike '%' || btrim(p_query) || '%')
    order by l.featured_until desc nulls last, l.name
    limit 40;
end;
$$;

revoke all on function public.admin_set_listing_featured(uuid, timestamptz) from public;
revoke all on function public.admin_search_listings(text) from public;
grant execute on function public.admin_set_listing_featured(uuid, timestamptz) to authenticated;
grant execute on function public.admin_search_listings(text) to authenticated;
