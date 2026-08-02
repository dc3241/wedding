-- ============================================================
-- 0047_contract_templates.sql
-- Account-scoped planner contract templates (CON-02).
-- category mirrors vendors.category / files.category: text, no DB CHECK.
-- ============================================================

create table if not exists contract_templates (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  name        text not null,
  body        text not null default '',
  category    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists contract_templates_account_idx on contract_templates (account_id);

alter table contract_templates enable row level security;
drop policy if exists "contract templates managed by account members" on contract_templates;
create policy "contract templates managed by account members" on contract_templates
  for all to authenticated
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
