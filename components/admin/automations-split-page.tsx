import { AdminScheduleChip } from "@/components/admin/admin-schedule-chip";
import { AutomationsBoard } from "@/components/admin/automations-board";
import { PageHeader } from "@/components/ui/page-header";
import type { AudienceGroup } from "@/lib/admin/platform-audience";
import { getAutomationPrompts, getRecentAutomationRuns } from "@/lib/admin/queries";
import { createClient } from "@/utils/supabase/server";

export async function AutomationsSplitPage({
  audience,
  title,
  description,
  chip,
}: {
  audience: AudienceGroup;
  title: string;
  description: string;
  chip?: string;
}) {
  const supabase = await createClient();
  const allPrompts = await getAutomationPrompts(supabase);
  const prompts = allPrompts.filter((p) => p.audience_group === audience);
  const runs = await getRecentAutomationRuns(supabase, {
    promptIds: prompts.map((p) => p.id),
  });

  return (
    <div>
      <PageHeader className="mb-5" title={title} description={description} />
      {chip ? <AdminScheduleChip>{chip}</AdminScheduleChip> : null}
      <AutomationsBoard
        prompts={prompts}
        runs={runs}
        audienceGroup={audience}
      />
    </div>
  );
}
