import { notFound, redirect } from "next/navigation";
import { WorkflowEditor } from "@/components/automations/WorkflowEditor";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { getAutomationWorkflow } from "@/lib/automations/actions";
import { createClient } from "@/utils/supabase/server";

export default async function EditAutomationPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = await params;
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

  const loaded = await getAutomationWorkflow(workflowId);
  if (!loaded.ok) {
    notFound();
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <PageHeader
          eyebrow="CRM"
          title={loaded.workflow.name}
          description="Edit steps, delay, and when this workflow runs."
        />
      </div>
      <WorkflowEditor
        accountId={account.accountId}
        initial={loaded.workflow}
      />
    </div>
  );
}
