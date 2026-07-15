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

const CHECKLIST_ITEMS_CAP = 25;
const GUESTS_ITEMS_CAP = 40;
const BUDGET_ITEMS_CAP = 20;
const VENDORS_ITEMS_CAP = 30;
const VENDOR_TARGETS_ITEMS_CAP = 30;
const NOTES_ITEMS_CAP = 20;
const TIMELINE_ITEMS_CAP = 60;
const EXCERPT_MAX_CHARS = 200;

export const READ_TOOL_DEFINITIONS = [
  {
    name: "get_checklist",
    description:
      "Get checklist tasks for this wedding: summary counts plus the most relevant overdue and incomplete tasks. Use for overdue items, progress, and what's next.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_guests",
    description:
      "Get guest list summary counts plus pending/non-responded guests (the actionable set). Use for RSVP questions.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_budget",
    description:
      "Get budget target, allocation totals, largest line items, and booked-vendor cost summary. Use for budget remaining and spending questions.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_vendors",
    description:
      "Get vendors linked to this wedding: status counts plus a capped list with quotes and contact info. Use for vendor pipeline questions.",
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
    description:
      "Get project note titles and short excerpts (not full bodies). Use get_note(id) when full text is needed.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_note",
    description:
      "Get a single project note in full by id. Use get_notes first to find the id when the user needs the full note text.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "UUID of the note" },
      },
      required: ["id"] as string[],
    },
  },
  {
    name: "get_timeline",
    description:
      "Get the day-of wedding run sheet: summary counts plus time-ordered events (not the long-range checklist). Use before continuing or summarizing an existing timeline.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
] as const;

export type ReadToolName = (typeof READ_TOOL_DEFINITIONS)[number]["name"];

function excerpt(
  text: string | null | undefined,
  maxChars = EXCERPT_MAX_CHARS,
): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}…`;
}

function capItems<T>(items: T[], cap: number): { items: T[]; truncated: boolean } {
  if (items.length <= cap) {
    return { items, truncated: false };
  }
  return { items: items.slice(0, cap), truncated: true };
}

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

  const total = list.length;
  const todoCount = list.filter((task) => task.status === "todo").length;
  const inProgressCount = list.filter(
    (task) => task.status === "in_progress",
  ).length;
  const doneCount = list.filter((task) => task.status === "done").length;
  const overdueCount = list.filter((task) => task.overdue).length;

  const actionable = list
    .filter((task) => task.status !== "done")
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    })
    .map((task) => ({
      id: task.id,
      title: task.title,
      due_date: task.due_date,
      status: task.status,
      category: task.phase,
    }));

  const { items, truncated: capped } = capItems(actionable, CHECKLIST_ITEMS_CAP);

  return {
    summary: {
      total,
      todo: todoCount,
      in_progress: inProgressCount,
      done: doneCount,
      overdue: overdueCount,
    },
    items,
    total,
    returned: items.length,
    truncated: capped || items.length < actionable.length,
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
  const total = list.length;

  const pendingGuests = list
    .filter((guest) => guest.rsvp_status === "pending")
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
    .map((guest) => ({
      id: guest.id,
      name: guest.full_name,
      rsvp_status: guest.rsvp_status,
      party_size: guest.party_size,
    }));

  const { items, truncated: capped } = capItems(pendingGuests, GUESTS_ITEMS_CAP);

  return {
    summary: {
      total,
      party_size: sumPartySize(list),
      rsvp: {
        yes: sumPartySizeByStatus(list, "attending"),
        no: sumPartySizeByStatus(list, "declined"),
        pending: sumPartySizeByStatus(list, "pending"),
      },
    },
    items,
    total,
    returned: items.length,
    truncated: capped || items.length < pendingGuests.length,
  };
}

async function getBudget(supabase: SupabaseClient, projectId: string) {
  const [
    { data: project, error: projectError },
    { data: items, error: itemsError },
    { data: vendorRows, error: vendorsError },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("total_budget")
      .eq("id", projectId)
      .single(),
    supabase
      .from("budget_items")
      .select(
        "id, category, label, planned_amount, actual_amount, notes, project_vendor_id",
      )
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
    project_vendor_id: row.project_vendor_id ?? null,
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

  const allocated = sumPlanned(budgetItems) + sumVendorCosts(bookedVendors);
  const remaining = target !== null ? target - allocated : null;

  const sortedItems = [...budgetItems].sort(
    (a, b) => b.planned_amount - a.planned_amount,
  );
  const trimmedItems = sortedItems.map((item) => ({
    id: item.id,
    label: item.label,
    category: item.category,
    planned_amount: item.planned_amount,
    actual_amount: item.actual_amount,
  }));
  const { items: cappedItems, truncated: itemsTruncated } = capItems(
    trimmedItems,
    BUDGET_ITEMS_CAP,
  );

  const vendorTotal = sumVendorCosts(bookedVendors);
  const topVendors = [...bookedVendors]
    .sort((a, b) => b.quoted_price - a.quoted_price)
    .slice(0, 3)
    .map((row) => ({
      name: row.vendor.name,
      amount: row.quoted_price,
    }));

  return {
    summary: {
      target,
      allocated,
      remaining,
    },
    items: cappedItems,
    total: budgetItems.length,
    returned: cappedItems.length,
    truncated: itemsTruncated || cappedItems.length < budgetItems.length,
    bookedVendors: {
      count: bookedVendors.length,
      total: vendorTotal,
      top: topVendors,
    },
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

  const total = vendors.length;
  const statusCounts: Record<string, number> = {};
  for (const row of vendors) {
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
  }

  const trimmed = vendors.map((row) => ({
    id: row.id,
    name: row.vendor.name,
    status: row.status,
    quote: row.quoted_price,
    primary_contact: row.vendor.contact_email ?? row.vendor.website ?? null,
  }));

  const { items, truncated: capped } = capItems(trimmed, VENDORS_ITEMS_CAP);

  return {
    summary: { total, by_status: statusCounts },
    items,
    total,
    returned: items.length,
    truncated: capped || items.length < vendors.length,
  };
}

async function getVendorTargets(supabase: SupabaseClient, projectId: string) {
  const { data: targets, error } = await supabase
    .from("vendor_targets")
    .select("id, category, note, status")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const list = targets ?? [];
  const total = list.length;
  const trimmed = list.map((target) => ({
    id: target.id,
    category: target.category,
    status: target.status,
    note: excerpt(target.note),
  }));

  const { items, truncated: capped } = capItems(
    trimmed,
    VENDOR_TARGETS_ITEMS_CAP,
  );

  return {
    summary: { total },
    items,
    total,
    returned: items.length,
    truncated: capped || items.length < list.length,
  };
}

async function getNotes(supabase: SupabaseClient, projectId: string) {
  const { data: notes, error } = await supabase
    .from("notes")
    .select("id, title, body, updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const list = notes ?? [];
  const total = list.length;
  const trimmed = list.map((note) => ({
    id: note.id,
    title: note.title,
    updated_at: note.updated_at,
    excerpt: excerpt(note.body),
  }));

  const { items, truncated: capped } = capItems(trimmed, NOTES_ITEMS_CAP);

  return {
    summary: { total },
    items,
    total,
    returned: items.length,
    truncated: capped || items.length < list.length,
  };
}

async function getTimeline(supabase: SupabaseClient, projectId: string) {
  const { data: rows, error } = await supabase
    .from("timeline_events")
    .select(
      "id, title, description, start_time, end_time, section, owner, position",
    )
    .eq("project_id", projectId)
    .order("start_time", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true });

  if (error) throw error;

  const list = rows ?? [];
  const total = list.length;

  const sections = new Set<string>();
  let earliestStart: string | null = null;
  let latestStart: string | null = null;

  for (const row of list) {
    const section = row.section?.trim();
    if (section) sections.add(section);

    if (row.start_time) {
      if (!earliestStart || row.start_time < earliestStart) {
        earliestStart = row.start_time;
      }
      if (!latestStart || row.start_time > latestStart) {
        latestStart = row.start_time;
      }
    }
  }

  const trimmed = list.map((row) => ({
    id: row.id,
    title: row.title,
    start_time: row.start_time,
    end_time: row.end_time,
    section: row.section,
    owner: row.owner,
    description: excerpt(row.description),
  }));

  const { items, truncated: capped } = capItems(trimmed, TIMELINE_ITEMS_CAP);

  return {
    summary: {
      total,
      section_count: sections.size,
      earliest_start: earliestStart,
      latest_start: latestStart,
    },
    items,
    total,
    returned: items.length,
    truncated: capped || items.length < list.length,
  };
}

async function getNote(
  supabase: SupabaseClient,
  projectId: string,
  noteId: string,
) {
  const { data: note, error } = await supabase
    .from("notes")
    .select("id, title, body, updated_at")
    .eq("project_id", projectId)
    .eq("id", noteId)
    .maybeSingle();

  if (error) throw error;
  if (!note) {
    return { error: "Note not found" };
  }

  return {
    id: note.id,
    title: note.title,
    body: note.body,
    updated_at: note.updated_at,
  };
}

export async function executeReadTool(
  supabase: SupabaseClient,
  projectId: string,
  toolName: string,
  input: Record<string, unknown> = {},
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
    case "get_note": {
      const id = typeof input.id === "string" ? input.id.trim() : "";
      if (!id) return { error: "id is required" };
      return getNote(supabase, projectId, id);
    }
    case "get_timeline":
      return getTimeline(supabase, projectId);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
