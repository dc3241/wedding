import type {
  AddAutomationStepInput,
  AutomationTriggerKind,
  JsonObject,
} from "@/lib/automations/types";

export const AUTOMATION_TEMPLATE_KEYS = [
  "booking_confirmation",
  "proposal_followup_note",
  "lost_lead_note",
] as const;

export type AutomationTemplateKey =
  (typeof AUTOMATION_TEMPLATE_KEYS)[number];

export type AutomationTemplate = {
  key: AutomationTemplateKey;
  name: string;
  description: string;
  trigger_kind: Extract<AutomationTriggerKind, "lead_stage_changed">;
  trigger_config: JsonObject;
  steps: AddAutomationStepInput[];
};

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    key: "booking_confirmation",
    name: "Send a welcome note when you book a wedding",
    description:
      "When a lead moves to Booked, drafts a welcome email for your approval.",
    trigger_kind: "lead_stage_changed",
    trigger_config: { to_stage: "booked" },
    steps: [
      {
        action_kind: "send_email",
        delay_days: 0,
        action_config: {
          subject: "Welcome!",
          body: "Hi {{couple_name}}, we're so glad to be part of your wedding. I'll be in touch with next steps shortly.",
        },
      },
    ],
  },
  {
    key: "proposal_followup_note",
    name: "Remind yourself to follow up after sending a proposal",
    description:
      "When a lead moves to Proposal, adds an internal reminder — nothing sent to the couple.",
    trigger_kind: "lead_stage_changed",
    trigger_config: { to_stage: "proposal" },
    steps: [
      {
        action_kind: "add_note",
        delay_days: 3,
        action_config: {
          title: "Proposal follow-up",
          body: "Follow up with {{couple_name}} on the proposal.",
        },
      },
    ],
  },
  {
    key: "lost_lead_note",
    name: "Log a note when you lose a lead",
    description:
      "When a lead moves to Lost, adds a note so you remember why — nothing sent to anyone.",
    trigger_kind: "lead_stage_changed",
    trigger_config: { to_stage: "lost" },
    steps: [
      {
        action_kind: "add_note",
        delay_days: 0,
        action_config: {
          title: "Lost lead",
          body: "{{couple_name}} — log why this lead was lost.",
        },
      },
    ],
  },
];

export function isAutomationTemplateKey(
  value: string,
): value is AutomationTemplateKey {
  return (AUTOMATION_TEMPLATE_KEYS as readonly string[]).includes(value);
}

export function getAutomationTemplate(
  key: string,
): AutomationTemplate | undefined {
  return AUTOMATION_TEMPLATES.find((template) => template.key === key);
}
