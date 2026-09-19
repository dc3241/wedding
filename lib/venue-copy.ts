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
    sidebarActiveProjects: "Active weddings",
    newProject: "New wedding",
    openProject: "Open wedding",
    projectNameLabel: "Wedding name",
    dashboardSection: "Weddings",
    dashboardDescription: "Your weddings at a glance.",
    activeProjectsStat: "Active weddings",
    urgentSection: "Urgent across all weddings",
    emptyProjects:
      "No weddings yet. Create your first client wedding to get started.",
    emptyArchived: "No archived weddings yet.",
    projectListAria: "Wedding list",
    leadsTitle: "Leads",
    leadsDescription:
      "Track prospective couples from first inquiry through booked or lost.",
    addLead: "Add lead",
    saveLead: "Save lead",
    emptyLeads:
      "No leads yet. Add a prospective couple to start tracking your pipeline.",
    backToLeads: "← Back to leads",
    selectedProject: "selected wedding",
    templateCopyFailed: "Wedding created, but template copy failed: ",
    sidebarMoney: "Money",
    sidebarInvoices: "Invoices",
    moneyTitle: "Money",
    moneyDescription:
      "What you've billed and collected across weddings. Payment still happens off First Look.",
    moneyByWedding: "By wedding",
    moneyWeddingColumn: "Wedding",
    moneyCsvProjectDate: "Wedding date",
    moneyExportInvoices: "Download invoices",
    moneyExportCollections: "Download collections",
    invoicesTitle: "Invoices",
    invoicesDescription:
      "Every invoice across weddings. Open one to send, record a payment, or change the plan.",
    invoicesEmpty:
      "No invoices yet. Create one on a wedding, then it shows up here.",
    invoicesWeddingFilter: "Wedding",
    invoiceFromProposal: "Create invoice",
    invoiceFromProposalAnother: "Create another invoice",
    invoiceFromProposalEmpty:
      "Create a wedding first, then come back to invoice this proposal.",
    invoiceFromProposalPicker: "Invoice on",
    proposalConvertAndInvoice: "Create wedding and invoice",
  },
  venue: {
    sidebarLeads: "Inquiries",
    sidebarActiveProjects: "Active bookings",
    newProject: "New booking",
    openProject: "Open booking",
    projectNameLabel: "Booking name",
    dashboardSection: "Bookings",
    dashboardDescription: "Your bookings at a glance.",
    activeProjectsStat: "Active bookings",
    urgentSection: "Urgent across all bookings",
    emptyProjects: "No bookings yet. Create your first booking to get started.",
    emptyArchived: "No archived bookings yet.",
    projectListAria: "Booking list",
    leadsTitle: "Inquiries",
    leadsDescription:
      "Track prospective couples from first inquiry through booked or lost.",
    addLead: "Add inquiry",
    saveLead: "Save inquiry",
    emptyLeads:
      "No inquiries yet. Add a prospective couple to start tracking your pipeline.",
    backToLeads: "← Back to inquiries",
    selectedProject: "selected booking",
    templateCopyFailed: "Booking created, but template copy failed: ",
    sidebarMoney: "Money",
    sidebarInvoices: "Invoices",
    moneyTitle: "Money",
    moneyDescription:
      "What you've billed and collected across bookings. Payment still happens off First Look.",
    moneyByWedding: "By booking",
    moneyWeddingColumn: "Booking",
    moneyCsvProjectDate: "Booking date",
    moneyExportInvoices: "Download invoices",
    moneyExportCollections: "Download collections",
    invoicesTitle: "Invoices",
    invoicesDescription:
      "Every invoice across bookings. Open one to send, record a payment, or change the plan.",
    invoicesEmpty:
      "No invoices yet. Create one on a booking, then it shows up here.",
    invoicesWeddingFilter: "Booking",
    invoiceFromProposal: "Create invoice",
    invoiceFromProposalAnother: "Create another invoice",
    invoiceFromProposalEmpty:
      "Create a booking first, then come back to invoice this proposal.",
    invoiceFromProposalPicker: "Invoice on",
    proposalConvertAndInvoice: "Create booking and invoice",
  },
} as const;

export function getCopy(key: CopyKey, plan: string | null | undefined): string {
  if (plan === "venue") {
    return COPY.venue[key];
  }
  return COPY.planner[key];
}
