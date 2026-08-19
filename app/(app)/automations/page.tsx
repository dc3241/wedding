import { redirect } from "next/navigation";
import { TemplateGallery } from "@/components/automations/TemplateGallery";
import { WorkflowList } from "@/components/automations/WorkflowList";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { getAccountContext } from "@/lib/account-context";
import { listAutomationWorkflows } from "@/lib/automations/actions";
import {
  isAutomationTemplateKey,
  type AutomationTemplateKey,
} from "@/lib/automations/templates";
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
  const customWorkflows = workflows.filter(
    (workflow) => workflow.template_key == null,
  );
  const instances: Partial<
    Record<AutomationTemplateKey, { id: string; enabled: boolean }>
  > = {};
  for (const workflow of workflows) {
    if (!workflow.template_key || !isAutomationTemplateKey(workflow.template_key)) {
      continue;
    }
    instances[workflow.template_key] = {
      id: workflow.id,
      enabled: workflow.enabled,
    };
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <PageHeader
          eyebrow="CRM"
          title="Automations"
          description="Flip on a template, or build your own. Emails draft for your approval."
          actions={
            <ButtonLink href="/automations/new" className="px-4 py-2 text-[13px]">
              New workflow
            </ButtonLink>
          }
        />
      </div>

      <SectionHeader>Templates</SectionHeader>
      <TemplateGallery instances={instances} />

      <div className="mt-8">
        <SectionHeader>Your automations</SectionHeader>
        <WorkflowList workflows={customWorkflows} />
      </div>
    </div>
  );
}
