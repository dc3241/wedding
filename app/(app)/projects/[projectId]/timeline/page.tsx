import { AddEventForm } from "./AddEventForm";
import { TimelineRunSheet } from "./TimelineRunSheet";
import type { TimelineEvent } from "./types";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
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

  const { data: rows } = await supabase
    .from("timeline_events")
    .select(
      "id, title, description, start_time, end_time, section, owner, position",
    )
    .eq("project_id", projectId)
    .order("start_time", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true });

  const events = (rows ?? []) as TimelineEvent[];

  return (
    <div className={stackClass}>
      <header>
        <Eyebrow>Day-of timeline</Eyebrow>
        <h1 className="mt-1 text-[20px] font-medium text-ink">Run sheet</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          The hour-by-hour schedule for the wedding day — distinct from your
          long-range planning checklist.
        </p>
      </header>

      <AddEventForm projectId={projectId} />

      {events.length === 0 ? (
        <p className="px-1 text-[13px] text-ink-muted">
          No events yet. Add the first moment — ceremony, cocktail hour, first
          dance, and so on.
        </p>
      ) : (
        <TimelineRunSheet events={events} />
      )}
    </div>
  );
}
