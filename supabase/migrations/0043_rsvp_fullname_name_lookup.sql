-- ============================================================
-- 0043_rsvp_full_name_lookup.sql
-- Gated RSVP name search: match normalized full_name (not last-name token).
-- Same anon surface #6 shape: returns token / party_label / party_size only.
-- ============================================================

drop function if exists lookup_rsvp_household(text, text, text);

create or replace function lookup_rsvp_household(
  p_slug text,
  p_token text default null,
  p_full_name text default null
)
returns table (
  household_token text,
  party_label text,
  party_size int
)
language sql
security definer
set search_path = public, extensions
as $$
  with site as (
    select project_id
    from wedding_websites
    where slug = p_slug
      and published = true
    limit 1
  ),
  needle as (
    select lower(
      btrim(
        regexp_replace(
          regexp_replace(coalesce(p_full_name, ''), '[^a-zA-Z0-9 ]', ' ', 'g'),
          '\s+',
          ' ',
          'g'
        )
      )
    ) as name
  )
  select
    g.rsvp_token,
    g.full_name,
    g.party_size
  from guests g
  join site s on s.project_id = g.project_id
  cross join needle n
  where case
    when nullif(btrim(coalesce(p_token, '')), '') is not null
      then g.rsvp_token = btrim(p_token)
    when length(n.name) >= 2
      then n.name = lower(
        btrim(
          regexp_replace(
            regexp_replace(coalesce(g.full_name, ''), '[^a-zA-Z0-9 ]', ' ', 'g'),
            '\s+',
            ' ',
            'g'
          )
        )
      )
    else false
  end
  order by g.full_name
  limit 25;
$$;

revoke execute on function lookup_rsvp_household(text, text, text) from public;
grant execute on function lookup_rsvp_household(text, text, text) to anon, authenticated;
