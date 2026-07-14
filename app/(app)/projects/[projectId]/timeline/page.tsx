import { TimelineBoard } from "./TimelineBoard";
import type { TimelineEvent } from "./types";
import { PageHeader } from "@/components/ui/page-header";
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

  // RLS-scoped; no manual ownership filter.
  const { data: rows } = await supabase
    .from("timeline_events")
    .select(
      "id, title, description, start_time, end_time, section, owner, position",
    )
    .eq("project_id", projectId)
    .order("start_time", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true });

  const events = (rows ?? []) as TimelineEvent[];
  const aggregates = computeTimelineAggregates(events);

  return (
    <div className={stackClass}>
      <PageHeader
        eyebrow="Day-of timeline"
        title="Day-of timeline"
        description="The hour-by-hour schedule for the wedding day — distinct from your long-range planning checklist."
        className="[&_h1]:font-[family-name:var(--font-sans)] [&_h1]:font-medium"
      />

      <TimelineBoard projectId={projectId} aggregates={aggregates} />
    </div>
  );
}
