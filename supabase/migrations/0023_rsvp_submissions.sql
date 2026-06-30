-- ============================================================
-- 0023_rsvp_submissions.sql
-- Anonymous RSVP intake from published wedding sites (3.6c).
-- Project-scoped review queue — separate from the guests table.
-- Apply AFTER 0022.
-- ============================================================

create table rsvp_submissions (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,
  response    text not null check (response in ('yes', 'no')),
  party_size  int not null default 1 check (party_size between 1 and 20),
  email       text,
  message     text,
  status      text not null default 'new' check (status in ('new', 'reviewed')),
  created_at  timestamptz not null default now()
);

create index rsvp_submissions_project_created_idx
  on rsvp_submissions (project_id, created_at desc);

alter table rsvp_submissions enable row level security;

-- Anon: INSERT only, gated to published sites.
grant insert on rsvp_submissions to anon;

create policy "rsvp_anon_insert" on rsvp_submissions
  for insert to anon
  with check (
    exists (
      select 1 from wedding_websites w
      where w.project_id = rsvp_submissions.project_id
        and w.published = true
    )
  );

-- Authenticated members: full inbox management via can_access_project.
grant select, update, delete on rsvp_submissions to authenticated;

create policy "rsvp_member_select" on rsvp_submissions
  for select to authenticated
  using (can_access_project(project_id));

create policy "rsvp_member_update" on rsvp_submissions
  for update to authenticated
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

create policy "rsvp_member_delete" on rsvp_submissions
  for delete to authenticated
  using (can_access_project(project_id));
