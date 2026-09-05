import { AutomationsSplitPage } from "@/components/admin/automations-split-page";

export default function CouplesAutomationsPage() {
  return (
    <AutomationsSplitPage
      audience="couples"
      title="Automations — Couples"
      description='Manual "run now" for testing — the Friday content-queue cron is a separate job and is unchanged.'
      chip="Weekly batch normally runs Fridays, 9:00 AM"
    />
  );
}
