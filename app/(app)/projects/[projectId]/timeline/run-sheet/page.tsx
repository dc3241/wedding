import { RunSheetDocument } from "./RunSheetDocument";
import type { TimelineEvent } from "../types";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import {
  computeTimelineAggregates,
  filterEventsByOwner,
} from "@/lib/timeline-aggregates";
import { createClient } from "@/utils/supabase/server";

function parseOwnerParam(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || value === "all") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export default async function TimelineRunSheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ owner?: string | string[] }>;
}) {
  const { projectId } = await params;
  const ownerFilter = parseOwnerParam((await searchParams).owner);

  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  const stackClass = sectionStackClass(account?.kind ?? "personal");

  // RLS-scoped reads; no manual ownership filter. AUTHENTICATED via (app) layout.
  const [{ data: rows }, { data: project }, { data: profile }] =
    await Promise.all([
      supabase
        .from("timeline_events")
        .select(
          "id, title, description, start_time, end_time, section, owner, position",
        )
        .eq("project_id", projectId)
        .order("start_time", { ascending: true, nullsFirst: false })
        .order("position", { ascending: true }),
      supabase
        .from("projects")
        .select("name, wedding_date")
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("wedding_profile")
        .select("location")
        .eq("project_id", projectId)
        .maybeSingle(),
    ]);

  const events = (rows ?? []) as TimelineEvent[];
  const masterAggregates = computeTimelineAggregates(events);
  const sheetEvents = filterEventsByOwner(events, ownerFilter);
  const aggregates = computeTimelineAggregates(sheetEvents);

  return (
    <div className={stackClass}>
      <RunSheetDocument
        projectId={projectId}
        meta={{
          coupleNames: project?.name ?? "Wedding",
          weddingDate: project?.wedding_date ?? null,
          venue: profile?.location ?? null,
        }}
        ownerFilter={ownerFilter}
        owners={masterAggregates.owners}
        aggregates={aggregates}
      />
    </div>
  );
}
