-- ============================================================
-- 0130_proposal_signature.sql
-- Couple signature on a public proposal accept.
-- signed_name is the typed name. Null means accepted without
-- a couple signature (planner status change). A signed row
-- is locked in the app: status, edits, and delete are refused.
-- Hand-paste only — never supabase db push.
-- ============================================================

alter table proposals
  add column if not exists signed_name text;

alter table proposals
  drop constraint if exists proposals_signed_name_check;

alter table proposals
  add constraint proposals_signed_name_check
  check (
    signed_name is null
    or (
      char_length(btrim(signed_name)) >= 1
      and char_length(signed_name) <= 200
    )
  );

-- Return type changes, so replace cannot be create-or-replace.
drop function if exists get_proposal_by_token(text);

create function get_proposal_by_token(p_token text)
returns table (
  proposal_found      boolean,
  title               text,
  status              text,
  notes               text,
  terms               text,
  total               numeric,
  line_items          jsonb,
  accepted_at         timestamptz,
  signed_name         text,
  couple_name         text,
  wedding_date        date,
  account_name        text,
  brand_name          text,
  brand_logo_url      text,
  brand_accent_color  text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_id uuid;
begin
  if nullif(btrim(coalesce(p_token, '')), '') is null then
    proposal_found := false;
    return next;
    return;
  end if;

  select p.id into v_id
  from proposals p
  where p.access_token = btrim(p_token)
    and p.status in ('sent', 'accepted', 'declined');

  if v_id is null then
    proposal_found := false;
    return next;
    return;
  end if;

  return query
  select
    true,
    p.title,
    p.status,
    p.notes,
    p.terms,
    p.total,
    p.line_items,
    p.accepted_at,
    p.signed_name,
    l.couple_name,
    l.wedding_date,
    a.name,
    case when a.white_label_enabled then a.brand_name else null end,
    case when a.white_label_enabled then a.brand_logo_url else null end,
    case when a.white_label_enabled then a.brand_accent_color else null end
  from proposals p
  join leads l on l.id = p.lead_id
  join accounts a on a.id = p.account_id
  where p.id = v_id;
end;
$$;

revoke all on function get_proposal_by_token(text) from public;
grant execute on function get_proposal_by_token(text) to anon, authenticated;
