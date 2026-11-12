-- Directory: per-category counts so vendor categories don't inflate venue counts.
-- Re-runnable.

-- Venue index stays venue-only (same signature, so create-or-replace is safe).
create or replace function public.directory_state_counts()
returns table (state text, listing_count bigint)
language sql stable security definer set search_path = public as $$
  select l.state, count(*)::bigint
  from public.directory_listings l
  where l.published and l.category = 'venue'
  group by l.state
$$;

create or replace function public.directory_category_counts()
returns table (state text, category text, listing_count bigint)
language sql stable security definer set search_path = public as $$
  select l.state, l.category, count(*)::bigint
  from public.directory_listings l
  where l.published
  group by l.state, l.category
$$;

grant execute on function public.directory_state_counts() to anon, authenticated;
grant execute on function public.directory_category_counts() to anon, authenticated;
