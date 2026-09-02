export const INVOICE_STATUSES = ["draft", "sent", "paid", "void"] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type InvoiceLineItemInput = {
  description: string;
  amount: number;
};

export type InvoiceLineItem = InvoiceLineItemInput & {
  id: string;
  sort_order: number;
};

export type CreateInvoiceInput = {
  clientName?: string | null;
  clientEmail?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  lineItems: InvoiceLineItemInput[];
};

export type UpdateInvoiceFields = {
  clientName?: string | null;
  clientEmail?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  paymentLinkUrl?: string | null;
};

export type InvoiceRow = {
  id: string;
  project_id: string;
  client_name: string | null;
  client_email: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  payment_link_url: string | null;
  notes: string | null;
  access_token: string;
  paid_at: string | null;
  sent_at: string | null;
  created_at: string;
  line_items: InvoiceLineItem[];
  total: number;
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
  amount: number;
  sort_order: number;
};

export type PublicInvoice = {
  client_name: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  payment_link_url: string | null;
  notes: string | null;
  total: number;
  line_items: PublicInvoiceLineItem[];
};
