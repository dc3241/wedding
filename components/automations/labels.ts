import {
  LEAD_STAGE_LABEL,
  type LeadStage,
} from "@/components/leads/types";
import type { JsonObject } from "@/lib/automations/types";

export const TRIGGER_KIND_LABEL: Record<string, string> = {
  lead_stage_changed: "Lead stage changed",
  lead_created: "Lead created",
  project_created: "Project created",
};

export const ACTION_KIND_LABEL: Record<string, string> = {
  add_note: "Add note",
  change_lead_stage: "Change lead stage",
  send_email: "Send email",
  create_task: "Create task",
};

export function triggerSummary(
  triggerKind: string,
  triggerConfig: JsonObject,
): string {
  const base = TRIGGER_KIND_LABEL[triggerKind] ?? triggerKind;
  const toStage =
    typeof triggerConfig.to_stage === "string" ? triggerConfig.to_stage : "";
  if (toStage && toStage in LEAD_STAGE_LABEL) {
    return `${base} → ${LEAD_STAGE_LABEL[toStage as LeadStage]}`;
  }
  return base;
}
