-- ============================================================
-- drop_content_queue_kie.sql
-- Produce renders stills in-process. Drop leftover KIE task
-- columns and the webhook-only atomic slide writer.
-- ============================================================

drop function if exists public.content_queue_set_slide(uuid, integer, text);

alter table content_queue
  drop column if exists kie_task_id;

alter table content_queue
  drop column if exists kie_task_ids;
