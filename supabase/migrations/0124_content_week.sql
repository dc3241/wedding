-- ============================================================
-- 0124_content_week.sql
-- Week shortlists (tip/promo lanes) and Mon–Sat posting slots.
-- Sunday cron fills ideas; humans choose, produce, then check off.
-- Re-runnable. Hand-paste only — never supabase db push.
-- ============================================================

alter table ideation_items
  add column if not exists lane text;

alter table ideation_items
  add column if not exists intent text;

alter table ideation_items
  add column if not exists topic_key text;

alter table ideation_items
  add column if not exists slot_date date;

alter table ideation_items
  add column if not exists week_start date;

alter table ideation_items drop constraint if exists ideation_items_lane_check;
alter table ideation_items add constraint ideation_items_lane_check
  check (lane is null or lane in ('video', 'slideshow', 'pin', 'linkedin'));

alter table ideation_items drop constraint if exists ideation_items_intent_check;
alter table ideation_items add constraint ideation_items_intent_check
  check (intent is null or intent in ('tip', 'promo'));

create index if not exists ideation_items_week_lane_idx
  on ideation_items (week_start, slot_date, lane);

create table if not exists content_slots (
  id           uuid primary key default gen_random_uuid(),
  week_start   date not null,
  slot_date    date not null,
  lane         text not null,
  intent       text not null,
  position     smallint not null,
  idea_id      uuid references ideation_items (id) on delete set null,
  filmed_at    timestamptz,
  posted_at    timestamptz,
  fb_posted_at timestamptz,
  created_at   timestamptz not null default now(),
  constraint content_slots_lane_check
    check (lane in ('video', 'slideshow', 'pin', 'linkedin')),
  constraint content_slots_intent_check
    check (intent in ('tip', 'promo', 'open')),
  constraint content_slots_position_check
    check (position >= 1 and position <= 3),
  unique (slot_date, lane, position)
);

create unique index if not exists content_slots_idea_id_uidx
  on content_slots (idea_id)
  where idea_id is not null;

create index if not exists content_slots_week_idx
  on content_slots (week_start, slot_date);

alter table content_slots enable row level security;

drop policy if exists "admin manages content slots" on content_slots;
create policy "admin manages content slots"
  on content_slots for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create table if not exists content_topic_cursors (
  deck       text primary key,
  next_index integer not null default 0,
  constraint content_topic_cursors_index_check check (next_index >= 0)
);

insert into content_topic_cursors (deck, next_index)
values
  ('couples_tip', 0),
  ('couples_promo', 0),
  ('venue_tip', 0),
  ('venue_promo', 0)
on conflict (deck) do nothing;

alter table content_topic_cursors enable row level security;

drop policy if exists "admin manages topic cursors" on content_topic_cursors;
create policy "admin manages topic cursors"
  on content_topic_cursors for all
  to authenticated
  using (is_admin())
  with check (is_admin());
