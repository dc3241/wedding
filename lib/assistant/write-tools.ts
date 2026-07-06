import { addTask, toggleTask } from "@/app/(app)/projects/[projectId]/checklist/actions";
import { addGuest, updateRsvp } from "@/app/(app)/projects/[projectId]/guests/actions";
import type { RsvpStatus } from "@/app/(app)/projects/[projectId]/guests/types";
import {
  addBudgetItem,
  setBudgetTarget,
} from "@/app/(app)/projects/[projectId]/budget/actions";
import { addNote, updateNote } from "@/app/(app)/projects/[projectId]/notes/actions";
import { addVendorTarget } from "@/app/(app)/projects/[projectId]/vendors/actions";
import {
  addEvent,
  addEvents,
} from "@/app/(app)/projects/[projectId]/timeline/actions";

const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
const RSVP_STATUSES = ["pending", "attending", "declined"] as const;

type TaskStatus = (typeof TASK_STATUSES)[number];

export const WRITE_TOOL_DEFINITIONS = [
  {
    name: "add_task",
    description:
      "Add a new checklist task. Use when the user clearly asks to add or create a task.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Task title" },
        phase: {
          type: "string",
          description: "Optional planning phase (e.g. 12 months out)",
        },
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
        email: { type: "string", description: "Optional email address" },
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
      "Set the overall wedding budget target amount. Use when the user clearly asks to set or change the total budget.",
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
      "Add a budget line item. Use when the user clearly asks to add a budget entry.",
    input_schema: {
      type: "object" as const,
      properties: {
        label: { type: "string", description: "Line item label" },
        category: {
          type: "string",
          description: "Optional category (e.g. Catering, Flowers)",
        },
        planned_amount: {
          type: "number",
          description: "Planned amount in dollars",
        },
      },
      required: ["label", "planned_amount"] as string[],
    },
  },
  {
    name: "add_vendor_target",
    description:
      "Add a vendor category the couple still needs to book. Use when the user clearly asks to track a new vendor type to find.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description: "Vendor category (e.g. Florist, DJ, Caterer)",
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
      "Add a project note. Use when the user clearly asks to save or jot down a note.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Optional note title" },
        body: { type: "string", description: "Optional note body" },
      },
      required: [] as string[],
    },
  },
  {
    name: "add_timeline_event",
    description:
      "Add an event to the day-of wedding timeline (run sheet). Use when the user clearly asks to add something to the day-of timeline — not the long-range checklist.",
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
      "Add multiple events to the day-of wedding timeline in one batch. Use when generating a full run sheet or adding several events at once — not for a single event.",
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

export async function executeWriteTool(
  projectId: string,
  toolName: WriteToolName,
  input: Record<string, unknown>,
): Promise<unknown> {
  switch (toolName) {
    case "add_task": {
      const title = asString(input.title)?.trim();
      if (!title) return toolError("title is required");

      const phaseRaw = asString(input.phase);
      const phase = phaseRaw?.trim() ? phaseRaw.trim() : null;

      const dueDateRaw = asString(input.due_date);
      if (dueDateRaw !== undefined) {
        const dueDate = dueDateRaw.trim();
        if (dueDate && !isValidDate(dueDate)) {
          return toolError("due_date must be in YYYY-MM-DD format");
        }
        await addTask(projectId, phase, title, dueDate || null);
        return { success: true, action: "add_task", title, phase, due_date: dueDate || null };
      }

      await addTask(projectId, phase, title);
      return { success: true, action: "add_task", title, phase, due_date: null };
    }

    case "update_task_status": {
      const taskId = asString(input.task_id)?.trim();
      const status = asString(input.status);
      if (!taskId) return toolError("task_id is required");
      if (!status || !isTaskStatus(status)) {
        return toolError("status must be todo, in_progress, or done");
      }

      await toggleTask(taskId, status);
      return { success: true, action: "update_task_status", task_id: taskId, status };
    }

    case "add_guest": {
      const fullName = asString(input.full_name)?.trim();
      if (!fullName) return toolError("full_name is required");

      const household = asString(input.household) ?? "";
      const email = asString(input.email) ?? "";
      const partySize = asNumber(input.party_size) ?? 1;

      await addGuest(projectId, fullName, household, email, partySize);
      return {
        success: true,
        action: "add_guest",
        full_name: fullName,
        household: household.trim() || null,
        email: email.trim() || null,
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

      await updateRsvp(guestId, status);
      return { success: true, action: "update_guest_rsvp", guest_id: guestId, status };
    }

    case "set_budget_target": {
      const amount = asNumber(input.amount);
      if (amount === undefined || amount < 0) {
        return toolError("amount must be a non-negative number");
      }

      await setBudgetTarget(projectId, amount);
      return { success: true, action: "set_budget_target", amount };
    }

    case "add_budget_item": {
      const label = asString(input.label)?.trim();
      const plannedAmount = asNumber(input.planned_amount);
      if (!label) return toolError("label is required");
      if (plannedAmount === undefined || plannedAmount < 0) {
        return toolError("planned_amount must be a non-negative number");
      }

      const category = asString(input.category) ?? "";
      await addBudgetItem(projectId, category, label, plannedAmount);
      return {
        success: true,
        action: "add_budget_item",
        label,
        category: category.trim() || null,
        planned_amount: plannedAmount,
      };
    }

    case "add_vendor_target": {
      const category = asString(input.category)?.trim();
      if (!category) return toolError("category is required");

      const note = asString(input.note);
      await addVendorTarget(projectId, category, note ?? null);
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
      const noteId = await addNote(projectId);

      const fields: { title?: string; body?: string } = {};
      if (title !== undefined) {
        const trimmedTitle = title.trim();
        if (trimmedTitle) fields.title = trimmedTitle;
      }
      if (body !== undefined) fields.body = body;

      if (Object.keys(fields).length > 0) {
        await updateNote(noteId, fields);
      }

      return {
        success: true,
        action: "add_note",
        note_id: noteId,
        title: fields.title ?? null,
        body: body?.trim() || null,
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

      const result = await addEvents(projectId, parsedEvents);

      return {
        success: true,
        action: "add_timeline_events",
        count: result.count,
        latest_start_time: result.latest_start_time,
      };
    }
  }
}
