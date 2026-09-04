-- ============================================================
-- 0107_content_queue_assets_bucket.sql
-- CONTENT-QUEUE-00: private bucket for generated-post images.
-- Flat admin-gated policies (not folder-scoped like vendor-media
-- — this is a single internal tool, not multi-tenant). NOT public.
-- Mirrors 0104 admin-media policy shape: to authenticated +
-- public.is_admin(), UPDATE with both using and with check.
-- 20MB per-file cap; png/jpeg/webp only.
-- Hand-paste only — never supabase db push. Applied via MCP
-- like 0104-0106.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-queue-assets', 'content-queue-assets', false, 20971520,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "content-queue-assets admin select" on storage.objects;
create policy "content-queue-assets admin select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'content-queue-assets' and public.is_admin());

drop policy if exists "content-queue-assets admin insert" on storage.objects;
create policy "content-queue-assets admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'content-queue-assets' and public.is_admin());

drop policy if exists "content-queue-assets admin update" on storage.objects;
create policy "content-queue-assets admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'content-queue-assets' and public.is_admin())
  with check (bucket_id = 'content-queue-assets' and public.is_admin());

drop policy if exists "content-queue-assets admin delete" on storage.objects;
create policy "content-queue-assets admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'content-queue-assets' and public.is_admin());
