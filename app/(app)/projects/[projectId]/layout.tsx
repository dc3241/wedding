import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { AssistantWorkspace } from "@/components/assistant/AssistantWorkspace";
import type { AssistantMessage } from "@/components/assistant/types";
import { TourProvider } from "@/components/tour/TourProvider";
import { ProjectShell } from "@/components/projects/project-shell";
import { ProjectWorkspaceNav } from "@/components/projects/project-workspace-nav";
import { getAccountContext } from "@/lib/account-context";
import { getBrandingForProject } from "@/lib/branding/get-branding";
import { coupleOnboardingRedirect } from "@/lib/onboarding-gate";
import { createClient } from "@/utils/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  const branding = await getBrandingForProject(projectId);
  const brandName = branding?.brandName?.trim();

  if (!brandName) {
    return {};
  }

  return {
    title: {
      default: brandName,
      template: `%s — ${brandName}`,
    },
  };
}

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

  // Shell / assistant density still collapse null → personal. Tab filter +
  // Overview Suggested-path well read the three-state signal instead.
  const accountKind = account?.kind ?? "personal";
  const tabAudience = account?.kind ?? null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [messagesResult, toursResult] = await Promise.all([
    supabase
      .from("assistant_messages")
      .select("id, role, content, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    user
      ? supabase
          .from("user_tours")
          .select("tour_key")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] as { tour_key: string }[] | null }),
  ]);

  const initialMessages = (messagesResult.data ?? []) as AssistantMessage[];
  const dismissedTourKeys = (toursResult.data ?? []).map(
    (row) => row.tour_key,
  );

  return (
    <AssistantWorkspace
      projectId={projectId}
      accountKind={accountKind}
      initialMessages={initialMessages}
    >
      <TourProvider
        projectId={projectId}
        dismissedTourKeys={dismissedTourKeys}
      >
        <ProjectShell
          projectId={projectId}
          coupleNames={project.name}
          weddingDate={project.wedding_date}
          accountKind={accountKind}
        >
          <ProjectWorkspaceNav projectId={projectId} accountKind={tabAudience} />
          {children}
        </ProjectShell>
      </TourProvider>
    </AssistantWorkspace>
  );
}
