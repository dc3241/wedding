-- ============================================================
-- 0106_content_queue.sql
-- CONTENT-QUEUE-00: weekly generated-post review queue.
-- Admin-only table. image_paths stores our own storage object
-- paths (private content-queue-assets bucket), never a raw
-- KIE-hosted URL — those links expire (~24h).
-- No UI / no KIE call in this slice.
-- Hand-paste only — never supabase db push. Applied via MCP
-- like 0103-0105.
-- ============================================================

create table if not exists content_queue (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('instagram', 'tiktok', 'pinterest')),
  pillar text not null,
  content_type text not null check (content_type in ('A', 'B', 'C', 'D')),
  prompt text not null,
  image_paths text[] not null default '{}',
  caption text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  week_of date not null,
  kie_task_id text,
  generated_by text,
  approved_at timestamptz,
  denied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_queue_week_status_idx
  on content_queue (week_of, status);

alter table content_queue enable row level security;

drop policy if exists "content_queue managed by admins" on content_queue;
create policy "content_queue managed by admins"
  on content_queue for all
  to authenticated
  using (is_admin())
  with check (is_admin());
