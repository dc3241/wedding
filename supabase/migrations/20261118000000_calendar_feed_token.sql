-- CAL-FEED-01 — private calendar subscription link (.ics) per project.
--
-- calendar_feed_token is null until someone on the wedding clicks
-- "Subscribe", and can be replaced ("Reset link") to revoke old copies.
-- Written through the existing projects UPDATE policy (can_edit_project).
-- Read only by the public /cal/[token] route via the service-role client;
-- there is NO anon policy on projects, and none is added here.
-- Same generation as rsvp_token / confirm_token / invoice access_token.

alter table public.projects
  add column if not exists calendar_feed_token text;

create unique index if not exists projects_calendar_feed_token_key
  on public.projects (calendar_feed_token)
  where calendar_feed_token is not null;

alter table public.projects
  drop constraint if exists projects_calendar_feed_token_format;
alter table public.projects
  add constraint projects_calendar_feed_token_format
  check (calendar_feed_token is null or calendar_feed_token ~ '^[0-9a-f]{32}$');
