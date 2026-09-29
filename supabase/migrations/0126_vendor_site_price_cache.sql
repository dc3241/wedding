-- ============================================================
-- 0126_vendor_site_price_cache.sql
-- Shared cache of prices stated on a vendor's own website, keyed
-- by Google place id. Search reads and writes it with the service
-- role. No anon/authenticated policies: the table is not a client API.
-- Also: median quoted price per vendor category, service role only.
-- Re-runnable. Hand-paste only — never supabase db push.
-- ============================================================

create table if not exists vendor_site_price_cache (
  place_id         text primary key,
  website_url      text,
  starting_amount  numeric(12,2),
  per_person       boolean not null default false,
  packages         jsonb not null default '[]'::jsonb,
  fetched_at       timestamptz not null default now()
);

alter table vendor_site_price_cache enable row level security;

revoke all on table vendor_site_price_cache from anon, authenticated;
grant select, insert, update, delete on table vendor_site_price_cache to service_role;

create or replace function vendor_category_quote_median(p_category text)
returns table (median_quote numeric, quote_count integer)
language sql
stable
security invoker
set search_path = public
as $$
  select
    percentile_cont(0.5) within group (order by pv.quoted_price)::numeric,
    count(*)::integer
  from project_vendors pv
  join vendors v on v.id = pv.vendor_id
  join projects p on p.id = pv.project_id
  join accounts a on a.id = p.account_id
  where v.category = p_category
    and pv.quoted_price is not null
    and pv.quoted_price >= 50
    and pv.quoted_price <= 500000
    and a.is_demo = false
    and coalesce(a.is_demo_template, false) = false
  having count(*) >= 8;
$$;

revoke all on function vendor_category_quote_median(text) from public, anon, authenticated;
grant execute on function vendor_category_quote_median(text) to service_role;
