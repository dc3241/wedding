-- ============================================================
-- 0088_agent_drafts_outreach.sql
-- AGENT-03: audit FK from draft → sent outreach_messages, plus
-- authenticated INSERT/UPDATE for impersonated create + human
-- approve/reject. Same is_account_member CRM gate as SELECT
-- (AGENT-00) — invited project members cannot see or touch these.
--
-- INSERT is required: unattended create_agent_draft uses a real
-- RLS session, not service-role. UPDATE is the approve/reject path.
-- ============================================================

alter table agent_drafts
  add column if not exists outreach_message_id uuid
    references outreach_messages (id) on delete set null;

drop policy if exists "agent_drafts insertable by account members" on agent_drafts;
create policy "agent_drafts insertable by account members"
  on agent_drafts for insert
  to authenticated
  with check (is_account_member(account_id));

drop policy if exists "agent_drafts updatable by account members" on agent_drafts;
create policy "agent_drafts updatable by account members"
  on agent_drafts for update
  to authenticated
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
