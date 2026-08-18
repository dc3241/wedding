-- ============================================================
-- 0092_demo_anonymize_business_name.sql
-- Homepage demo clones copied the business template's live name
-- ("Events by Jordyn") into public workspaces. The leads intake
-- card then slugified that name into /inquire/events-by-jordyn.
-- Anonymize existing clones; trigger so clone_demo_account inserts
-- cannot leak a live brand. Does NOT rename the real (non-demo)
-- Events by Jordyn account.
-- ============================================================

-- Existing public demo clones that still carry the template name.
update accounts a
set name = 'Lumen Planning'
where a.is_demo = true
  and a.kind = 'business'
  and exists (
    select 1
    from accounts t
    where t.is_demo_template = true
      and t.kind = 'business'
      and t.name = a.name
  );

update accounts
set name = 'Lumen Planning'
where is_demo = true
  and kind = 'business'
  and name = 'Events by Jordyn';

-- Drop leaked inquiry slugs; ensureInquirySlug regenerates demo-studio.
update accounts
set inquiry_slug = null
where is_demo = true
  and inquiry_slug is not null
  and inquiry_slug !~ '^demo-studio(-[a-f0-9]+)?$';

create or replace function anonymize_demo_business_account()
returns trigger
language plpgsql
as $$
begin
  if new.is_demo = true and new.kind = 'business' then
    new.name := 'Lumen Planning';
  end if;
  return new;
end;
$$;

drop trigger if exists anonymize_demo_business_account on accounts;
create trigger anonymize_demo_business_account
  before insert on accounts
  for each row
  when (new.is_demo = true and new.kind = 'business')
  execute function anonymize_demo_business_account();
