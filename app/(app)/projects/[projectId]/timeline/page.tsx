import { TimelineBoard } from "./TimelineBoard";
import type { TimelineEvent } from "./types";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { computeTimelineAggregates } from "@/lib/timeline-aggregates";
import { createClient } from "@/utils/supabase/server";

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  const stackClass = sectionStackClass(account?.kind ?? "personal");

  const [{ data: rows }, { data: project }] = await Promise.all([
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
  ]);

  const events = (rows ?? []) as TimelineEvent[];
  const aggregates = computeTimelineAggregates(events);

  return (
    <div className={stackClass}>
      <TimelineBoard
        projectId={projectId}
        projectName={project?.name ?? "Your wedding"}
        weddingDate={project?.wedding_date ?? null}
        aggregates={aggregates}
      />
    </div>
  );
}
