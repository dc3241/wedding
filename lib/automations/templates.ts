import type {
  AddAutomationStepInput,
  AutomationTriggerKind,
  JsonObject,
} from "@/lib/automations/types";

export const AUTOMATION_TEMPLATE_KEYS = [
  "booking_confirmation",
  "proposal_followup_note",
  "lost_lead_note",
  "new_inquiry_note",
  "proposal_declined_note",
  "invoice_sent_followup",
  "payment_received_thanks",
] as const;

export type AutomationTemplateKey =
  (typeof AUTOMATION_TEMPLATE_KEYS)[number];

export type AutomationTemplate = {
  key: AutomationTemplateKey;
  name: string;
  description: string;
  trigger_kind: Exclude<AutomationTriggerKind, "project_created">;
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
  {
    key: "new_inquiry_note",
    name: "Log a note when a new lead arrives",
    description:
      "When a lead is created (form, email, or manual), adds an internal note on the lead.",
    trigger_kind: "lead_created",
    trigger_config: {},
    steps: [
      {
        action_kind: "add_note",
        delay_days: 0,
        action_config: {
          title: "New inquiry",
          body: "{{couple_name}} just came in — review and reply when ready.",
        },
      },
    ],
  },
  {
    key: "proposal_declined_note",
    name: "Log a note when a proposal is declined",
    description:
      "When a proposal is marked Declined, adds an internal note — nothing sent to the couple.",
    trigger_kind: "proposal_status_changed",
    trigger_config: { to_status: "declined" },
    steps: [
      {
        action_kind: "add_note",
        delay_days: 0,
        action_config: {
          title: "Proposal declined",
          body: "{{couple_name}} declined the proposal — note why and decide next steps.",
        },
      },
    ],
  },
  {
    key: "invoice_sent_followup",
    name: "Remind yourself after sending an invoice",
    description:
      "When you send an invoice on a booked lead's project, adds a follow-up note three days later.",
    trigger_kind: "invoice_sent",
    trigger_config: {},
    steps: [
      {
        action_kind: "add_note",
        delay_days: 3,
        action_config: {
          title: "Invoice follow-up",
          body: "Check whether {{couple_name}} has paid, or nudge if needed.",
        },
      },
    ],
  },
  {
    key: "payment_received_thanks",
    name: "Draft a thank-you when an invoice is marked paid",
    description:
      "When you mark an invoice paid (via your payment link or ledger), drafts a thank-you email for approval.",
    trigger_kind: "invoice_marked_paid",
    trigger_config: {},
    steps: [
      {
        action_kind: "send_email",
        delay_days: 0,
        action_config: {
          subject: "Thank you!",
          body: "Hi {{couple_name}}, we've received your payment — thank you! Looking forward to celebrating with you.",
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
