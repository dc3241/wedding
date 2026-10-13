-- ============================================================
-- 0134_demo_contract_text.sql
-- Demo clones copy a contract's storage path but not its extracted
-- text. When a new files row reuses a path that already has ready
-- text, copy that text so Review works without a second download.
-- Also let a member download a demo-template object when a files row
-- they can access points at that exact path.
-- Hand-paste only — never supabase db push.
-- ============================================================

create or replace function public.copy_shared_file_text()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  src public.files%rowtype;
begin
  if new.extraction_status is not null or new.storage_path is null then
    return new;
  end if;

  select *
    into src
  from public.files
  where storage_path = new.storage_path
    and extraction_status = 'ready'
    and extracted_text is not null
  order by created_at
  limit 1;

  if found then
    new.extracted_text := src.extracted_text;
    new.extraction_status := src.extraction_status;
    new.extraction_truncated := src.extraction_truncated;
  end if;

  return new;
end;
$$;

drop trigger if exists files_copy_shared_text on public.files;

create trigger files_copy_shared_text
  before insert on public.files
  for each row
  execute function public.copy_shared_file_text();

-- Security definer so the check can see the demo-template project. A
-- member's own RLS hides that project, which would make the download
-- look missing. The caller still has to have a files row they can
-- access that points at this exact path.
create or replace function public.can_read_demo_template_object(p_name text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    (storage.foldername(p_name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and exists (
      select 1
      from projects tp
      join accounts ta
        on ta.id = tp.account_id
       and ta.is_demo_template = true
      where tp.id = ((storage.foldername(p_name))[1])::uuid
    )
    and exists (
      select 1
      from files f
      where f.storage_path = p_name
        and can_access_project(f.project_id)
    );
$$;

revoke all on function public.can_read_demo_template_object(text) from public;
grant execute on function public.can_read_demo_template_object(text) to authenticated;

drop policy if exists "demo template files readable via linked row" on storage.objects;

create policy "demo template files readable via linked row"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-files'
    and public.can_read_demo_template_object(name)
  );
