-- ============================================================
-- 0084_payment_reminder_log.sql
-- AUTO-01: send log for payment-schedule watch (Vercel Cron).
-- Written/read only by the service-role cron route — never by the
-- user-facing client. RLS on, zero policies (same posture as
-- demo_start_attempts / 0073).
--
-- One-shot kinds (due_7, due_2, overdue_first) are structurally
-- unique per installment. overdue_recurring is deliberately NOT
-- covered by that unique index: it sends repeatedly. The 5-day
-- gate between recurring sends is read-time logic in the cron
-- route (last overdue_recurring row older than 5 days), not a
-- structural constraint.
-- ============================================================

create table if not exists payment_reminder_log (
  id                  uuid primary key default gen_random_uuid(),
  payment_schedule_id uuid not null references payment_schedule (id) on delete cascade,
  project_id          uuid not null,
  reminder_kind       text not null,
  sent_at             timestamptz not null default now(),
  constraint payment_reminder_log_kind_check
    check (reminder_kind in ('due_7', 'due_2', 'overdue_first', 'overdue_recurring'))
);

-- One-shot kinds fire at most once per installment. Recurring nags
-- are excluded so the table can hold many overdue_recurring rows.
create unique index if not exists payment_reminder_log_oneshot_idx
  on payment_reminder_log (payment_schedule_id, reminder_kind)
  where reminder_kind in ('due_7', 'due_2', 'overdue_first');

create index if not exists payment_reminder_log_schedule_idx
  on payment_reminder_log (payment_schedule_id);

alter table payment_reminder_log enable row level security;
-- No policies for anon/authenticated — service_role only.
