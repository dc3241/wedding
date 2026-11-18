-- RSVP-AUTO-01 — RSVP deadline + automatic reminder scheduling.
--
--  * wedding_websites.rsvp_deadline — the date guests should answer by.
--    Shown on the public RSVP form ("Please RSVP by …"); a rider on the
--    existing published-only anon SELECT (no policy change).
--  * wedding_websites.rsvp_chase_sent — which automatic reminder rounds
--    were already queued for the current deadline ('d21', 'd7'). Reset when
--    the deadline changes. Written by the daily cron (service role).
--
-- Reminders still go through the rsvp_reminder proposal: nothing is
-- emailed to guests until the couple taps Send reminders. Re-runnable.

alter table public.wedding_websites
  add column if not exists rsvp_deadline date,
  add column if not exists rsvp_chase_sent text[] not null default '{}';

alter table public.wedding_websites
  drop constraint if exists wedding_websites_rsvp_chase_sent_values;
alter table public.wedding_websites
  add constraint wedding_websites_rsvp_chase_sent_values
  check (rsvp_chase_sent <@ array['d21', 'd7']::text[]);
