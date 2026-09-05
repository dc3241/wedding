-- ============================================================
-- 0112_ideation_format_audience_bank.sql
-- Production format + audience on ideation; Friday branches
-- (UGC skips KIE, carousel fires N jobs); Approve files the
-- post into the matching content bank.
--
-- Re-runnable. Hand-paste only — never supabase db push.
-- ============================================================

alter table ideation_items
  add column if not exists format text;

alter table ideation_items drop constraint if exists ideation_items_format_check;
alter table ideation_items add constraint ideation_items_format_check
  check (format is null or format in ('static', 'carousel', 'ugc', 'photo', 'pin'));

alter table ideation_items
  add column if not exists audience_group text;

alter table ideation_items drop constraint if exists ideation_items_audience_group_check;
alter table ideation_items add constraint ideation_items_audience_group_check
  check (audience_group is null or audience_group in ('couples', 'planner'));

alter table ideation_items
  add column if not exists carousel_slides integer;

alter table ideation_items drop constraint if exists ideation_items_carousel_slides_check;
alter table ideation_items add constraint ideation_items_carousel_slides_check
  check (
    carousel_slides is null
    or (carousel_slides >= 3 and carousel_slides <= 7)
  );

drop index if exists ideation_items_queue_ready_idx;
create index if not exists ideation_items_queue_ready_idx
  on ideation_items (created_at)
  where rating = 'up'
    and used_at is null
    and platform is not null
    and format is not null
    and audience_group is not null;

alter table content_queue
  add column if not exists format text;

alter table content_queue drop constraint if exists content_queue_format_check;
alter table content_queue add constraint content_queue_format_check
  check (format is null or format in ('static', 'carousel', 'ugc', 'photo', 'pin'));

alter table content_queue
  add column if not exists audience_group text;

alter table content_queue drop constraint if exists content_queue_audience_group_check;
alter table content_queue add constraint content_queue_audience_group_check
  check (audience_group is null or audience_group in ('couples', 'planner'));

alter table content_queue
  add column if not exists carousel_slides integer;

alter table content_queue
  add column if not exists kie_task_ids text[] not null default '{}';

alter table content_queue
  add column if not exists slide_prompts text[] not null default '{}';

alter table content_bank_items
  add column if not exists audience_group text;

alter table content_bank_items drop constraint if exists content_bank_items_audience_group_check;
alter table content_bank_items add constraint content_bank_items_audience_group_check
  check (audience_group is null or audience_group in ('couples', 'planner'));

alter table content_bank_items
  add column if not exists source_queue_id uuid references content_queue (id) on delete set null;

alter table content_bank_items
  add column if not exists image_paths text[] not null default '{}';

create unique index if not exists content_bank_items_source_queue_id_uidx
  on content_bank_items (source_queue_id)
  where source_queue_id is not null;

-- Atomic slide write so parallel carousel webhooks cannot clobber each other.
create or replace function public.content_queue_set_slide(
  p_id uuid,
  p_index integer,
  p_path text
)
returns void
language plpgsql
as $$
declare
  arr text[];
  len int;
begin
  if p_index < 0 then
    raise exception 'slide index must be >= 0';
  end if;
  select coalesce(image_paths, '{}') into arr
  from content_queue
  where id = p_id
  for update;
  if not found then
    return;
  end if;
  len := greatest(coalesce(array_length(arr, 1), 0), p_index + 1);
  arr := coalesce(arr, '{}');
  while coalesce(array_length(arr, 1), 0) < len loop
    arr := arr || array[''];
  end loop;
  arr[p_index + 1] := p_path;
  update content_queue
  set image_paths = arr, updated_at = now()
  where id = p_id;
end;
$$;

revoke all on function public.content_queue_set_slide(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.content_queue_set_slide(uuid, integer, text) to service_role;
