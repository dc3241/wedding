-- ============================================================
-- 0100_seating_seat_index_one_based.sql
-- Canvas / SEAT-13 numbers seats 1..seat_count. Legacy demo + clone
-- rows stored 0-based indexes, so seat 0 counted toward capacity
-- but never filled a circle. Remap, then forbid 0.
-- ============================================================

do $$
declare
  t record;
  idx int[];
  cnt int;
  max_idx int;
  has_zero boolean;
  pure boolean;
  i int;
  free_seat int;
  remap_ids uuid[] := '{}';
  remap_vals int[] := '{}';
  rec record;
begin
  for t in
    select id, seat_count
    from seating_tables
    where kind is distinct from 'dancefloor'
  loop
    select
      coalesce(array_agg(sa.seat_index order by sa.seat_index), '{}'::int[]),
      count(*)::int,
      coalesce(max(sa.seat_index), -1),
      coalesce(bool_or(sa.seat_index = 0), false)
    into idx, cnt, max_idx, has_zero
    from seating_assignments sa
    where sa.table_id = t.id
      and sa.seat_index is not null;

    if not has_zero then
      continue;
    end if;

    -- Pure 0-based: {0,1,...,n-1} with room to shift into 1..n.
    pure := (cnt > 0 and max_idx = cnt - 1 and max_idx < t.seat_count);
    if pure then
      for i in 0..max_idx loop
        if not (i = any (idx)) then
          pure := false;
          exit;
        end if;
      end loop;
    end if;

    remap_ids := '{}';
    remap_vals := '{}';

    if pure then
      for rec in
        select sa.id, sa.seat_index
        from seating_assignments sa
        where sa.table_id = t.id
          and sa.seat_index is not null
      loop
        remap_ids := array_append(remap_ids, rec.id);
        remap_vals := array_append(remap_vals, rec.seat_index + 1);
      end loop;
    else
      free_seat := null;
      for i in 1..t.seat_count loop
        if not (i = any (idx)) then
          free_seat := i;
          exit;
        end if;
      end loop;

      if free_seat is not null then
        for rec in
          select sa.id
          from seating_assignments sa
          where sa.table_id = t.id
            and sa.seat_index = 0
        loop
          remap_ids := array_append(remap_ids, rec.id);
          remap_vals := array_append(remap_vals, free_seat);
        end loop;
      end if;
    end if;

    if array_length(remap_ids, 1) is null then
      continue;
    end if;

    -- Park first so the partial unique on (table_id, seat_index) does not fire.
    update seating_assignments
    set seat_index = null
    where id = any (remap_ids);

    for i in 1..array_length(remap_ids, 1) loop
      update seating_assignments
      set seat_index = remap_vals[i]
      where id = remap_ids[i];
    end loop;
  end loop;
end $$;

-- Any leftover 0 (no numbered seat free) is unplaced, not a ghost chair.
update seating_assignments
set seat_index = null
where seat_index = 0;

alter table seating_assignments
  drop constraint if exists seating_assignments_seat_index_check;

alter table seating_assignments
  add constraint seating_assignments_seat_index_check
  check (seat_index is null or seat_index >= 1);
