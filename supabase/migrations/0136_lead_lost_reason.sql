-- Why a lead was marked lost. Null until that transition.
-- Existing lost rows stay valid (reason is not required at the database).
-- The board requires a reason; automations may still set stage without one.

alter table leads add column if not exists lost_reason text;
alter table leads add column if not exists lost_note text;

alter table leads drop constraint if exists leads_lost_reason_check;
alter table leads add constraint leads_lost_reason_check
  check (
    lost_reason is null
    or lost_reason in (
      'budget',
      'date_unavailable',
      'chose_other',
      'no_response',
      'not_a_fit',
      'other'
    )
  );
