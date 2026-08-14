import { toLocalDateKey } from "@/app/(app)/calendar/calendar-source";
import {
  sumPartySize,
  sumPartySizeByStatus,
  type Guest,
} from "@/app/(app)/projects/[projectId]/guests/types";
import { parseWeddingWebsiteContent } from "@/components/website/types";
import {
  computeBudgetAggregates,
  type BudgetItemForAggregate,
  type ProjectVendorOption,
} from "@/lib/budget-aggregates";
import { placesTextSearch } from "@/lib/places-text-search";
import { resolveProjectLocationHint } from "@/lib/resolve-project-location-hint";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isTaskPastDue } from "@/lib/task-overdue";
import { vendorCategoryLabel } from "@/lib/vendor-categories";

const NEARBY_PLACE_CATEGORIES = ["lodging", "airport", "restaurant"] as const;
type NearbyPlaceCategory = (typeof NEARBY_PLACE_CATEGORIES)[number];

const NEARBY_CATEGORY_LABELS: Record<NearbyPlaceCategory, string> = {
  lodging: "hotels",
  airport: "airports",
  restaurant: "restaurants",
};

const CHECKLIST_ITEMS_CAP = 25;
const GUESTS_ITEMS_CAP = 40;
const BUDGET_ITEMS_CAP = 20;
const BUDGET_PAYMENTS_CAP = 25;
const PAYMENT_SCHEDULE_CAP = 25;
const VENDORS_ITEMS_CAP = 30;
const VENDOR_TARGETS_ITEMS_CAP = 30;
const NOTES_ITEMS_CAP = 20;
const TIMELINE_ITEMS_CAP = 60;
const WEBSITE_SCHEDULE_TITLES_CAP = 10;
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
      "Get budget target, allocated/actual/paid/committed totals, and line items (estimate, actual, paid, difference). Paid is from the payment ledger only. Use for budget remaining and spending questions.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_budget_payments",
    description:
      "Get logged payments from the budget payment ledger (date, amount, linked line item). Use for 'what have we paid so far' with specifics — not actual_amount.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_payment_schedule",
    description:
      "Get payment-schedule installments with covered/uncovered status (waterfall vs ledger paid). Prioritizes overdue and upcoming. Use for 'what's due next' and overdue payment questions.",
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
  {
    name: "get_website",
    description:
      "Get a compact summary of this project's wedding website: whether it exists, schedule item count/titles, and whether Wedding Details are populated. Use before filling the Schedule or answering website-state questions.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "search_nearby_places",
    description:
      "Search Google Places for nearby hotels (lodging), airports, or restaurants near the couple's venue. Read-only — returns candidates for Travel & Stay copy. Pass near to override the venue location; if location cannot be resolved, returns needsLocation and you must ask the couple.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: [...NEARBY_PLACE_CATEGORIES],
          description: "lodging (hotels), airport, or restaurant",
        },
        near: {
          type: "string",
          description:
            "Optional location override (address or city). When omitted, uses the project's venue address if known.",
        },
      },
      required: ["category"] as string[],
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
    overdue: isTaskPastDue(task.due_date, task.status),
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
      "id, full_name, email, phone, household, party_size, rsvp_status, notes",
    )
    .eq("project_id", projectId)
    .order("household", { ascending: true, nullsFirst: false })
    .order("full_name", { ascending: true });

  if (error) throw error;

  const list = ((guests ?? []) as Omit<Guest, "members">[]).map((guest) => ({
    ...guest,
    members: [],
  }));
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

async function loadBudgetAggregateInputs(
  supabase: SupabaseClient,
  projectId: string,
) {
  const [
    { data: project, error: projectError },
    { data: items, error: itemsError },
    { data: vendorRows, error: vendorsError },
    { data: paymentRows, error: paymentsError },
    { data: scheduleRows, error: scheduleError },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("total_budget")
      .eq("id", projectId)
      .single(),
    supabase
      .from("budget_items")
      .select(
        "id, category, label, planned_amount, actual_amount, due_date, notes, project_vendor_id",
      )
      .eq("project_id", projectId)
      .order("category", { ascending: true, nullsFirst: false })
      .order("label", { ascending: true }),
    supabase
      .from("project_vendors")
      .select("id, quoted_price, status, vendors(name)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("budget_payments")
      .select("id, budget_item_id, amount, paid_on, note, created_at")
      .eq("project_id", projectId)
      .order("paid_on", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("payment_schedule")
      .select("id, budget_item_id, amount, due_on, label")
      .eq("project_id", projectId)
      .order("due_on", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (projectError) throw projectError;
  if (itemsError) throw itemsError;
  if (vendorsError) throw vendorsError;
  if (paymentsError) throw paymentsError;
  if (scheduleError) throw scheduleError;

  const totalBudget =
    project?.total_budget === null || project?.total_budget === undefined
      ? null
      : Number(project.total_budget);

  const budgetItems = (items ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    label: row.label,
    planned_amount: Number(row.planned_amount),
    actual_amount:
      row.actual_amount === null || row.actual_amount === undefined
        ? null
        : Number(row.actual_amount),
    due_date: row.due_date ?? null,
    notes: row.notes,
    project_vendor_id: row.project_vendor_id ?? null,
  }));

  const projectVendors: ProjectVendorOption[] = (vendorRows ?? []).flatMap(
    (row) => {
      const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
      if (!vendor) return [];
      return [
        {
          id: row.id,
          name: vendor.name,
          quoted_price:
            row.quoted_price === null || row.quoted_price === undefined
              ? null
              : Number(row.quoted_price),
          status: row.status,
        },
      ];
    },
  );

  const payments = (paymentRows ?? []).map((row) => ({
    id: row.id,
    budget_item_id: row.budget_item_id,
    amount: Number(row.amount),
    paid_on: row.paid_on ?? null,
    note: row.note ?? null,
    created_at: row.created_at as string,
  }));

  const schedule = (scheduleRows ?? []).map((row) => ({
    id: row.id,
    budget_item_id: row.budget_item_id,
    amount: Number(row.amount),
    due_on: row.due_on,
    label: row.label ?? null,
  }));

  const todayKey = toLocalDateKey(new Date());
  const aggregates = computeBudgetAggregates(
    budgetItems,
    totalBudget,
    projectVendors,
    payments,
    schedule,
    todayKey,
  );

  const flatItems: BudgetItemForAggregate[] = aggregates.perCategory.flatMap(
    (group) => group.items,
  );
  const itemLabelById = new Map(
    flatItems.map((item) => [item.id, item.label ?? "Untitled"]),
  );

  return {
    todayKey,
    aggregates,
    flatItems,
    payments,
    itemLabelById,
  };
}

async function getBudget(supabase: SupabaseClient, projectId: string) {
  const { aggregates, flatItems } = await loadBudgetAggregateInputs(
    supabase,
    projectId,
  );

  const sortedItems = [...flatItems].sort(
    (a, b) => b.planned_amount - a.planned_amount,
  );
  const trimmedItems = sortedItems.map((item) => ({
    id: item.id,
    label: item.label,
    category: item.category,
    estimate: item.planned_amount,
    actual: item.actual_amount,
    paid: item.paid,
    difference: item.difference,
  }));
  const { items: cappedItems, truncated: itemsTruncated } = capItems(
    trimmedItems,
    BUDGET_ITEMS_CAP,
  );

  return {
    summary: {
      target: aggregates.totalBudget,
      allocated: aggregates.allocated,
      actual: aggregates.actualTotal,
      paid: aggregates.paidTotal,
      committed: aggregates.committed,
      unallocated: aggregates.unallocated,
    },
    items: cappedItems,
    total: flatItems.length,
    returned: cappedItems.length,
    truncated: itemsTruncated || cappedItems.length < flatItems.length,
  };
}

async function getBudgetPayments(supabase: SupabaseClient, projectId: string) {
  const { aggregates, payments, itemLabelById } =
    await loadBudgetAggregateInputs(supabase, projectId);

  const sorted = [...payments].sort((a, b) => {
    const aDate = a.paid_on ?? "";
    const bDate = b.paid_on ?? "";
    if (aDate !== bDate) return bDate.localeCompare(aDate);
    return b.created_at.localeCompare(a.created_at);
  });

  const trimmed = sorted.map((payment) => ({
    id: payment.id,
    paid_on: payment.paid_on,
    amount: payment.amount,
    budget_item_id: payment.budget_item_id,
    item_label: itemLabelById.get(payment.budget_item_id) ?? "Untitled",
    note: excerpt(payment.note, 80) || null,
  }));

  const { items, truncated: capped } = capItems(trimmed, BUDGET_PAYMENTS_CAP);

  return {
    summary: {
      paid_total: aggregates.paidTotal,
      count: payments.length,
    },
    items,
    total: payments.length,
    returned: items.length,
    truncated: capped || items.length < payments.length,
  };
}

async function getPaymentSchedule(supabase: SupabaseClient, projectId: string) {
  const { todayKey, aggregates, flatItems } = await loadBudgetAggregateInputs(
    supabase,
    projectId,
  );

  type ScheduleRow = {
    id: string;
    budget_item_id: string;
    item_label: string;
    amount: number;
    due_on: string;
    label: string | null;
    covered: boolean;
    overdue: boolean;
  };

  const allRows: ScheduleRow[] = [];
  let coveredCount = 0;
  let overdueCount = 0;
  let upcomingCount = 0;

  for (const item of flatItems) {
    for (const installment of item.schedule) {
      const overdue = !installment.covered && installment.due_on < todayKey;
      const upcoming = !installment.covered && installment.due_on >= todayKey;
      if (installment.covered) coveredCount += 1;
      if (overdue) overdueCount += 1;
      if (upcoming) upcomingCount += 1;

      allRows.push({
        id: installment.id,
        budget_item_id: item.id,
        item_label: item.label ?? "Untitled",
        amount: installment.amount,
        due_on: installment.due_on,
        label: installment.label,
        covered: installment.covered,
        overdue,
      });
    }
  }

  // Actionable first: overdue, then upcoming uncovered, then covered.
  const actionable = allRows
    .filter((row) => !row.covered)
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.due_on !== b.due_on) return a.due_on.localeCompare(b.due_on);
      return a.id.localeCompare(b.id);
    });

  const { items, truncated: capped } = capItems(
    actionable,
    PAYMENT_SCHEDULE_CAP,
  );

  const nextDueCandidates = actionable.filter((row) => !row.overdue);
  const nextDue = nextDueCandidates[0] ?? null;

  return {
    summary: {
      paid_total: aggregates.paidTotal,
      installment_count: allRows.length,
      covered: coveredCount,
      overdue: overdueCount,
      upcoming: upcomingCount,
      next_due: nextDue
        ? {
            due_on: nextDue.due_on,
            amount: nextDue.amount,
            item_label: nextDue.item_label,
            label: nextDue.label,
          }
        : null,
    },
    items,
    total: actionable.length,
    returned: items.length,
    truncated: capped || items.length < actionable.length,
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
    category: vendorCategoryLabel(target.category),
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
    .select("id, title, body, updated_at, action_status")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const list = [...(notes ?? [])].sort((a, b) => {
    const aPin = a.action_status === "needs_action" ? 0 : 1;
    const bPin = b.action_status === "needs_action" ? 0 : 1;
    if (aPin !== bPin) return aPin - bPin;
    return String(b.updated_at).localeCompare(String(a.updated_at));
  });
  const total = list.length;
  const needsActionCount = list.filter(
    (note) => note.action_status === "needs_action",
  ).length;
  const trimmed = list.map((note) => ({
    id: note.id,
    title: note.title,
    updated_at: note.updated_at,
    action_status: note.action_status ?? null,
    excerpt: excerpt(note.body),
  }));

  const { items, truncated: capped } = capItems(trimmed, NOTES_ITEMS_CAP);

  return {
    summary: { total, needs_action: needsActionCount },
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
    .select("id, title, body, updated_at, action_status")
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
    action_status: note.action_status ?? null,
  };
}

async function getWebsite(supabase: SupabaseClient, projectId: string) {
  const { data: row, error } = await supabase
    .from("wedding_websites")
    .select("content")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw error;

  if (!row) {
    return { exists: false };
  }

  const content = parseWeddingWebsiteContent(row.content);
  const titles = content.schedule.items
    .map((item) => item.title.trim())
    .filter(Boolean)
    .slice(0, WEBSITE_SCHEDULE_TITLES_CAP);

  const details = content.details;
  const populated = [
    details.ceremonyVenue,
    details.ceremonyAddress,
    details.ceremonyTime,
    details.receptionVenue,
    details.receptionAddress,
    details.receptionTime,
  ].some((value) => value.trim().length > 0);

  return {
    exists: true,
    schedule: {
      itemCount: content.schedule.items.length,
      visible: content.schedule.visible,
      titles,
    },
    details: { populated },
    travel: {
      visible: content.travel.visible,
      hasIntro: Boolean(content.travel.body.trim()),
      placeCount: content.travel.places.filter((p) => p.name.trim()).length,
      empty: !content.travel.body.trim() &&
        !content.travel.places.some((p) => p.name.trim()),
    },
  };
}

function isNearbyPlaceCategory(value: string): value is NearbyPlaceCategory {
  return (NEARBY_PLACE_CATEGORIES as readonly string[]).includes(value);
}

async function searchNearbyPlaces(
  supabase: SupabaseClient,
  projectId: string,
  input: Record<string, unknown>,
) {
  const categoryRaw = typeof input.category === "string" ? input.category.trim() : "";
  if (!categoryRaw || !isNearbyPlaceCategory(categoryRaw)) {
    return {
      error: "category must be lodging, airport, or restaurant",
    };
  }

  const nearRaw = typeof input.near === "string" ? input.near.trim() : "";
  const location =
    nearRaw || (await resolveProjectLocationHint(supabase, projectId));

  if (!location) {
    return { needsLocation: true };
  }

  const textQuery = `${NEARBY_CATEGORY_LABELS[categoryRaw]} near ${location}`;
  const search = await placesTextSearch({
    textQuery,
    includedType: categoryRaw,
    maxResultCount: 8,
    strictTypeFiltering: true,
    includePureServiceAreaBusinesses: false,
  });

  if (!search.ok) {
    return { error: search.error };
  }

  return {
    location,
    places: search.places.slice(0, 8).map((place) => ({
      name: place.name,
      address: place.formattedAddress ?? null,
      rating: place.rating ?? null,
      place_id: place.id,
    })),
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
    case "get_budget_payments":
      return getBudgetPayments(supabase, projectId);
    case "get_payment_schedule":
      return getPaymentSchedule(supabase, projectId);
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
    case "get_website":
      return getWebsite(supabase, projectId);
    case "search_nearby_places":
      return searchNearbyPlaces(supabase, projectId, input);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
