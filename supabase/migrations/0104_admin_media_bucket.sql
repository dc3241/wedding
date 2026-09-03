-- ============================================================
-- 0104_admin_media_bucket.sql
-- Admin Media Library — private admin-media bucket for UGC video/photo
-- handoff between Jordyn (uploads) and Dom (downloads).
-- Path: {media_assets.id}/{filename} — flat admin bucket, gated by
-- is_admin() only (no per-account folder scoping; this is not
-- multi-tenant data). NOT public. Signed URLs for both upload
-- (resumable/TUS presigned token) and download.
-- 2GB per-file cap per product decision (2026-09-03 AskUserQuestion).
-- Hand-paste only — never supabase db push. Applied via MCP like 0100-0103.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'admin-media', 'admin-media', false, 2147483648,
  array[
    'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo',
    'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/gif'
  ]
)
on conflict (id) do nothing;

drop policy if exists "admin media readable by admins" on storage.objects;
create policy "admin media readable by admins"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'admin-media' and public.is_admin());

drop policy if exists "admin media insertable by admins" on storage.objects;
create policy "admin media insertable by admins"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'admin-media' and public.is_admin());

drop policy if exists "admin media updatable by admins" on storage.objects;
create policy "admin media updatable by admins"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'admin-media' and public.is_admin())
  with check (bucket_id = 'admin-media' and public.is_admin());

drop policy if exists "admin media deletable by admins" on storage.objects;
create policy "admin media deletable by admins"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'admin-media' and public.is_admin());
