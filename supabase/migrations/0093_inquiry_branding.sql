-- ============================================================
-- 0093_inquiry_branding.sql
-- WHITE-03: public inquiry embed branding.
-- Anon surface #9: get_inquiry_branding(p_slug) — SECURITY DEFINER,
-- anon + authenticated execute. Returns only account_found + the
-- three brand fields. Never account_id, never email, never any
-- other accounts column. Same posture as get_project_branding /
-- submit_inquiry.
--
-- Next-free after 0092_demo_anonymize_business_name.sql.
-- ============================================================

create or replace function get_inquiry_branding(p_slug text)
returns table (
  account_found boolean,
  brand_name text,
  brand_logo_url text,
  brand_accent_color text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_white boolean;
  v_name text;
  v_logo text;
  v_accent text;
begin
  select
    a.white_label_enabled,
    a.brand_name,
    a.brand_logo_url,
    a.brand_accent_color
  into v_white, v_name, v_logo, v_accent
  from accounts a
  where a.inquiry_slug = btrim(coalesce(p_slug, ''))
    and a.kind = 'business';

  if not found then
    account_found := false;
    brand_name := null;
    brand_logo_url := null;
    brand_accent_color := null;
    return next;
    return;
  end if;

  account_found := true;
  if v_white then
    brand_name := v_name;
    brand_logo_url := v_logo;
    brand_accent_color := v_accent;
  else
    brand_name := null;
    brand_logo_url := null;
    brand_accent_color := null;
  end if;
  return next;
end;
$$;

revoke all on function get_inquiry_branding(text) from public;
grant execute on function get_inquiry_branding(text) to anon, authenticated;
