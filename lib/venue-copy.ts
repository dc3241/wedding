/**
 * Display-only vocabulary for PlannerShell surfaces.
 * Switch is accounts.plan — no stored preference, no per-account override.
 * Routes, tables, and CRM stage values stay planner-named.
 */

export type CopyPlan = "planner" | "venue";

export type CopyKey = keyof typeof COPY.planner;

export const COPY = {
  planner: {
    sidebarLeads: "Leads",
    sidebarActiveProjects: "Active events",
    newProject: "New event",
    openProject: "Open event",
    projectNameLabel: "Event name",
    dashboardSection: "Events",
    dashboardDescription: "Your events at a glance.",
    activeProjectsStat: "Active events",
    urgentSection: "Urgent across all events",
    emptyProjects:
      "No events yet. Create your first client event to get started.",
    emptyArchived: "No archived events yet.",
    projectListAria: "Event list",
    leadsTitle: "Leads",
    leadsDescription:
      "Track prospective couples from first inquiry through booked or lost.",
    addLead: "Add lead",
    saveLead: "Save lead",
    emptyLeads:
      "No leads yet. Add a prospective couple to start tracking your pipeline.",
    dateConflict: "Same date as",
    backToLeads: "← Back to leads",
    selectedProject: "selected event",
    templateCopyFailed: "Event created, but template copy failed: ",
    sidebarMoney: "Money",
    sidebarInvoices: "Invoices",
    moneyTitle: "Money",
    moneyDescription:
      "What you've billed and collected across events. Payment still happens off First Look.",
    moneyByWedding: "By event",
    moneyWeddingColumn: "Event",
    moneyCsvProjectDate: "Event date",
    moneyExportInvoices: "Download invoices",
    moneyExportCollections: "Download collections",
    invoicesTitle: "Invoices",
    invoicesDescription:
      "Every invoice across events. Open one to send, record a payment, or change the plan.",
    invoicesEmpty:
      "No invoices yet. Create one on an event, then it shows up here.",
    invoicesWeddingFilter: "Event",
    invoiceFromProposal: "Create invoice",
    invoiceFromProposalAnother: "Create another invoice",
    invoiceFromProposalEmpty:
      "Create an event first, then come back to invoice this proposal.",
    invoiceFromProposalPicker: "Invoice on",
    proposalConvertAndInvoice: "Create event and invoice",
  },
  venue: {
    sidebarLeads: "Inquiries",
    sidebarActiveProjects: "Active events",
    newProject: "New event",
    openProject: "Open event",
    projectNameLabel: "Event name",
    dashboardSection: "Events",
    dashboardDescription: "Your events at a glance.",
    activeProjectsStat: "Active events",
    urgentSection: "Urgent across all events",
    emptyProjects: "No events yet. Create your first event to get started.",
    emptyArchived: "No archived events yet.",
    projectListAria: "Event list",
    leadsTitle: "Inquiries",
    leadsDescription:
      "Track prospective couples from first inquiry through booked or lost.",
    addLead: "Add inquiry",
    saveLead: "Save inquiry",
    emptyLeads:
      "No inquiries yet. Add a prospective couple to start tracking your pipeline.",
    dateConflict: "Also on this date:",
    backToLeads: "← Back to inquiries",
    selectedProject: "selected event",
    templateCopyFailed: "Event created, but template copy failed: ",
    sidebarMoney: "Money",
    sidebarInvoices: "Invoices",
    moneyTitle: "Money",
    moneyDescription:
      "What you've billed and collected across events. Payment still happens off First Look.",
    moneyByWedding: "By event",
    moneyWeddingColumn: "Event",
    moneyCsvProjectDate: "Event date",
    moneyExportInvoices: "Download invoices",
    moneyExportCollections: "Download collections",
    invoicesTitle: "Invoices",
    invoicesDescription:
      "Every invoice across events. Open one to send, record a payment, or change the plan.",
    invoicesEmpty:
      "No invoices yet. Create one on an event, then it shows up here.",
    invoicesWeddingFilter: "Event",
    invoiceFromProposal: "Create invoice",
    invoiceFromProposalAnother: "Create another invoice",
    invoiceFromProposalEmpty:
      "Create an event first, then come back to invoice this proposal.",
    invoiceFromProposalPicker: "Invoice on",
    proposalConvertAndInvoice: "Create event and invoice",
  },
} as const;

export function getCopy(key: CopyKey, plan: string | null | undefined): string {
  if (plan === "venue") {
    return COPY.venue[key];
  }
  return COPY.planner[key];
}
