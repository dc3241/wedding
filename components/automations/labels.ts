import {
  LEAD_STAGE_LABEL,
  type LeadStage,
} from "@/components/leads/types";
import {
  PROPOSAL_STATUS_LABEL,
  type ProposalStatus,
} from "@/components/proposals/types";
import type { JsonObject } from "@/lib/automations/types";

export const TRIGGER_KIND_LABEL: Record<string, string> = {
  lead_stage_changed: "Lead stage changed",
  lead_created: "Lead created",
  project_created: "Project created",
  proposal_status_changed: "Proposal status changed",
  invoice_sent: "Invoice sent",
  payment_link_set: "Payment link set",
  invoice_marked_paid: "Invoice marked paid",
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
  const toStatus =
    typeof triggerConfig.to_status === "string" ? triggerConfig.to_status : "";
  if (toStatus && toStatus in PROPOSAL_STATUS_LABEL) {
    return `${base} → ${PROPOSAL_STATUS_LABEL[toStatus as ProposalStatus]}`;
  }
  return base;
}
