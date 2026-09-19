export const INVOICE_STATUSES = [
  "draft",
  "sent",
  "partial",
  "paid",
  "void",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_PAYMENT_METHODS = [
  "venmo",
  "zelle",
  "check",
  "cash",
  "stripe_link",
  "other",
] as const;

export type InvoicePaymentMethod = (typeof INVOICE_PAYMENT_METHODS)[number];

export type InvoiceLineKind = "item" | "tax" | "discount";

export type InvoiceLineItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  kind?: InvoiceLineKind;
};

export type InvoiceLineItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  kind: InvoiceLineKind;
  amount: number;
  sort_order: number;
};

export type InvoiceTemplateLine = {
  description: string;
  quantity: number;
  unit_price: number;
  kind: InvoiceLineKind;
};

export type InvoiceTemplate = {
  id: string;
  name: string;
  notes: string | null;
  terms: string | null;
  line_items: InvoiceTemplateLine[];
  created_at: string;
};

export type InvoicePaymentInput = {
  amount: number;
  paidOn: string;
  method: InvoicePaymentMethod;
  note?: string | null;
  externalRef?: string | null;
};

export type InvoicePayment = {
  id: string;
  amount: number;
  paid_on: string;
  method: InvoicePaymentMethod;
  note: string | null;
  external_ref: string | null;
  created_at: string;
};

export type InvoiceScheduleInput = {
  amount: number;
  dueOn: string;
  label?: string | null;
};

export type InvoiceScheduleRow = {
  id: string;
  amount: number;
  due_on: string;
  label: string | null;
  created_at: string;
};

export type InvoiceScheduleInstallment = InvoiceScheduleRow & {
  covered: boolean;
  remaining: number;
};

export type InvoiceNextDue = {
  id: string;
  label: string | null;
  due_on: string;
  remaining: number;
};

export type CreateInvoiceInput = {
  clientName?: string | null;
  clientEmail?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  terms?: string | null;
  paymentLinkUrl?: string | null;
  proposalId?: string | null;
  lineItems: InvoiceLineItemInput[];
};

export type UpdateInvoiceFields = {
  clientName?: string | null;
  clientEmail?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  terms?: string | null;
  paymentLinkUrl?: string | null;
};

export type InvoiceRow = {
  id: string;
  project_id: string;
  invoice_number: string;
  client_name: string | null;
  client_email: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  payment_link_url: string | null;
  notes: string | null;
  terms: string | null;
  access_token: string;
  paid_at: string | null;
  sent_at: string | null;
  created_at: string;
  line_items: InvoiceLineItem[];
  payments: InvoicePayment[];
  schedule: InvoiceScheduleInstallment[];
  nextDue: InvoiceNextDue | null;
  total: number;
  collected: number;
  remaining: number;
};

export type AccountInvoiceRow = InvoiceRow & {
  project_name: string;
  wedding_date: string | null;
  archived_at: string | null;
};

export type InvoiceMutationResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type InvoiceWriteResult =
  | { ok: true }
  | { ok: false; error: string };

export type SendInvoiceResult =
  | { ok: true; emailSent: boolean; publicUrl: string }
  | { ok: false; error: string };

export type PublicInvoiceLineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  kind: InvoiceLineKind;
  amount: number;
  sort_order: number;
};

export type PublicInvoiceScheduleItem = {
  amount: number;
  due_on: string;
  label: string | null;
  covered: boolean;
  remaining: number;
};

export type PublicInvoice = {
  invoice_number: string | null;
  client_name: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  payment_link_url: string | null;
  notes: string | null;
  terms: string | null;
  total: number;
  collected: number;
  remaining: number;
  line_items: PublicInvoiceLineItem[];
  schedule: PublicInvoiceScheduleItem[];
  nextDue: PublicInvoiceScheduleItem | null;
  branding: {
    brandName: string | null;
    brandLogoUrl: string | null;
    brandAccentColor: string | null;
  } | null;
};
