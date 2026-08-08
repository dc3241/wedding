-- ============================================================
-- 0070_account_branding.sql
-- WHITE-01: planner white-label branding (in-app CoupleShell only).
-- Columns + business-only CHECK; public brand-media bucket; narrow
-- get_project_branding RPC (authenticated, not anon). Members can
-- UPDATE their own accounts row so branding writes are not RLS no-ops.
-- Hand-paste / linked push — do not invent a second client writer.
-- ============================================================

-- 1) Branding columns on accounts
alter table accounts
  add column if not exists white_label_enabled boolean not null default false;

alter table accounts
  add column if not exists brand_name text;

alter table accounts
  add column if not exists brand_logo_url text;

alter table accounts
  add column if not exists brand_accent_color text;

alter table accounts
  drop constraint if exists accounts_white_label_business_only;

alter table accounts
  add constraint accounts_white_label_business_only
  check (white_label_enabled = false or kind = 'business');

-- 2) Account members may update their own account (branding writes).
-- SELECT remains member-only; do NOT add a project-member SELECT policy.
drop policy if exists "members update own account" on accounts;
create policy "members update own account"
  on accounts for update
  to authenticated
  using (is_account_member(id))
  with check (is_account_member(id));

-- 3) Public brand-media bucket — website-media posture, 5MB, no SVG.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-media', 'brand-media', true, 5242880,
  array[
    'image/png', 'image/jpeg', 'image/webp'
  ]
)
on conflict (id) do nothing;

drop policy if exists "brand media publicly readable" on storage.objects;
create policy "brand media publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'brand-media');

drop policy if exists "brand media insertable by account members" on storage.objects;
create policy "brand media insertable by account members"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'brand-media'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "brand media updatable by account members" on storage.objects;
create policy "brand media updatable by account members"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'brand-media'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'brand-media'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "brand media deletable by account members" on storage.objects;
create policy "brand media deletable by account members"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'brand-media'
    and public.is_account_member(((storage.foldername(name))[1])::uuid)
  );

-- 4) Narrow branding read for project-accessible viewers (invited members).
-- Empty result = no branding. Not granted to anon.
create or replace function get_project_branding(p_project_id uuid)
returns table (
  brand_name text,
  brand_logo_url text,
  brand_accent_color text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not can_access_project(p_project_id) then
    return;
  end if;

  return query
    select a.brand_name, a.brand_logo_url, a.brand_accent_color
    from projects p
    join accounts a on a.id = p.account_id
    where p.id = p_project_id
      and a.kind = 'business'
      and a.white_label_enabled = true;
end;
$$;

grant execute on function get_project_branding(uuid) to authenticated;
