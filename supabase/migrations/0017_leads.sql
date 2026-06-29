-- ============================================================
-- 0017_leads.sql
-- Account-scoped lead pipeline for planner CRM (pre-project couples).
-- Authorizes via is_account_member — NOT can_access_project.
-- Apply AFTER 0016.
-- ============================================================

create table leads (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references accounts(id) on delete cascade,
  couple_name      text not null,
  contact_email    text,
  contact_phone    text,
  wedding_date     date,
  estimated_budget numeric,
  venue            text,
  source           text,
  stage            text not null default 'inquiry',
  notes            text,
  position         integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table leads add constraint leads_stage_check
  check (stage in ('inquiry', 'contacted', 'proposal', 'booked', 'lost'));

create index leads_account_stage_position_idx on leads (account_id, stage, position);

alter table leads enable row level security;

create policy "leads readable by account members"
  on leads for select
  using (is_account_member(account_id));

create policy "leads insertable by account members"
  on leads for insert
  with check (is_account_member(account_id));

create policy "leads updatable by account members"
  on leads for update
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create policy "leads deletable by account members"
  on leads for delete
  using (is_account_member(account_id));
