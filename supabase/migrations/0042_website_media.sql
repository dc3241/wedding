-- ============================================================
-- 0042_website_media.sql
-- WEB-IMG-01: public website-media bucket for wedding site photos
-- (hero, later gallery / party). Path first folder = project_id.
-- Public read by design (no published gate). Writes: can_edit_project.
-- Hand-paste only — never supabase db push.
-- ============================================================

-- 1) Public bucket, 25MB (same cap as project-files), images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'website-media', 'website-media', true, 26214400,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/heic'
  ]
)
on conflict (id) do nothing;

-- 2) Public read — recorded carve-out: no published gate.
drop policy if exists "website media publicly readable" on storage.objects;
create policy "website media publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'website-media');

-- 3) Writes gated on can_edit_project (WRITE-01; not can_access_project).
drop policy if exists "website media insertable by editors" on storage.objects;
create policy "website media insertable by editors"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'website-media'
    and public.can_edit_project(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "website media updatable by editors" on storage.objects;
create policy "website media updatable by editors"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'website-media'
    and public.can_edit_project(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'website-media'
    and public.can_edit_project(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "website media deletable by editors" on storage.objects;
create policy "website media deletable by editors"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'website-media'
    and public.can_edit_project(((storage.foldername(name))[1])::uuid)
  );
