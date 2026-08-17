export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

/** Propose-then-approve queue row for the Assistant panel Pending section. */
export type AgentDraftPreview = {
  id: string;
  kind: "vendor_outreach" | "inquiry_reply";
  subject: string | null;
  status: "pending" | "approved" | "rejected" | "sent";
};

export type SendAssistantResult =
  | { success: true; reply: string }
  | { success: false; error: string };
