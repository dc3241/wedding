import { redirect } from "next/navigation";
import { WorkflowList } from "@/components/automations/WorkflowList";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { listAutomationWorkflows } from "@/lib/automations/actions";
import { createClient } from "@/utils/supabase/server";

export default async function AutomationsPage() {
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (!account) {
    redirect("/projects");
  }

  if (account.kind === "personal") {
    if (account.singleProjectId) {
      redirect(`/projects/${account.singleProjectId}`);
    }
    redirect("/projects");
  }

  const workflows = await listAutomationWorkflows(account.accountId);

  return (
    <div className="w-full">
      <div className="mb-6">
        <PageHeader
          eyebrow="CRM"
          title="Automations"
          description="Run steps when a lead changes stage. Emails draft for your approval."
          actions={
            <ButtonLink href="/automations/new" className="px-4 py-2 text-[13px]">
              New workflow
            </ButtonLink>
          }
        />
      </div>
      <WorkflowList workflows={workflows} />
    </div>
  );
}
