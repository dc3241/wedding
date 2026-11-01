import type {
  AssistantAccessSummary,
  AssistantLockReason,
} from "@/lib/billing/assistant-budget";

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

/** Propose-then-approve queue row for the Assistant panel Pending section. */
export type AgentDraftKind =
  | "vendor_outreach"
  | "inquiry_reply"
  | "workflow_email";

export type AgentDraftPreview = {
  id: string;
  kind: AgentDraftKind;
  subject: string | null;
  body: string | null;
  status: "pending" | "approved" | "rejected" | "sent";
  targetLabel: string;
};

export function isLeadEmailDraftKind(
  kind: string,
): kind is "inquiry_reply" | "workflow_email" {
  return kind === "inquiry_reply" || kind === "workflow_email";
}

export type SendAssistantResult =
  | { success: true; reply: string; access?: AssistantAccessSummary }
  | {
      success: false;
      error: string;
      /** Set when the assistant is locked (trial over / allowance used). */
      code?: AssistantLockReason;
      access?: AssistantAccessSummary;
    };
