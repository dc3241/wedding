-- ============================================================
-- 0129_product_shot_uploads.sql
-- Admin-uploaded product screenshots, one per generator angle.
-- Bytes live in content-queue-assets. The still renderer and KIE
-- prefer this row over the built-in design/product-shots file.
-- Hand-paste only — never supabase db push.
-- ============================================================

create table if not exists product_shot_uploads (
  surface       text primary key,
  storage_path  text not null,
  filename      text not null,
  content_type  text,
  file_size     bigint,
  uploaded_by   uuid references auth.users (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint product_shot_uploads_surface_format
    check (surface ~ '^[a-z0-9-]{1,40}$')
);

create unique index if not exists product_shot_uploads_storage_path_key
  on product_shot_uploads (storage_path);

alter table product_shot_uploads enable row level security;

drop policy if exists "admin manages product shot uploads" on product_shot_uploads;
create policy "admin manages product shot uploads"
  on product_shot_uploads for all
  to authenticated
  using (is_admin())
  with check (is_admin());
