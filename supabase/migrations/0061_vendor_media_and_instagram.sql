-- ============================================================
-- 0061_vendor_media_and_instagram.sql
-- VND-11: private account-scoped vendor-media bucket + vendors.instagram
-- Path: {account_id}/{vendor_id}/{file} — foldername[1] = account_id.
-- PRIVATE (public=false). NO anon SELECT. Signed URLs for reads.
-- Hand-paste only — never supabase db push.
-- ============================================================

-- 1) Instagram handle / URL on the rolodex.
alter table vendors
  add column if not exists instagram text;

-- 2) Private bucket — same MIME + 25MB cap as website-media; NOT public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendor-media', 'vendor-media', false, 26214400,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/heic'
  ]
)
on conflict (id) do nothing;

-- 3) Authenticated-only access gated by account membership on folder[1].
drop policy if exists "vendor media readable by account members" on storage.objects;
create policy "vendor media readable by account members"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'vendor-media'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "vendor media insertable by account members" on storage.objects;
create policy "vendor media insertable by account members"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vendor-media'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "vendor media updatable by account members" on storage.objects;
create policy "vendor media updatable by account members"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'vendor-media'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'vendor-media'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "vendor media deletable by account members" on storage.objects;
create policy "vendor media deletable by account members"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'vendor-media'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  );
