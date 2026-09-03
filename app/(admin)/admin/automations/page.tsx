import { AutomationsBoard } from "@/components/admin/automations-board";
import { PageHeader } from "@/components/ui/page-header";
import { getAutomationPrompts, getRecentAutomationRuns } from "@/lib/admin/queries";
import { createClient } from "@/utils/supabase/server";

export default async function AdminAutomationsPage() {
  const supabase = await createClient();
  const [prompts, runs] = await Promise.all([
    getAutomationPrompts(supabase),
    getRecentAutomationRuns(supabase),
  ]);

  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Automations"
        description="Reusable prompt templates that call Claude server-side. Manual trigger for now — cron is a fast-follow."
      />

      <AutomationsBoard prompts={prompts} runs={runs} />
    </div>
  );
}
