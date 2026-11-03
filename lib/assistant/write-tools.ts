import { addTask, toggleTask } from "@/app/(app)/projects/[projectId]/checklist/actions";
import { addGuest, updateRsvp } from "@/app/(app)/projects/[projectId]/guests/actions";
import type { RsvpStatus } from "@/app/(app)/projects/[projectId]/guests/types";
import {
  addBudgetItem,
  setBudgetTarget,
} from "@/app/(app)/projects/[projectId]/budget/actions";
import { addNote, updateNote } from "@/app/(app)/projects/[projectId]/notes/actions";
import type { NoteActionStatus } from "@/app/(app)/projects/[projectId]/notes/types";
import { createAgentDraft } from "@/lib/assistant/create-agent-draft";
import {
  createBudgetProposal,
  createReplanProposal,
  createRsvpReminderProposal,
} from "@/lib/assistant/proposals";
import { createContractTermsProposal } from "@/lib/assistant/contract-terms";
import {
  addSeatingRule,
  createSeatingPlanProposal,
} from "@/lib/seating/auto-seat";
import { runVendorEnrichment } from "@/lib/vendor-enrichment";
import {
  fetchPlaceBasics,
  MAX_SHORTLIST_ADDS,
  SCOUT_CATEGORY_IDS,
} from "@/lib/vendors/scout";
import {
  addDiscoveredVendor,
  addVendorTarget,
} from "@/app/(app)/projects/[projectId]/vendors/actions";
import {
  addEvent,
  addEvents,
} from "@/app/(app)/projects/[projectId]/timeline/actions";
import {
  setWeddingWebsiteSchedule,
  setWeddingWebsiteTravel,
} from "@/app/(app)/projects/[projectId]/website/actions";
import { phaseFromMonthsBefore } from "@/lib/checklist-phases";
import {
  clampDueDateToToday,
  wholeMonthsBetween,
} from "@/lib/date-months";
import { VENDOR_CATEGORIES } from "@/lib/vendor-categories";
import { clientForWrite } from "@/utils/supabase/for-write";
import type { SupabaseClient } from "@supabase/supabase-js";

const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
const RSVP_STATUSES = ["pending", "attending", "declined"] as const;
const VENDOR_CATEGORY_IDS = VENDOR_CATEGORIES.map((c) => c.id);


type TaskStatus = (typeof TASK_STATUSES)[number];

export const WRITE_TOOL_DEFINITIONS = [
  {
    name: "add_task",
    description:
      "Add a new checklist task. Use when the user clearly asks to add or create a task. Optional due_date (YYYY-MM-DD); phase is derived from that date automatically — do not invent phase labels. Omit due_date for an undated ad-hoc task.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Task title" },
        due_date: {
          type: "string",
          description: "Optional due date in YYYY-MM-DD format",
        },
      },
      required: ["title"] as string[],
    },
  },
  {
    name: "update_task_status",
    description:
      "Set a checklist task's status. Use get_checklist first to find the task_id when needed.",
    input_schema: {
      type: "object" as const,
      properties: {
        task_id: { type: "string", description: "UUID of the task" },
        status: {
          type: "string",
          enum: [...TASK_STATUSES],
          description: "New status: todo, in_progress, or done",
        },
      },
      required: ["task_id", "status"] as string[],
    },
  },
  {
    name: "add_guest",
    description:
      "Add a guest to the guest list. Use when the user clearly asks to add someone.",
    input_schema: {
      type: "object" as const,
      properties: {
        full_name: { type: "string", description: "Guest full name" },
        household: {
          type: "string",
          description: "Optional household or group name",
        },
        party_size: {
          type: "number",
          description: "Number of people in the party (default 1)",
        },
        phone: { type: "string", description: "Optional phone number" },
        email: {
          type: "string",
          description: "Optional household email (used for RSVP reminders)",
        },
        address: {
          type: "string",
          description: "Optional household mailing address",
        },
      },
      required: ["full_name"] as string[],
    },
  },
  {
    name: "update_guest_rsvp",
    description:
      "Update a guest's RSVP status. Use get_guests first to find the guest_id when needed.",
    input_schema: {
      type: "object" as const,
      properties: {
        guest_id: { type: "string", description: "UUID of the guest" },
        status: {
          type: "string",
          enum: [...RSVP_STATUSES],
          description: "RSVP status: pending, attending, or declined",
        },
      },
      required: ["guest_id", "status"] as string[],
    },
  },
  {
    name: "set_budget_target",
    description:
      "Set the overall budget target amount. Use when the user clearly asks to set or change the total budget.",
    input_schema: {
      type: "object" as const,
      properties: {
        amount: {
          type: "number",
          description: "Total budget target in dollars",
        },
      },
      required: ["amount"] as string[],
    },
  },
  {
    name: "add_budget_item",
    description:
      "Add a budget line item. Use when the user clearly asks to add a budget entry. Vendor name (label) is optional when no vendor is booked yet.",
    input_schema: {
      type: "object" as const,
      properties: {
        label: {
          type: "string",
          description:
            "Optional vendor name. Omit or leave blank when no vendor is known yet.",
        },
        category: {
          type: "string",
          description: "Optional category (e.g. Catering, Flowers)",
        },
        planned_amount: {
          type: "number",
          description: "Planned amount in dollars",
        },
      },
      required: ["planned_amount"] as string[],
    },
  },
  {
    name: "propose_budget_changes",
    description:
      "Propose a set of budget edits for the user to approve. NOTHING changes until they tap Apply in the Pending panel, so use this (not set_budget_target / add_budget_item) whenever you recommend rebalancing, reallocating, or setting several amounts. Call get_budget first so item_ids and current amounts are real. Max 12 changes.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Short title, e.g. 'Rebalance for a $35k budget'.",
        },
        summary: {
          type: "string",
          description: "One or two sentences on why, in plain prose.",
        },
        changes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              op: {
                type: "string",
                enum: ["set_target", "set_planned", "add_item"],
                description:
                  "set_target: change the total budget. set_planned: change an existing line's planned amount. add_item: add a new line.",
              },
              item_id: {
                type: "string",
                description: "Required for set_planned: the budget item id from get_budget.",
              },
              category: {
                type: "string",
                description: "For add_item: category (e.g. Catering).",
              },
              label: {
                type: "string",
                description: "For add_item: optional vendor or line name.",
              },
              amount: {
                type: "number",
                description:
                  "Dollars: the new total (set_target), new planned amount (set_planned), or planned amount (add_item).",
              },
            },
            required: ["op", "amount"] as string[],
          },
        },
      },
      required: ["title", "changes"] as string[],
    },
  },
  {
    name: "propose_contract_terms",
    description:
      "After reading an uploaded contract with get_file, propose payment installments, deadline tasks, and a vendor arrival time taken FROM THE CONTRACT, for the user to approve. NOTHING is added until they tap Apply in the Pending panel. EVERY item must include a 'quote': exact words copied from the contract (8+ characters); the server rejects any item whose quote isn't in the file, so never paraphrase or invent. Use amounts and dates exactly as written. Skip dates already past. Payments need budget_item_id (from get_budget) for that vendor. Arrival time needs the file to be linked to a vendor.",
    input_schema: {
      type: "object" as const,
      properties: {
        file_id: { type: "string", description: "File id from get_files." },
        budget_item_id: {
          type: "string",
          description: "Budget item the payments belong to (required if payments given).",
        },
        summary: { type: "string", description: "One sentence on what was found." },
        payments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "e.g. Deposit, Final balance" },
              amount: { type: "number", description: "Dollars, exactly as in the contract." },
              due_date: { type: "string", description: "YYYY-MM-DD" },
              quote: { type: "string", description: "Exact words from the contract." },
            },
            required: ["amount", "due_date", "quote"] as string[],
          },
        },
        deadlines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Task title, e.g. 'Send final guest count to caterer'" },
              due_date: { type: "string", description: "YYYY-MM-DD" },
              quote: { type: "string", description: "Exact words from the contract." },
            },
            required: ["title", "due_date", "quote"] as string[],
          },
        },
        arrival: {
          type: "object",
          properties: {
            time: { type: "string", description: "24-hour HH:MM" },
            quote: { type: "string", description: "Exact words from the contract." },
          },
          required: ["time", "quote"] as string[],
        },
      },
      required: ["file_id"] as string[],
    },
  },
  {
    name: "add_seating_rule",
    description:
      "Save a seating rule between two guests: 'together' (sit at the same table) or 'apart' (never share a table). Use when the user clearly states one. Get member_ids from find_guests; never guess. Households already sit together automatically, so only add 'together' for people in different households.",
    input_schema: {
      type: "object" as const,
      properties: {
        kind: { type: "string", enum: ["together", "apart"] },
        member_a_id: { type: "string", description: "member_id from find_guests" },
        member_b_id: { type: "string", description: "member_id from find_guests" },
        note: { type: "string", description: "Optional short reason." },
      },
      required: ["kind", "member_a_id", "member_b_id"] as string[],
    },
  },
  {
    name: "propose_seating_plan",
    description:
      "Propose seats for guests who don't have one, for the user to approve. NOTHING changes until they tap Apply in the Pending panel. Only unseated people move; anyone already seated stays put. Households sit together, 'together'/'apart' rules are honored, and people cluster by partner side. Only standard tables are used (head, sweetheart and dance floor are skipped). By default only guests who RSVPed yes are seated; set include_pending to also seat people who haven't answered.",
    input_schema: {
      type: "object" as const,
      properties: {
        include_pending: {
          type: "boolean",
          description: "Also seat guests whose RSVP is still pending. Default false.",
        },
      },
      required: [] as string[],
    },
  },
  {
    name: "propose_rsvp_reminders",
    description:
      "Queue an RSVP reminder email to every household that has not answered, for the user to approve. NOTHING is sent until they tap Send reminders in the Pending panel. Only households with an email on file and no reminder in the last 7 days are included; the rest are reported back. Each email links to that household's own RSVP page. Requires a published wedding website. Optionally pass a short warm message (plain text, no links, under 600 characters, first person plural 'we'); omit to use a default.",
    input_schema: {
      type: "object" as const,
      properties: {
        message: {
          type: "string",
          description:
            "Optional 1-3 sentence note from the couple. No links. Do not mention deadlines or details you have not been given.",
        },
      },
      required: [] as string[],
    },
  },
  {
    name: "propose_checklist_replan",
    description:
      "Propose new due dates for existing checklist tasks and/or new tasks, for the user to approve. NOTHING changes until they tap Apply in the Pending panel. Use it to re-sequence the checklist after the wedding date moves, when tasks have slipped, or to fit booking windows. Call get_checklist first so task ids are real, and get_booking_windows for timing. Dates must be today or later and not after the wedding. Max 15 changes. Done tasks cannot be changed.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Short title, e.g. 'Re-sequence for a June date'." },
        summary: { type: "string", description: "One or two sentences on why." },
        changes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              op: {
                type: "string",
                enum: ["set_due", "add_task"],
                description: "set_due: move an existing task's due date. add_task: add a new task with a due date.",
              },
              task_id: { type: "string", description: "Required for set_due: id from get_checklist." },
              title: { type: "string", description: "Required for add_task: the new task's title." },
              due_date: { type: "string", description: "YYYY-MM-DD." },
            },
            required: ["op", "due_date"] as string[],
          },
        },
      },
      required: ["title", "changes"] as string[],
    },
  },
  {
    name: "add_vendors_to_shortlist",
    description:
      "Add up to 5 vendors from a search_vendors result to this wedding's shortlist (status: to contact) and look up their contact emails. Pass the place_id values EXACTLY as search_vendors returned them. Names and websites are re-verified with Google, so invented ids are rejected. Returns, per vendor, whether a contact email was found. Does not email anyone.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: [...SCOUT_CATEGORY_IDS],
          description: "The vendor category these places were searched under.",
        },
        place_ids: {
          type: "array",
          items: { type: "string" },
          description: "place_id values from search_vendors. Max 5.",
        },
      },
      required: ["category", "place_ids"] as string[],
    },
  },
  {
    name: "add_vendor_target",
    description:
      "Add a vendor category the couple still needs to book. Use when the user clearly asks to track a new vendor type to find. category must be one of the canonical ids.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: VENDOR_CATEGORY_IDS,
          description:
            "Canonical vendor category id from the allowed list (e.g. florist, dj, photographer)",
        },
        note: {
          type: "string",
          description: "Optional note about this vendor need",
        },
      },
      required: ["category"] as string[],
    },
  },
  {
    name: "add_note",
    description:
      "Add a project note. Use when the user clearly asks to save or jot down a note. Optional action_status pins (needs_action) or marks done; omit for an ordinary note.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Optional note title" },
        body: { type: "string", description: "Optional note body" },
        action_status: {
          type: "string",
          enum: ["needs_action", "done"],
          description:
            "Optional. needs_action pins the note with a needs-action indicator. done marks it completed. Omit for an ordinary note.",
        },
      },
      required: [] as string[],
    },
  },
  {
    name: "create_agent_draft",
    description:
      "Queue a vendor follow-up email on the Pending review panel. Does not send. target_id is the account vendor UUID (vendors.id), not a project_vendors row. Only for a vendor already tracked on this project.",
    input_schema: {
      type: "object" as const,
      properties: {
        target_id: {
          type: "string",
          description: "UUID of the account vendor (vendors.id)",
        },
        subject: { type: "string", description: "Email subject" },
        body: { type: "string", description: "Email body, first person" },
      },
      required: ["target_id", "subject", "body"] as string[],
    },
  },
  {
    name: "add_timeline_event",
    description:
      "Add an event to the day-of timeline (run sheet). Use when the user clearly asks to add something to the day-of timeline — not the long-range checklist.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Event title (e.g. Ceremony, First dance)" },
        start_time: {
          type: "string",
          description: "Optional start time in HH:MM 24-hour format (e.g. 16:00 for 4pm)",
        },
        end_time: {
          type: "string",
          description: "Optional end time in HH:MM 24-hour format",
        },
        description: {
          type: "string",
          description: "Optional details for the run sheet",
        },
        section: {
          type: "string",
          description: "Optional section grouping (e.g. Ceremony, Reception)",
        },
        owner: {
          type: "string",
          description: "Optional person responsible (e.g. DJ, photographer)",
        },
      },
      required: ["title"] as string[],
    },
  },
  {
    name: "add_timeline_events",
    description:
      "Add multiple events to the day-of timeline in one batch. Use when generating a full run sheet or adding several events at once — not for a single event.",
    input_schema: {
      type: "object" as const,
      properties: {
        events: {
          type: "array",
          description: "List of timeline events to add",
          items: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Event title (e.g. Ceremony, First dance)",
              },
              start_time: {
                type: "string",
                description: "Optional start time in HH:MM 24-hour format (e.g. 16:00 for 4pm)",
              },
              end_time: {
                type: "string",
                description: "Optional end time in HH:MM 24-hour format",
              },
              description: {
                type: "string",
                description: "Optional details for the run sheet",
              },
              section: {
                type: "string",
                description: "Optional section grouping (e.g. Ceremony, Reception)",
              },
              owner: {
                type: "string",
                description: "Optional person responsible (e.g. DJ, photographer)",
              },
            },
            required: ["title"] as string[],
          },
        },
      },
      required: ["events"] as string[],
    },
  },
  {
    name: "set_website_schedule",
    description:
      "Fill an EMPTY website Schedule from guest-facing items (usually curated from get_timeline). Refuses if no website exists or if Schedule already has items — never overwrites. Do not include internal/vendor-only run-sheet events or owner names.",
    input_schema: {
      type: "object" as const,
      properties: {
        items: {
          type: "array",
          description:
            "1–40 guest-facing schedule items. time may be HH:MM / HH:MM:SS (normalized for display) or a free-form string.",
          items: {
            type: "object",
            properties: {
              time: {
                type: "string",
                description: "Display time (e.g. 16:00 or 4:00 PM)",
              },
              title: {
                type: "string",
                description: "Guest-facing event title",
              },
              description: {
                type: "string",
                description: "Optional short guest-facing description",
              },
            },
            required: ["time", "title"] as string[],
          },
        },
      },
      required: ["items"] as string[],
    },
  },
  {
    name: "set_website_travel",
    description:
      "Fill an EMPTY website Travel & Stay section with guest-facing content (usually from search_nearby_places). Prefer structured places (hotels/airports) plus a short intro. Refuses if no website exists or if Travel & Stay already has content — never overwrites. Do not force the section visible.",
    input_schema: {
      type: "object" as const,
      properties: {
        intro: {
          type: "string",
          description:
            "Optional short intro blurb for guests (getting there / where to stay).",
        },
        body: {
          type: "string",
          description:
            "Legacy alias for intro. Prefer intro + places when possible.",
        },
        places: {
          type: "array",
          description:
            "Guest-facing place cards — hotels, airports, restaurants, etc.",
          items: {
            type: "object",
            properties: {
              kind: {
                type: "string",
                description: "stay | getting_there | other",
              },
              name: { type: "string" },
              detail: {
                type: "string",
                description: "Address, distance, or short description.",
              },
              url: {
                type: "string",
                description: "Optional booking or maps https URL.",
              },
              note: {
                type: "string",
                description: "Optional block code or booking note.",
              },
            },
            required: ["name"] as string[],
          },
        },
      },
      required: [] as string[],
    },
  },
] as const;

export type WriteToolName = (typeof WRITE_TOOL_DEFINITIONS)[number]["name"];

const WRITE_TOOL_NAMES = new Set<string>(
  WRITE_TOOL_DEFINITIONS.map((tool) => tool.name),
);

export function isWriteTool(toolName: string): toolName is WriteToolName {
  return WRITE_TOOL_NAMES.has(toolName);
}

function toolError(message: string) {
  return { success: false as const, error: message };
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value: string) {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(value);
}

function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

function isRsvpStatus(value: string): value is RsvpStatus {
  return (RSVP_STATUSES as readonly string[]).includes(value);
}

function isNoteActionStatus(value: string): value is Exclude<NoteActionStatus, null> {
  return value === "needs_action" || value === "done";
}

const ENRICH_TIMEOUT_MS = 20_000;

/**
 * AGENTIC-02: verify each place with Google, track it on the wedding, then
 * run contact enrichment (awaited, in parallel, time-boxed) so outreach
 * drafts can follow in the same turn.
 */
async function addVendorsToShortlist(
  projectId: string,
  input: Record<string, unknown>,
  client?: SupabaseClient,
) {
  const category = asString(input.category)?.trim() ?? "";
  if (!SCOUT_CATEGORY_IDS.includes(category)) {
    return toolError(`category must be one of: ${SCOUT_CATEGORY_IDS.join(", ")}`);
  }
  const rawIds = Array.isArray(input.place_ids) ? input.place_ids : [];
  const placeIds = [
    ...new Set(
      rawIds
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
  if (placeIds.length === 0) return toolError("place_ids is required");
  if (placeIds.length > MAX_SHORTLIST_ADDS) {
    return toolError(`Add at most ${MAX_SHORTLIST_ADDS} vendors at a time.`);
  }

  type Outcome = {
    place_id: string;
    name?: string;
    vendor_id?: string;
    added: boolean;
    contact_email_found?: boolean;
    error?: string;
  };

  const outcomes: Outcome[] = [];
  for (const placeId of placeIds) {
    const basics = await fetchPlaceBasics(placeId);
    if (!basics) {
      outcomes.push({
        place_id: placeId,
        added: false,
        error: "Google could not verify this place_id. Use ids from search_vendors.",
      });
      continue;
    }
    const added = await addDiscoveredVendor(
      projectId,
      {
        id: basics.id,
        displayName: basics.name,
        websiteUri: basics.website ?? undefined,
      },
      category,
      { skipEnrichment: true },
    );
    outcomes.push(
      added.ok
        ? { place_id: placeId, name: basics.name, vendor_id: added.vendorId, added: true }
        : { place_id: placeId, name: basics.name, added: false, error: added.error },
    );
  }

  const addedOutcomes = outcomes.filter((o) => o.added && o.vendor_id);
  await Promise.all(
    addedOutcomes.map((o) =>
      Promise.race([
        runVendorEnrichment(o.vendor_id!).catch(() => null),
        new Promise((resolve) => setTimeout(resolve, ENRICH_TIMEOUT_MS)),
      ]),
    ),
  );

  if (addedOutcomes.length > 0) {
    const supabase = await clientForWrite(client);
    const { data: rows } = await supabase
      .from("vendors")
      .select("id, contact_email")
      .in(
        "id",
        addedOutcomes.map((o) => o.vendor_id!),
      );
    const emailById = new Map(
      (rows ?? []).map((row) => [row.id as string, row.contact_email as string | null]),
    );
    for (const o of addedOutcomes) {
      o.contact_email_found = Boolean(emailById.get(o.vendor_id!)?.trim());
    }
  }

  return {
    success: addedOutcomes.length > 0,
    action: "add_vendors_to_shortlist",
    vendors: outcomes,
    note: "Vendors with contact_email_found=false cannot get an email draft; tell the user to reach them through their website. Draft the rest with create_agent_draft using vendor_id as target_id.",
  };
}

export async function executeWriteTool(
  projectId: string,
  toolName: WriteToolName,
  input: Record<string, unknown>,
  client?: SupabaseClient,
): Promise<unknown> {
  switch (toolName) {
    case "add_task": {
      const title = asString(input.title)?.trim();
      if (!title) return toolError("title is required");

      const dueDateRaw = asString(input.due_date)?.trim() ?? "";
      if (!dueDateRaw) {
        await addTask(projectId, null, title, null, client);
        return {
          success: true,
          action: "add_task",
          title,
          phase: null,
          due_date: null,
        };
      }

      if (!isValidDate(dueDateRaw)) {
        return toolError("due_date must be in YYYY-MM-DD format");
      }

      const today = new Date();
      const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const dueDate = clampDueDateToToday(dueDateRaw, todayIso)!;

      const supabase = await clientForWrite(client);
      const { data: project } = await supabase
        .from("projects")
        .select("wedding_date")
        .eq("id", projectId)
        .maybeSingle();

      const weddingDate = project?.wedding_date ?? null;
      const phase =
        weddingDate !== null
          ? phaseFromMonthsBefore(wholeMonthsBetween(dueDate, weddingDate))
          : null;

      await addTask(projectId, phase, title, dueDate, client);
      return {
        success: true,
        action: "add_task",
        title,
        phase,
        due_date: dueDate,
      };
    }

    case "update_task_status": {
      const taskId = asString(input.task_id)?.trim();
      const status = asString(input.status);
      if (!taskId) return toolError("task_id is required");
      if (!status || !isTaskStatus(status)) {
        return toolError("status must be todo, in_progress, or done");
      }

      await toggleTask(taskId, status, client);
      return { success: true, action: "update_task_status", task_id: taskId, status };
    }

    case "add_guest": {
      const fullName = asString(input.full_name)?.trim();
      if (!fullName) return toolError("full_name is required");

      const household = asString(input.household) ?? "";
      const phone = asString(input.phone) ?? "";
      const email = asString(input.email) ?? "";
      const address = asString(input.address) ?? "";
      const partySize = asNumber(input.party_size) ?? 1;

      await addGuest(
        projectId,
        fullName,
        household,
        phone,
        partySize,
        [],
        address,
        {},
        { client, email },
      );
      return {
        success: true,
        action: "add_guest",
        full_name: fullName,
        household: household.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        party_size: Math.max(1, partySize || 1),
      };
    }

    case "update_guest_rsvp": {
      const guestId = asString(input.guest_id)?.trim();
      const status = asString(input.status);
      if (!guestId) return toolError("guest_id is required");
      if (!status || !isRsvpStatus(status)) {
        return toolError("status must be pending, attending, or declined");
      }

      await updateRsvp(guestId, status, client);
      return { success: true, action: "update_guest_rsvp", guest_id: guestId, status };
    }

    case "set_budget_target": {
      const amount = asNumber(input.amount);
      if (amount === undefined || amount < 0) {
        return toolError("amount must be a non-negative number");
      }

      await setBudgetTarget(projectId, amount, client);
      return { success: true, action: "set_budget_target", amount };
    }

    case "add_budget_item": {
      const label = asString(input.label)?.trim() || null;
      const plannedAmount = asNumber(input.planned_amount);
      if (plannedAmount === undefined || plannedAmount < 0) {
        return toolError("planned_amount must be a non-negative number");
      }

      const category = asString(input.category) ?? "";
      await addBudgetItem(
        projectId,
        category,
        label,
        plannedAmount,
        undefined,
        undefined,
        client,
      );
      return {
        success: true,
        action: "add_budget_item",
        label,
        category: category.trim() || null,
        planned_amount: plannedAmount,
      };
    }

    case "propose_budget_changes": {
      const result = await createBudgetProposal(
        projectId,
        {
          title: asString(input.title) ?? "",
          summary: asString(input.summary),
          changes: input.changes,
        },
        client,
      );
      if (!result.ok) return toolError(result.error);
      return {
        success: true,
        action: "propose_budget_changes",
        proposal_id: result.proposalId,
        change_count: result.changeCount,
        note: "Queued in the Pending panel. Nothing has changed yet — tell the user to review and tap Apply.",
      };
    }

    case "propose_contract_terms": {
      const result = await createContractTermsProposal(
        projectId,
        {
          fileId: asString(input.file_id)?.trim() ?? "",
          budgetItemId: asString(input.budget_item_id),
          summary: asString(input.summary),
          payments: input.payments,
          deadlines: input.deadlines,
          arrival: input.arrival,
        },
        client,
      );
      if (!result.ok) return toolError(result.error);
      return {
        success: true,
        action: "propose_contract_terms",
        proposal_id: result.proposalId,
        payments: result.payments,
        deadlines: result.deadlines,
        arrival: result.arrival,
        note: "Queued in the Pending panel. Nothing has been added yet — tell the user to review each item against the contract and tap Apply.",
      };
    }

    case "add_seating_rule": {
      const result = await addSeatingRule(
        projectId,
        {
          kind: asString(input.kind) ?? "",
          memberA: asString(input.member_a_id)?.trim() ?? "",
          memberB: asString(input.member_b_id)?.trim() ?? "",
          note: asString(input.note),
        },
        client,
      );
      if (!result.ok) return toolError(result.error);
      return { success: true, action: "add_seating_rule", rule_id: result.ruleId };
    }

    case "propose_seating_plan": {
      const result = await createSeatingPlanProposal(
        projectId,
        { includePending: input.include_pending === true },
        client,
      );
      if (!result.ok) return toolError(result.error);
      return {
        success: true,
        action: "propose_seating_plan",
        proposal_id: result.proposalId,
        will_seat: result.seated,
        not_seated: result.unplaced,
        note: "Queued in the Pending panel. Nothing has moved yet — tell the user to review and tap Apply. Mention anyone who could not be seated and why.",
      };
    }

    case "propose_rsvp_reminders": {
      const result = await createRsvpReminderProposal(
        projectId,
        { message: asString(input.message) },
        client,
      );
      if (!result.ok) return toolError(result.error);
      return {
        success: true,
        action: "propose_rsvp_reminders",
        proposal_id: result.proposalId,
        will_email: result.recipientCount,
        no_email_on_file: result.noEmail,
        skipped_recently_reminded: result.recentlyReminded,
        note: "Queued in the Pending panel. Nothing has been sent — tell the user to review and tap Send reminders. For households with no email, offer to write a short text message they can send themselves.",
      };
    }

    case "propose_checklist_replan": {
      const result = await createReplanProposal(
        projectId,
        {
          title: asString(input.title) ?? "",
          summary: asString(input.summary),
          changes: input.changes,
        },
        client,
      );
      if (!result.ok) return toolError(result.error);
      return {
        success: true,
        action: "propose_checklist_replan",
        proposal_id: result.proposalId,
        change_count: result.changeCount,
        note: "Queued in the Pending panel. Nothing has changed yet — tell the user to review and tap Apply.",
      };
    }

    case "add_vendors_to_shortlist":
      return addVendorsToShortlist(projectId, input, client);

    case "add_vendor_target": {
      const category = asString(input.category)?.trim();
      if (!category) return toolError("category is required");

      const note = asString(input.note);
      const result = await addVendorTarget(
        projectId,
        category,
        note ?? null,
        client,
      );
      if (!result.ok) {
        return toolError(result.error);
      }

      return {
        success: true,
        action: "add_vendor_target",
        category,
        note: note?.trim() || null,
      };
    }

    case "add_note": {
      const title = asString(input.title);
      const body = asString(input.body);
      const actionStatusRaw = asString(input.action_status)?.trim();
      let actionStatus: NoteActionStatus | undefined;
      if (actionStatusRaw) {
        if (!isNoteActionStatus(actionStatusRaw)) {
          return toolError("action_status must be needs_action or done");
        }
        actionStatus = actionStatusRaw;
      }

      const noteId = await addNote(projectId, client, actionStatus);

      const fields: { title?: string; body?: string } = {};
      if (title !== undefined) {
        const trimmedTitle = title.trim();
        if (trimmedTitle) fields.title = trimmedTitle;
      }
      if (body !== undefined) fields.body = body;

      if (Object.keys(fields).length > 0) {
        await updateNote(noteId, fields, client);
      }

      return {
        success: true,
        action: "add_note",
        note_id: noteId,
        title: fields.title ?? null,
        body: body?.trim() || null,
        action_status: actionStatus ?? null,
      };
    }

    case "create_agent_draft": {
      const targetId = asString(input.target_id)?.trim();
      const subject = asString(input.subject);
      const body = asString(input.body);
      if (!targetId) return toolError("target_id is required");
      if (!subject?.trim()) return toolError("subject is required");
      if (!body?.trim()) return toolError("body is required");

      const result = await createAgentDraft(
        projectId,
        { targetId, subject, body },
        client,
      );
      if (!result.ok) {
        return toolError(result.error);
      }

      return {
        success: true,
        action: "create_agent_draft",
        draft_id: result.draft_id,
        target_id: targetId,
      };
    }

    case "add_timeline_event": {
      const title = asString(input.title)?.trim();
      if (!title) return toolError("title is required");

      const startTime = asString(input.start_time)?.trim() || null;
      const endTime = asString(input.end_time)?.trim() || null;
      if (startTime && !isValidTime(startTime)) {
        return toolError("start_time must be in HH:MM 24-hour format");
      }
      if (endTime && !isValidTime(endTime)) {
        return toolError("end_time must be in HH:MM 24-hour format");
      }

      const description = asString(input.description);
      const section = asString(input.section);
      const owner = asString(input.owner);

      await addEvent(
        projectId,
        title,
        startTime,
        endTime,
        description ?? null,
        section ?? null,
        owner ?? null,
        client,
      );

      return {
        success: true,
        action: "add_timeline_event",
        title,
        start_time: startTime,
        end_time: endTime,
        description: description?.trim() || null,
        section: section?.trim() || null,
        owner: owner?.trim() || null,
      };
    }

    case "add_timeline_events": {
      if (!Array.isArray(input.events) || input.events.length === 0) {
        return toolError("events must be a non-empty array");
      }

      const parsedEvents: {
        title: string;
        start_time: string | null;
        end_time: string | null;
        description: string | null;
        section: string | null;
        owner: string | null;
      }[] = [];

      for (const raw of input.events) {
        if (typeof raw !== "object" || raw === null) {
          return toolError("each event must be an object with a title");
        }

        const event = raw as Record<string, unknown>;
        const title = asString(event.title)?.trim();
        if (!title) return toolError("each event requires a title");

        const startTime = asString(event.start_time)?.trim() || null;
        const endTime = asString(event.end_time)?.trim() || null;
        if (startTime && !isValidTime(startTime)) {
          return toolError("start_time must be in HH:MM 24-hour format");
        }
        if (endTime && !isValidTime(endTime)) {
          return toolError("end_time must be in HH:MM 24-hour format");
        }

        const description = asString(event.description);
        const section = asString(event.section);
        const owner = asString(event.owner);

        parsedEvents.push({
          title,
          start_time: startTime,
          end_time: endTime,
          description: description ?? null,
          section: section ?? null,
          owner: owner ?? null,
        });
      }

      const result = await addEvents(projectId, parsedEvents, client);

      return {
        success: true,
        action: "add_timeline_events",
        count: result.count,
        latest_start_time: result.latest_start_time,
      };
    }

    case "set_website_schedule": {
      const rawItems = input.items;
      if (!Array.isArray(rawItems)) {
        return toolError("items must be an array");
      }

      const items: Array<{ time: string; title: string; description?: string }> =
        [];
      for (const entry of rawItems) {
        if (!entry || typeof entry !== "object") {
          return toolError("each item must be an object with time and title");
        }
        const row = entry as Record<string, unknown>;
        const title = asString(row.title)?.trim();
        if (!title) {
          return toolError("each schedule item needs a non-empty title");
        }
        const time = asString(row.time) ?? "";
        const description = asString(row.description);
        items.push({
          time,
          title,
          ...(description !== undefined ? { description } : {}),
        });
      }

      const result = await setWeddingWebsiteSchedule(projectId, items, client);
      if (!result.ok) {
        return toolError(result.error);
      }

      return {
        success: true,
        ok: true,
        action: "set_website_schedule",
        count: result.count,
        summary: result.summary,
      };
    }

    case "set_website_travel": {
      const intro = asString(input.intro);
      const body = asString(input.body);
      const placesRaw = input.places;
      const places = Array.isArray(placesRaw)
        ? placesRaw
            .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
            .map((row) => ({
              kind: asString(row.kind),
              name: asString(row.name) ?? "",
              detail: asString(row.detail),
              url: asString(row.url),
              note: asString(row.note),
            }))
            .filter((row) => row.name.trim().length > 0)
        : undefined;

      if (!intro?.trim() && !body?.trim() && (!places || places.length === 0)) {
        return toolError("Provide intro and/or at least one place");
      }

      const result = await setWeddingWebsiteTravel(
        projectId,
        {
          intro: intro ?? body,
          body,
          places,
        },
        client,
      );
      if (!result.ok) {
        return toolError(result.error);
      }

      return {
        success: true,
        ok: true,
        action: "set_website_travel",
        visible: result.visible,
        summary: result.summary,
      };
    }
  }
}
