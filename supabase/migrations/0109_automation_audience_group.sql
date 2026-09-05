-- ============================================================
-- 0109_automation_audience_group.sql
-- ADMIN-AUD-08: tag admin_automation_prompts by audience so the
-- Couples / Venues & planners automations pages filter on a column,
-- not on prompt name (names are editable in the UI).
--
-- Also seeds the two planner prompts the mockup showed that 0105
-- never inserted (Reddit comment draft, YouTube video idea batch).
--
-- Dollar-quoted strings so apostrophes in prompt copy cannot
-- terminate a literal (that is what produced: relation "the"
-- does not exist). Re-runnable. Hand-paste only.
-- ============================================================

alter table admin_automation_prompts
  add column if not exists audience_group text;

alter table admin_automation_prompts drop constraint if exists admin_automation_prompts_audience_group_check;
alter table admin_automation_prompts add constraint admin_automation_prompts_audience_group_check
  check (audience_group is null or audience_group in ('couples', 'planner'));

update admin_automation_prompts
set audience_group = 'couples'
where name in (
  'New content-day batch',
  'Turn a TikTok script into IG/FB',
  'Pinterest pin variations',
  $aud09$Fill next month's Schedule tab$aud09$
)
and audience_group is null;

update admin_automation_prompts
set audience_group = 'planner'
where name in (
  'LinkedIn post draft',
  'Monthly performance read'
)
and audience_group is null;

insert into admin_automation_prompts (name, description, prompt_template, audience_group)
select
  'Reddit comment draft',
  $aud09$Drafts a genuine, advice-first reply to a specific thread in Jordyn's voice. 1-in-10 mention rule, no Type D content ever.$aud09$,
  $aud09$Draft a genuine, advice-first Reddit comment in Jordyn's voice (a working wedding planner) for the thread in the user message.

Rules:
- Lead with useful advice. No hard sell.
- First Look may be mentioned at most 1 in 10 comments. Default to no product mention unless the thread is specifically about tools or workflow.
- Never Type D / direct promo. Never use the word "AI".
- Keep it under 150 words, conversational, not corporate.

The user message will include the subreddit, thread title, and what was asked. Format the reply ready to paste into the thread.$aud09$,
  'planner'
where not exists (
  select 1 from admin_automation_prompts where name = 'Reddit comment draft'
);

insert into admin_automation_prompts (name, description, prompt_template, audience_group)
select
  'YouTube video idea batch',
  $aud09$Generates 3-5 fresh long-form and Shorts ideas split evenly across couples and planner audiences, for when the channel goes live.$aud09$,
  $aud09$Generate 3-5 YouTube video ideas for First Look, a wedding-planning SaaS, for when the channel goes live.

Split evenly across couples-facing and planner/venue-facing. Mix long-form and Shorts.

Never use the word "AI". For each idea give: Title | Audience (Couples or Planner) | Format (Long-form or Shorts) | One-sentence angle.

Format ready to paste into the YouTube Bank tab (Idea | Format | Content).$aud09$,
  'planner'
where not exists (
  select 1 from admin_automation_prompts where name = 'YouTube video idea batch'
);
