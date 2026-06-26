-- ============================================================
-- 0011_files.sql
-- Project file storage: a PRIVATE bucket + a files metadata table + storage
-- access policies that reuse can_access_project. Files are stored under a
-- "<project_id>/" folder, so the path's first segment is the project id, and
-- the storage policies authorize by that. Run in the Supabase SQL editor.
-- Apply AFTER 0010.
-- ============================================================

-- 1) Private bucket, 25MB limit, docs + images only (enforced by Storage itself).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files', 'project-files', false, 26214400,
  array[
    'application/pdf',
    'image/png', 'image/jpeg', 'image/webp', 'image/heic',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do nothing;
-- If your project blocks inserting into storage.buckets via SQL, create the bucket in the
-- Supabase console instead (Storage -> New bucket -> name 'project-files', Private, set the
-- 25MB limit and the same allowed types), then run the policies below.

-- 2) Storage access policies: a user may touch an object only if they can access the
-- project whose id is the first folder in the object's path.
create policy "project files readable by members"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-files'
    and public.can_access_project(((storage.foldername(name))[1])::uuid)
  );

create policy "project files insertable by members"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and public.can_access_project(((storage.foldername(name))[1])::uuid)
  );

create policy "project files deletable by members"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-files'
    and public.can_access_project(((storage.foldername(name))[1])::uuid)
  );

-- 3) Metadata table (the bytes live in Storage; this tracks files per project).
create table files (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  kind         text not null default 'file',   -- 'file' | 'contract' (Contracts reuses later)
  name         text not null,
  storage_path text not null,
  mime_type    text,
  size_bytes   bigint,
  uploaded_by  uuid default auth.uid() references auth.users(id),
  created_at   timestamptz not null default now()
);

create index on files (project_id, kind, created_at desc);

alter table files enable row level security;

create policy "files readable by project members"
  on files for select
  using (can_access_project(project_id));

create policy "files writable by project members"
  on files for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));