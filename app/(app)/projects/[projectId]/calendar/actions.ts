"use server";

import { revalidatePath } from "next/cache";
import {
  allDayStartsAt,
  timedStartsAt,
} from "@/app/(app)/calendar/calendar-source";
import {
  isEventKind,
  type EventKind,
} from "@/app/(app)/calendar/types";
import { createClient } from "@/utils/supabase/server";

export type CreateProjectCalendarEventInput = {
  title: string;
  kind: string;
  /** YYYY-MM-DD */
  date: string;
  allDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  notes?: string | null;
};

export type UpdateProjectCalendarEventFields = {
  title?: string;
  kind?: string;
  date?: string;
  allDay?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  notes?: string | null;
};

function calendarPath(projectId: string) {
  return `/projects/${projectId}/calendar`;
}

function revalidateProjectCalendar(projectId: string) {
  revalidatePath(calendarPath(projectId));
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/calendar");
}

function trimOrNull(value: string | undefined | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function validateKind(
  kind: string,
): { ok: true; kind: EventKind } | { ok: false; error: string } {
  if (!isEventKind(kind)) {
    return { ok: false, error: "Choose a valid event kind." };
  }
  return { ok: true, kind };
}

function resolveTimes(input: {
  date: string;
  allDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
}):
  | { ok: true; startsAt: string; endsAt: string | null }
  | { ok: false; error: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { ok: false, error: "A valid date is required." };
  }

  if (input.allDay) {
    return {
      ok: true,
      startsAt: allDayStartsAt(input.date),
      endsAt: null,
    };
  }

  const startTime = input.startTime?.trim();
  if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) {
    return { ok: false, error: "Start time is required." };
  }

  const startsAt = timedStartsAt(input.date, startTime);
  let endsAt: string | null = null;
  const endTime = input.endTime?.trim();
  if (endTime) {
    if (!/^\d{2}:\d{2}$/.test(endTime)) {
      return { ok: false, error: "End time is invalid." };
    }
    endsAt = timedStartsAt(input.date, endTime);
  }

  return { ok: true, startsAt, endsAt };
}

async function loadAccessibleProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<
  | { ok: true; accountId: string }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, account_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "Project not found." };
  }
  return { ok: true, accountId: data.account_id as string };
}

export async function createProjectCalendarEvent(
  projectId: string,
  input: CreateProjectCalendarEventInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const title = input.title.trim();
  if (!title) {
    return { ok: false, error: "Title is required." };
  }

  const kindResult = validateKind(input.kind);
  if (!kindResult.ok) return kindResult;

  const times = resolveTimes({
    date: input.date,
    allDay: input.allDay,
    startTime: input.startTime,
    endTime: input.endTime,
  });
  if (!times.ok) return times;

  const supabase = await createClient();
  const project = await loadAccessibleProject(supabase, projectId);
  if (!project.ok) return project;

  const { error } = await supabase.from("calendar_events").insert({
    account_id: project.accountId,
    project_id: projectId,
    title,
    event_kind: kindResult.kind,
    starts_at: times.startsAt,
    ends_at: times.endsAt,
    all_day: input.allDay,
    location: trimOrNull(input.location),
    notes: trimOrNull(input.notes),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateProjectCalendar(projectId);
  return { ok: true };
}

export async function updateProjectCalendarEvent(
  projectId: string,
  id: string,
  fields: UpdateProjectCalendarEventFields,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) {
    return { ok: false, error: "Event id is required." };
  }

  const supabase = await createClient();
  const project = await loadAccessibleProject(supabase, projectId);
  if (!project.ok) return project;

  const payload: Record<string, unknown> = {};

  if (fields.title !== undefined) {
    const title = fields.title.trim();
    if (!title) {
      return { ok: false, error: "Title is required." };
    }
    payload.title = title;
  }

  if (fields.kind !== undefined) {
    const kindResult = validateKind(fields.kind);
    if (!kindResult.ok) return kindResult;
    payload.event_kind = kindResult.kind;
  }

  if (fields.location !== undefined) {
    payload.location = trimOrNull(fields.location);
  }
  if (fields.notes !== undefined) {
    payload.notes = trimOrNull(fields.notes);
  }

  // Keep events locked to this project on the couple calendar.
  payload.project_id = projectId;

  const touchingSchedule =
    fields.date !== undefined ||
    fields.allDay !== undefined ||
    fields.startTime !== undefined ||
    fields.endTime !== undefined;

  if (touchingSchedule) {
    const { data: current, error: readError } = await supabase
      .from("calendar_events")
      .select("starts_at, ends_at, all_day")
      .eq("id", id)
      .eq("project_id", projectId)
      .maybeSingle();

    if (readError) {
      return { ok: false, error: readError.message };
    }
    if (!current) {
      return { ok: false, error: "Event not found." };
    }

    const allDay = fields.allDay ?? current.all_day;
    const date =
      fields.date ??
      (current.all_day
        ? current.starts_at.slice(0, 10)
        : (() => {
            const d = new Date(current.starts_at);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
          })());

    let startTime = fields.startTime;
    let endTime = fields.endTime;
    if (!allDay) {
      if (startTime === undefined || startTime === null) {
        const d = new Date(current.starts_at);
        startTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }
      if (endTime === undefined) {
        if (current.ends_at) {
          const d = new Date(current.ends_at);
          endTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        } else {
          endTime = null;
        }
      }
    }

    const times = resolveTimes({
      date,
      allDay,
      startTime,
      endTime,
    });
    if (!times.ok) return times;

    payload.all_day = allDay;
    payload.starts_at = times.startsAt;
    payload.ends_at = times.endsAt;
  }

  if (Object.keys(payload).length === 0) {
    return { ok: true };
  }

  const { error } = await supabase
    .from("calendar_events")
    .update(payload)
    .eq("id", id)
    .eq("project_id", projectId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateProjectCalendar(projectId);
  return { ok: true };
}

export async function deleteProjectCalendarEvent(
  projectId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) {
    return { ok: false, error: "Event id is required." };
  }

  const supabase = await createClient();
  const project = await loadAccessibleProject(supabase, projectId);
  if (!project.ok) return project;

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateProjectCalendar(projectId);
  return { ok: true };
}
