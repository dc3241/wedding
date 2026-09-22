-- ============================================================
-- 0122_proposal_public_token.sql
-- Phase B: public proposal share link + token-gated read.
-- Couples Accept/Decline via app server actions (service role)
-- after verifying the token — convert stays in TypeScript.
-- Draft proposals are hidden from the public RPC.
-- ============================================================

alter table proposals
  add column if not exists access_token text;

update proposals
set access_token = encode(extensions.gen_random_bytes(16), 'hex')
where access_token is null;

alter table proposals
  alter column access_token set default encode(extensions.gen_random_bytes(16), 'hex');

alter table proposals
  alter column access_token set not null;

create unique index if not exists proposals_access_token_uidx
  on proposals (access_token);

-- ---------- public token read ----------
-- Unknown / draft tokens return proposal_found = false.
-- Never returns account_id, lead_id, or access_token.
create or replace function get_proposal_by_token(p_token text)
returns table (
  proposal_found      boolean,
  title               text,
  status              text,
  notes               text,
  terms               text,
  total               numeric,
  line_items          jsonb,
  accepted_at         timestamptz,
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
