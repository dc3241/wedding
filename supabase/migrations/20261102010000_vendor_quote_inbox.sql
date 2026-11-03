-- ============================================================
-- 20261102010000_vendor_quote_inbox.sql
-- AGENTIC-03: capture vendor email replies and turn them into quotes.
--
--  * outreach_messages.inbound_email_id — Resend email id of a captured
--    vendor reply; unique so a webhook retry can't double-insert.
--  * project_vendors.quote_details — structured quote the couple approved
--    (availability, price basis, deposit, inclusions, ...). quoted_price
--    stays the single number; details live beside it.
--  * assistant_proposals.kind gains 'vendor_quote' (approve-before-save).
--  * assistant_usage.source gains 'quote_extraction' (metered model cost).
--
-- No new tables, no new policies, no anon surface. Re-runnable.
-- Hand-paste only — never supabase db push.
-- ============================================================

alter table outreach_messages
  add column if not exists inbound_email_id text;

create unique index if not exists outreach_messages_inbound_email_id_key
  on outreach_messages (inbound_email_id)
  where inbound_email_id is not null;

alter table project_vendors
  add column if not exists quote_details jsonb;

alter table assistant_proposals drop constraint if exists assistant_proposals_kind_check;
alter table assistant_proposals add constraint assistant_proposals_kind_check
  check (kind in ('budget_change', 'vendor_quote'));

alter table assistant_usage drop constraint if exists assistant_usage_source_check;
alter table assistant_usage add constraint assistant_usage_source_check
  check (source in ('chat', 'synthesis', 'implication_scan', 'outreach_scan', 'quote_extraction'));

-- Checkpoint after paste:
--   select column_name from information_schema.columns
--     where (table_name, column_name) in (('outreach_messages','inbound_email_id'),('project_vendors','quote_details'));  -- 2 rows
--   select pg_get_constraintdef(oid) from pg_constraint
--     where conname in ('assistant_proposals_kind_check','assistant_usage_source_check');
--   select indexname from pg_indexes where indexname = 'outreach_messages_inbound_email_id_key';
