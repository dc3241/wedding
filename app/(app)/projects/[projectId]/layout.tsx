import { notFound, redirect } from "next/navigation";
import { AssistantWorkspace } from "@/components/assistant/AssistantWorkspace";
import type { AssistantMessage } from "@/components/assistant/types";
import { ProjectShell } from "@/components/projects/project-shell";
import { ProjectWorkspaceNav } from "@/components/projects/project-workspace-nav";
import { getAccountContext } from "@/lib/account-context";
import { coupleOnboardingRedirect } from "@/lib/onboarding-gate";
import { createClient } from "@/utils/supabase/server";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, wedding_date")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const onboardingRedirect = await coupleOnboardingRedirect(
    supabase,
    account,
    projectId,
  );
  if (onboardingRedirect) {
    redirect(onboardingRedirect);
  }

  const accountKind = account?.kind ?? "personal";

  const { data: messageRows } = await supabase
    .from("assistant_messages")
    .select("id, role, content, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  const initialMessages = (messageRows ?? []) as AssistantMessage[];

  return (
    <AssistantWorkspace
      projectId={projectId}
      accountKind={accountKind}
      initialMessages={initialMessages}
    >
      <ProjectShell
        projectId={projectId}
        coupleNames={project.name}
        weddingDate={project.wedding_date}
        accountKind={accountKind}
      >
        <ProjectWorkspaceNav projectId={projectId} accountKind={accountKind} />
        {children}
      </ProjectShell>
    </AssistantWorkspace>
  );
}
