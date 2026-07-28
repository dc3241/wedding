-- ============================================================
-- 0037_registry_legacy_links_backfill.sql
-- REG-04: consolidate website-builder legacy registry links
-- (content.registry.links) into wedding_websites.external_registry_links,
-- then clear the legacy array. Idempotent / re-runnable.
-- Hand-paste only — never supabase db push.
-- ============================================================

update wedding_websites as w
set
  external_registry_links = (
    select coalesce(
      jsonb_agg(
        jsonb_build_object('label', d.label, 'url', d.url)
        order by d.src, d.ordinality
      ),
      '[]'::jsonb
    )
    from (
      select distinct on (lower(u.url))
        u.label,
        u.url,
        u.src,
        u.ordinality
      from (
        select
          trim(both from value->>'label') as label,
          trim(both from value->>'url') as url,
          0 as src,
          ordinality
        from jsonb_array_elements(coalesce(w.external_registry_links, '[]'::jsonb))
          with ordinality
        union all
        select
          trim(both from value->>'label'),
          trim(both from value->>'url'),
          1,
          ordinality
        from jsonb_array_elements(
          coalesce(w.content->'registry'->'links', '[]'::jsonb)
        ) with ordinality
      ) u
      where coalesce(u.label, '') <> ''
        and coalesce(u.url, '') <> ''
      order by lower(u.url), u.src, u.ordinality
    ) d
  ),
  content = jsonb_set(
    coalesce(w.content, '{}'::jsonb),
    '{registry,links}',
    '[]'::jsonb,
    true
  ),
  updated_at = now()
where jsonb_typeof(coalesce(w.content->'registry'->'links', 'null'::jsonb)) = 'array'
  and jsonb_array_length(coalesce(w.content->'registry'->'links', '[]'::jsonb)) > 0;
