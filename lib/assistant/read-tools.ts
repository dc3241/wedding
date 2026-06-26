import {
  sumPlanned,
  sumVendorCosts,
  type BookedVendorCost,
  type BudgetItem,
} from "@/app/(app)/projects/[projectId]/budget/types";
import {
  sumPartySize,
  sumPartySizeByStatus,
  type Guest,
} from "@/app/(app)/projects/[projectId]/guests/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const READ_TOOL_DEFINITIONS = [
  {
    name: "get_checklist",
    description:
      "Get all checklist tasks for this wedding, including status, phase, and due dates. Use for overdue items, progress, and what's next.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_guests",
    description:
      "Get the guest list with RSVP status, party sizes, meal choices, and summary counts. Use for RSVP questions.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_budget",
    description:
      "Get the budget target, line items, booked vendor costs, and allocation totals. Use for budget remaining and spending questions.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_vendors",
    description:
      "Get vendors linked to this wedding with status, quotes, and contact info. Use for vendor pipeline questions.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_vendor_targets",
    description:
      "Get vendor categories the couple still needs to book, with notes and status.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_notes",
    description: "Get project notes with titles and bodies.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
] as const;

export type ReadToolName = (typeof READ_TOOL_DEFINITIONS)[number]["name"];

function isOverdue(
  dueDate: string | null,
  status: "todo" | "in_progress" | "done",
) {
  if (!dueDate || status === "done") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  return due < today;
}

async function getChecklist(supabase: SupabaseClient, projectId: string) {
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, status, phase, due_date")
    .eq("project_id", projectId)
    .order("phase", { ascending: true })
    .order("position", { ascending: true });

  if (error) throw error;

  const list = (tasks ?? []).map((task) => ({
    ...task,
    overdue: isOverdue(
      task.due_date,
      task.status as "todo" | "in_progress" | "done",
    ),
  }));

  const overdue = list.filter((task) => task.overdue);
  const done = list.filter((task) => task.status === "done");

  return {
    total: list.length,
    doneCount: done.length,
    overdueCount: overdue.length,
    overdue,
    tasks: list,
  };
}

async function getGuests(supabase: SupabaseClient, projectId: string) {
  const { data: guests, error } = await supabase
    .from("guests")
    .select(
      "id, full_name, email, phone, household, party_size, rsvp_status, meal_choice, notes",
    )
    .eq("project_id", projectId)
    .order("household", { ascending: true, nullsFirst: false })
    .order("full_name", { ascending: true });

  if (error) throw error;

  const list = (guests ?? []) as Guest[];

  return {
    totalGuests: list.length,
    totalPartySize: sumPartySize(list),
    attending: sumPartySizeByStatus(list, "attending"),
    declined: sumPartySizeByStatus(list, "declined"),
    pending: sumPartySizeByStatus(list, "pending"),
    guests: list,
  };
}

async function getBudget(supabase: SupabaseClient, projectId: string) {
  const [{ data: project, error: projectError }, { data: items, error: itemsError }, { data: vendorRows, error: vendorsError }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("total_budget")
        .eq("id", projectId)
        .single(),
      supabase
        .from("budget_items")
        .select("id, category, label, planned_amount, actual_amount, notes")
        .eq("project_id", projectId)
        .order("category", { ascending: true, nullsFirst: false })
        .order("label", { ascending: true }),
      supabase
        .from("project_vendors")
        .select("id, quoted_price, vendors(name, category)")
        .eq("project_id", projectId)
        .eq("status", "booked")
        .not("quoted_price", "is", null)
        .order("created_at", { ascending: true }),
    ]);

  if (projectError) throw projectError;
  if (itemsError) throw itemsError;
  if (vendorsError) throw vendorsError;

  const target =
    project?.total_budget === null || project?.total_budget === undefined
      ? null
      : Number(project.total_budget);

  const budgetItems: BudgetItem[] = (items ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    label: row.label,
    planned_amount: Number(row.planned_amount),
    actual_amount:
      row.actual_amount === null || row.actual_amount === undefined
        ? null
        : Number(row.actual_amount),
    notes: row.notes,
  }));

  const bookedVendors: BookedVendorCost[] = (vendorRows ?? []).flatMap(
    (row) => {
      const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
      if (!vendor || row.quoted_price === null) return [];
      return [
        {
          id: row.id,
          quoted_price: Number(row.quoted_price),
          vendor: {
            name: vendor.name,
            category: vendor.category,
          },
        },
      ];
    },
  );

  const itemsPlanned = sumPlanned(budgetItems);
  const vendorCommitted = sumVendorCosts(bookedVendors);
  const allocated = itemsPlanned + vendorCommitted;
  const remaining = target !== null ? target - allocated : null;

  return {
    target,
    itemsPlanned,
    vendorCommitted,
    allocated,
    remaining,
    items: budgetItems,
    bookedVendors,
  };
}

async function getVendors(supabase: SupabaseClient, projectId: string) {
  const { data: rows, error } = await supabase
    .from("project_vendors")
    .select(
      "id, status, quoted_price, vendors(id, name, category, contact_email, website)",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const vendors = (rows ?? []).flatMap((row) => {
    const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
    if (!vendor) return [];
    return [
      {
        id: row.id,
        status: row.status,
        quoted_price:
          row.quoted_price === null || row.quoted_price === undefined
            ? null
            : Number(row.quoted_price),
        vendor: {
          id: vendor.id,
          name: vendor.name,
          category: vendor.category,
          contact_email: vendor.contact_email,
          website: vendor.website,
        },
      },
    ];
  });

  return { total: vendors.length, vendors };
}

async function getVendorTargets(supabase: SupabaseClient, projectId: string) {
  const { data: targets, error } = await supabase
    .from("vendor_targets")
    .select("id, category, note, status")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return { total: (targets ?? []).length, targets: targets ?? [] };
}

async function getNotes(supabase: SupabaseClient, projectId: string) {
  const { data: notes, error } = await supabase
    .from("notes")
    .select("id, title, body, updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return { total: (notes ?? []).length, notes: notes ?? [] };
}

export async function executeReadTool(
  supabase: SupabaseClient,
  projectId: string,
  toolName: string,
): Promise<unknown> {
  switch (toolName as ReadToolName) {
    case "get_checklist":
      return getChecklist(supabase, projectId);
    case "get_guests":
      return getGuests(supabase, projectId);
    case "get_budget":
      return getBudget(supabase, projectId);
    case "get_vendors":
      return getVendors(supabase, projectId);
    case "get_vendor_targets":
      return getVendorTargets(supabase, projectId);
    case "get_notes":
      return getNotes(supabase, projectId);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
