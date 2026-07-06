"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

function timelinePath(projectId: string) {
  return `/projects/${projectId}/timeline`;
}

function normalizeTime(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
}

async function maxPosition(projectId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("timeline_events")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.position ?? -1) + 1;
}

export async function addEvent(
  projectId: string,
  title: string,
  startTime?: string | null,
  endTime?: string | null,
  description?: string | null,
  section?: string | null,
  owner?: string | null,
) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return;

  const supabase = await createClient();

  const { error } = await supabase.from("timeline_events").insert({
    project_id: projectId,
    title: trimmedTitle,
    start_time: normalizeTime(startTime),
    end_time: normalizeTime(endTime),
    description: description?.trim() || null,
    section: section?.trim() || null,
    owner: owner?.trim() || null,
    position: await maxPosition(projectId),
  });

  if (error) throw error;

  revalidatePath(timelinePath(projectId));
}

export type TimelineEventFields = {
  title: string;
  start_time?: string | null;
  end_time?: string | null;
  description?: string | null;
  section?: string | null;
  owner?: string | null;
};

export type AddEventsResult = {
  count: number;
  latest_start_time: string | null;
};

function latestStartTime(times: (string | null)[]): string | null {
  const valid = times.filter((t): t is string => t != null);
  if (valid.length === 0) return null;
  return valid.reduce((latest, t) => (t > latest ? t : latest));
}

export async function addEvents(
  projectId: string,
  events: TimelineEventFields[],
): Promise<AddEventsResult> {
  if (events.length === 0) {
    return { count: 0, latest_start_time: null };
  }

  const supabase = await createClient();
  let position = await maxPosition(projectId);

  const rows = events.map((event) => {
    const row = {
      project_id: projectId,
      title: event.title.trim(),
      start_time: normalizeTime(event.start_time),
      end_time: normalizeTime(event.end_time),
      description: event.description?.trim() || null,
      section: event.section?.trim() || null,
      owner: event.owner?.trim() || null,
      position: position++,
    };
    return row;
  });

  const { error } = await supabase.from("timeline_events").insert(rows);

  if (error) throw error;

  revalidatePath(timelinePath(projectId));

  return {
    count: rows.length,
    latest_start_time: latestStartTime(rows.map((row) => row.start_time)),
  };
}

export async function updateEvent(
  eventId: string,
  fields: {
    title?: string;
    start_time?: string | null;
    end_time?: string | null;
    description?: string | null;
    section?: string | null;
    owner?: string | null;
  },
) {
  const updates: Record<string, string | null> = {};

  if (fields.title !== undefined) {
    const trimmed = fields.title.trim();
    if (!trimmed) return;
    updates.title = trimmed;
  }

  if (fields.start_time !== undefined) {
    updates.start_time = normalizeTime(fields.start_time);
  }

  if (fields.end_time !== undefined) {
    updates.end_time = normalizeTime(fields.end_time);
  }

  if (fields.description !== undefined) {
    updates.description = (fields.description ?? "").trim() || null;
  }

  if (fields.section !== undefined) {
    updates.section = (fields.section ?? "").trim() || null;
  }

  if (fields.owner !== undefined) {
    updates.owner = (fields.owner ?? "").trim() || null;
  }

  if (Object.keys(updates).length === 0) return;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("timeline_events")
    .update(updates)
    .eq("id", eventId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(timelinePath(data.project_id));
}

export async function removeEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("timeline_events")
    .delete()
    .eq("id", eventId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(timelinePath(data.project_id));
}
