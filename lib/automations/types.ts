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
  "send_email",
] as const;

export type AutomationActionKind = (typeof AUTOMATION_ACTION_KINDS)[number];

/** Wired triggers only — schema also allows lead_created / project_created. */
export const AUTOMATION_UI_TRIGGER_KINDS = ["lead_stage_changed"] as const;
export type AutomationUiTriggerKind =
  (typeof AUTOMATION_UI_TRIGGER_KINDS)[number];

/** Offered in the builder. create_task is omitted (needs a project). */
export const AUTOMATION_UI_ACTION_KINDS = [
  "add_note",
  "change_lead_stage",
  "send_email",
] as const;
export type AutomationUiActionKind =
  (typeof AUTOMATION_UI_ACTION_KINDS)[number];

export const WORKFLOW_EMAIL_TOKEN_CHIPS = [
  { token: "{{couple_name}}", label: "Couple name" },
  { token: "{{account_name}}", label: "Account name" },
  { token: "{{wedding_date}}", label: "Wedding date" },
] as const;

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
 *  send_email: { subject: string, body: string } — tokens
 *    {{couple_name}}, {{account_name}}, {{wedding_date}} only.
 *    Inserts a pending workflow_email draft; never sends.
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

export type UpdateAutomationStepFields = {
  action_kind?: AutomationActionKind;
  action_config?: JsonObject;
  delay_days?: number;
};

export type AutomationMutationResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type AutomationWriteResult = { ok: true } | { ok: false; error: string };

export type AutomationStepRow = {
  id: string;
  workflow_id: string;
  position: number;
  action_kind: string;
  action_config: JsonObject;
  delay_days: number;
};

export type AutomationRunSummary = {
  id: string;
  status: string;
  target_kind: string;
  target_id: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type AutomationWorkflowListItem = {
  id: string;
  name: string;
  trigger_kind: string;
  trigger_config: JsonObject;
  enabled: boolean;
  updated_at: string;
  step_count: number;
  run_count: number;
};

export type AutomationWorkflowDetail = {
  id: string;
  account_id: string;
  name: string;
  trigger_kind: string;
  trigger_config: JsonObject;
  enabled: boolean;
  steps: AutomationStepRow[];
  runs: AutomationRunSummary[];
};
