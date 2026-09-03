import { AutomationsBoard } from "@/components/admin/automations-board";
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
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.01em] text-ink">
        Automations
      </h1>
      <p className="mb-5 text-[13.5px] text-muted">
        Reusable prompt templates that call Claude server-side. Manual trigger for now — cron is
        a fast-follow.
      </p>

      <AutomationsBoard prompts={prompts} runs={runs} />
    </div>
  );
}
