export const AUTOMATION_TRIGGER_KINDS = [
  "lead_stage_changed",
  "lead_created",
  "project_created",
] as const;

export type AutomationTriggerKind = (typeof AUTOMATION_TRIGGER_KINDS)[number];

export const AUTOMATION_ACTION_KINDS = [
  "create_task",
  "change_lead_stage",
  "add_note",
] as const;

export type AutomationActionKind = (typeof AUTOMATION_ACTION_KINDS)[number];

export type JsonObject = Record<string, unknown>;

export type CreateAutomationWorkflowInput = {
  name: string;
  trigger_kind: AutomationTriggerKind;
  trigger_config?: JsonObject;
  enabled?: boolean;
};

export type UpdateAutomationWorkflowFields = {
  name?: string;
  trigger_kind?: AutomationTriggerKind;
  trigger_config?: JsonObject;
  enabled?: boolean;
};

/** action_config by action_kind:
 *  add_note: { title?: string, body?: string, project_id?: string }
 *    Lead-targeted runs write leads.notes unless project_id is set
 *    (then notes table via addNote).
 *  change_lead_stage: { stage: LeadStage } (to_stage also accepted)
 *  create_task: { title: string, project_id: string, due_date?: string, phase?: string }
 */
export type AddAutomationStepInput = {
  action_kind: AutomationActionKind;
  action_config?: JsonObject;
  delay_days?: number;
  position?: number;
};

export type ReorderAutomationStepItem = {
  id: string;
  position: number;
};

export type AutomationMutationResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type AutomationWriteResult = { ok: true } | { ok: false; error: string };
