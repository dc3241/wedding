-- ============================================================
-- 0132_inquiry_header_sidebar.sql
-- Public inquiry hero can use the venue sidebar color.
-- Return type changes, so replace cannot be create-or-replace.
-- Still returns only account_found + brand fields. Never
-- account_id, email, or any other accounts column.
-- ============================================================

drop function if exists get_inquiry_branding(text);

create function get_inquiry_branding(p_slug text)
returns table (
  account_found boolean,
  brand_name text,
  brand_logo_url text,
  brand_accent_color text,
  brand_sidebar_color text
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
  v_sidebar text;
begin
  select
    a.white_label_enabled,
    a.brand_name,
    a.brand_logo_url,
    a.brand_accent_color,
    a.brand_sidebar_color
  into v_white, v_name, v_logo, v_accent, v_sidebar
  from accounts a
  where a.inquiry_slug = btrim(coalesce(p_slug, ''))
    and a.kind = 'business';

  if not found then
    account_found := false;
    brand_name := null;
    brand_logo_url := null;
    brand_accent_color := null;
    brand_sidebar_color := null;
    return next;
    return;
  end if;

  account_found := true;
  if v_white then
    brand_name := v_name;
    brand_logo_url := v_logo;
    brand_accent_color := v_accent;
    brand_sidebar_color := v_sidebar;
  else
    brand_name := null;
    brand_logo_url := null;
    brand_accent_color := null;
    brand_sidebar_color := null;
  end if;
  return next;
end;
$$;

revoke all on function get_inquiry_branding(text) from public;
grant execute on function get_inquiry_branding(text) to anon, authenticated;
