-- ============================================================
-- 0128_outreach_targets.sql
-- Daily venue and planner outreach. Five rows each. Dom types
-- the name or TikTok, generates a draft, copies it, and marks
-- it sent. No sending and no lookup. Hand-paste only — never
-- supabase db push.
-- ============================================================

create table if not exists outreach_targets (
  id             uuid primary key default gen_random_uuid(),
  outreach_date  date not null,
  audience       text not null,
  position       smallint not null,
  channel        text not null default 'email',
  name           text not null default '',
  subject        text,
  body           text,
  sent_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint outreach_targets_audience_check
    check (audience in ('venue', 'planner')),
  constraint outreach_targets_position_check
    check (position >= 1 and position <= 5),
  constraint outreach_targets_channel_check
    check (channel in ('email', 'tiktok')),
  unique (outreach_date, audience, position)
);

create index if not exists outreach_targets_date_idx
  on outreach_targets (outreach_date, audience, position);

alter table outreach_targets enable row level security;

drop policy if exists "admin manages outreach targets" on outreach_targets;
create policy "admin manages outreach targets"
  on outreach_targets for all
  to authenticated
  using (is_admin())
  with check (is_admin());
