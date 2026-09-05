import { AutomationsSplitPage } from "@/components/admin/automations-split-page";

export default function PlannerAutomationsPage() {
  return (
    <AutomationsSplitPage
      audience="planner"
      title="Automations — Venues & planners"
      description='Manual "run now" for testing — recurring runs get wired up separately.'
    />
  );
}
