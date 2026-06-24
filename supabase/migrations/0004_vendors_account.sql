-- ============================================================
-- 0004_vendors.sql
-- Restructures vendors into two levels:
--   vendors          = account-level rolodex (the vendor as a business you know)
--   project_vendors  = a vendor's involvement in ONE wedding (status, quote, role)
-- Preserves the working checklist: the old per-project vendors table becomes
-- project_vendors, so tasks.vendor_id keeps pointing at the right rows (now the
-- per-wedding involvement, which is the correct target).
-- Apply AFTER 0001-0003.
-- ============================================================

-- 1) The old per-project vendors table becomes the involvement/join table.
--    (tasks.vendor_id follows the rename automatically.)
alter table vendors rename to project_vendors;

-- 2) The new account-level rolodex.
create table vendors (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references accounts(id) on delete cascade,
  name          text not null,
  category      text,                 -- florist, caterer, photographer, venue, DJ...
  contact_name  text,
  contact_email text,
  contact_phone text,
  website       text,
  service_area  text,
  notes         text,                 -- relationship notes across weddings
  is_preferred  boolean not null default false,  -- your own quality flag
  created_at    timestamptz not null default now()
);

-- 3) Link involvement rows to rolodex vendors, then backfill from existing data.
alter table project_vendors add column vendor_id uuid references vendors(id) on delete cascade;

do $$
declare r record; v uuid;
begin
  for r in
    select pv.id, pv.name, pv.category, pv.contact_email, p.account_id
    from project_vendors pv
    join projects p on p.id = pv.project_id
    where pv.vendor_id is null
  loop
    insert into vendors (account_id, name, category, contact_email)
    values (r.account_id, r.name, r.category, r.contact_email)
    returning id into v;
    update project_vendors set vendor_id = v where id = r.id;
  end loop;
end $$;

alter table project_vendors alter column vendor_id set not null;

-- 4) Per-wedding fields live on involvement; the descriptive fields now live on
--    the rolodex, so drop the duplicated columns. status stays (pipeline state).
alter table project_vendors add column quoted_price numeric(12,2);
alter table project_vendors add column role text;        -- their role in THIS wedding
alter table project_vendors add column notes text;       -- notes specific to this wedding
alter table project_vendors drop column name;
alter table project_vendors drop column category;
alter table project_vendors drop column contact_email;

create index on project_vendors (project_id);
create index on project_vendors (vendor_id);

-- 5) Reset RLS on the renamed involvement table (old policies dropped, scoped anew).
drop policy if exists "vendors readable by project members" on project_vendors;
drop policy if exists "vendors writable by project members" on project_vendors;

create policy "project_vendors readable by project members"
  on project_vendors for select
  using (can_access_project(project_id));

create policy "project_vendors writable by project members"
  on project_vendors for all
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

-- 6) Rolodex access: read if you're an account member OR the vendor is linked to a
--    wedding you can access (so an invited couple sees their own wedding's vendors,
--    but not the planner's wider rolodex or other clients' vendors).
create or replace function can_read_vendor(p_vendor_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    is_account_member((select account_id from vendors where id = p_vendor_id))
    or exists (
      select 1 from project_vendors pv
      where pv.vendor_id = p_vendor_id and can_access_project(pv.project_id)
    );
$$;

alter table vendors enable row level security;

create policy "vendors readable via account or linked project"
  on vendors for select
  using (can_read_vendor(id));

create policy "vendors managed by account members"
  on vendors for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

grant execute on function can_read_vendor(uuid) to authenticated;