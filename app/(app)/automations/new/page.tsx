import { redirect } from "next/navigation";
import { WorkflowEditor } from "@/components/automations/WorkflowEditor";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { createClient } from "@/utils/supabase/server";

export default async function NewAutomationPage() {
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

  return (
    <div className="w-full">
      <div className="mb-6">
        <PageHeader
          eyebrow="CRM"
          title="New workflow"
          description="Name it, pick when it runs, then add steps."
        />
      </div>
      <WorkflowEditor accountId={account.accountId} />
    </div>
  );
}
