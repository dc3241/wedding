export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type SendAssistantResult =
  | { success: true; reply: string }
  | { success: false; error: string };
