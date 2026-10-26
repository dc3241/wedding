-- ============================================================
-- 0140_vendor_share_inbox.sql
-- VND-SHARE-02: email-style thread per project_vendor.
-- Not outreach_messages (those are project-wide via can_access_project).
-- Anon never SELECTs this table. Vendor read/write is token RPC only.
-- Authenticated: SELECT can_access_project; INSERT owner+can_edit_project.
-- ============================================================

alter table project_vendors
  add column if not exists share_owner_last_read_at timestamptz;

alter table project_vendors
  add column if not exists share_vendor_last_read_at timestamptz;

create table if not exists vendor_share_messages (
  id                 uuid primary key default gen_random_uuid(),
  project_vendor_id  uuid not null references project_vendors (id) on delete cascade,
  project_id         uuid not null references projects (id) on delete cascade,
  author             text not null,
  body               text not null,
  created_at         timestamptz not null default now(),
  created_by         uuid references auth.users (id) on delete set null,
  constraint vendor_share_messages_author_check
    check (author in ('owner', 'vendor')),
  constraint vendor_share_messages_body_len
    check (char_length(body) between 1 and 4000)
);

create index if not exists vendor_share_messages_pv_created_idx
  on vendor_share_messages (project_vendor_id, created_at);

alter table vendor_share_messages enable row level security;

drop policy if exists "vendor share messages readable by project members"
  on vendor_share_messages;
create policy "vendor share messages readable by project members"
  on vendor_share_messages for select to authenticated
  using (can_access_project(project_id));

drop policy if exists "vendor share messages insertable by editors as owner"
  on vendor_share_messages;
create policy "vendor share messages insertable by editors as owner"
  on vendor_share_messages for insert to authenticated
  with check (
    can_edit_project(project_id)
    and author = 'owner'
    and created_by = auth.uid()
    and project_id = (
      select pv.project_id
      from project_vendors pv
      where pv.id = project_vendor_id
    )
  );

revoke all on table vendor_share_messages from public;
revoke all on table vendor_share_messages from anon;
revoke all on table vendor_share_messages from authenticated;
grant select, insert on table vendor_share_messages to authenticated;

-- ---------- vendor read (token) ----------
create or replace function list_vendor_share_messages(p_token text)
returns table (
  thread_found boolean,
  messages     jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pv_id uuid;
begin
  if nullif(btrim(coalesce(p_token, '')), '') is null then
    thread_found := false;
    messages := null;
    return next;
    return;
  end if;

  select pv.id into v_pv_id
  from project_vendors pv
  where pv.confirm_token = btrim(p_token);

  if v_pv_id is null then
    thread_found := false;
    messages := null;
    return next;
    return;
  end if;

  update project_vendors
  set share_vendor_last_read_at = now()
  where id = v_pv_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'author', m.author,
        'body', m.body,
        'created_at', m.created_at
      )
      order by m.created_at
    ),
    '[]'::jsonb
  )
    into messages
  from vendor_share_messages m
  where m.project_vendor_id = v_pv_id;

  thread_found := true;
  return next;
end;
$$;

revoke all on function list_vendor_share_messages(text) from public;
grant execute on function list_vendor_share_messages(text) to anon, authenticated;

-- ---------- vendor write (token) ----------
create or replace function post_vendor_share_message(p_token text, p_body text)
returns table (
  posted     boolean,
  error_code text,
  message    jsonb,
  project_id uuid,
  vendor_id  uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  c_throttle_window constant interval := interval '1 minute';
  c_throttle_max constant int := 5;
  v_pv_id uuid;
  v_project_id uuid;
  v_vendor_id uuid;
  v_body text;
  v_recent int;
  v_id uuid;
  v_created timestamptz;
begin
  posted := false;
  error_code := null;
  message := null;
  project_id := null;
  vendor_id := null;

  if nullif(btrim(coalesce(p_token, '')), '') is null then
    error_code := 'invalid_token';
    return next;
    return;
  end if;

  v_body := btrim(coalesce(p_body, ''));
  if v_body = '' then
    error_code := 'empty';
    return next;
    return;
  end if;
  if char_length(v_body) > 4000 then
    error_code := 'too_long';
    return next;
    return;
  end if;

  select pv.id, pv.project_id, pv.vendor_id
    into v_pv_id, v_project_id, v_vendor_id
  from project_vendors pv
  where pv.confirm_token = btrim(p_token);

  if v_pv_id is null then
    error_code := 'invalid_token';
    return next;
    return;
  end if;

  select count(*) into v_recent
  from vendor_share_messages m
  where m.project_vendor_id = v_pv_id
    and m.author = 'vendor'
    and m.created_at > now() - c_throttle_window;

  if v_recent >= c_throttle_max then
    error_code := 'throttled';
    return next;
    return;
  end if;

  insert into vendor_share_messages (
    project_vendor_id, project_id, author, body, created_by
  )
  values (v_pv_id, v_project_id, 'vendor', v_body, null)
  returning id, created_at into v_id, v_created;

  posted := true;
  project_id := v_project_id;
  vendor_id := v_vendor_id;
  message := jsonb_build_object(
    'id', v_id,
    'author', 'vendor',
    'body', v_body,
    'created_at', v_created
  );
  return next;
end;
$$;

revoke all on function post_vendor_share_message(text, text) from public;
grant execute on function post_vendor_share_message(text, text) to anon, authenticated;
