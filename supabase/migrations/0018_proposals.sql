-- ============================================================
-- 0018_proposals.sql
-- Account-scoped proposals tied to leads (CRM).
-- Authorizes via is_account_member — NOT can_access_project.
-- Apply AFTER 0017.
-- ============================================================

create table proposals (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  lead_id     uuid not null references leads(id) on delete cascade,
  title       text not null default 'Proposal',
  line_items  jsonb not null default '[]'::jsonb,
  total       numeric not null default 0,
  status      text not null default 'draft',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table proposals add constraint proposals_status_check
  check (status in ('draft', 'sent', 'accepted', 'declined'));

create index proposals_lead_id_idx on proposals (lead_id);

alter table proposals enable row level security;

create policy "proposals readable by account members"
  on proposals for select
  using (is_account_member(account_id));

create policy "proposals insertable by account members"
  on proposals for insert
  with check (is_account_member(account_id));

create policy "proposals updatable by account members"
  on proposals for update
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create policy "proposals deletable by account members"
  on proposals for delete
  using (is_account_member(account_id));
