import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { AssistantWorkspace } from "@/components/assistant/AssistantWorkspace";
import { ASSISTANT_HISTORY_WINDOW } from "@/components/assistant/constants";
import type { AgentDraftPreview, AssistantMessage } from "@/components/assistant/types";
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

  // CAL-04 / CAL-06: invited members pass kind=null; Calendar needs
  // project_members.role only in that path. Account owners never read role
  // for tab gating.
  const [messagesResult, toursResult, memberRoleResult, draftsResult] =
    await Promise.all([
      // Last N only (desc + limit), then reverse so the panel seeds newest-last.
      // A naive ascending .limit(N) would return the oldest N — wrong.
      supabase
        .from("assistant_messages")
        .select("id, role, content, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(ASSISTANT_HISTORY_WINDOW),
      user
        ? supabase
            .from("user_tours")
            .select("tour_key")
            .eq("user_id", user.id)
        : Promise.resolve({ data: [] as { tour_key: string }[] | null }),
      tabAudience === null && user
        ? supabase
            .from("project_members")
            .select("role")
            .eq("project_id", projectId)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null as { role: string } | null }),
      account
        ? supabase
            .from("agent_drafts")
            .select("id, kind, subject, body, status, target_id")
            .eq("account_id", account.accountId)
            .eq("project_id", projectId)
            .eq("kind", "vendor_outreach")
            .in("status", ["pending", "approved"])
            .order("created_at", { ascending: false })
        : Promise.resolve({
            data: [] as {
              id: string;
              kind: string;
              subject: string | null;
              body: string | null;
              status: string;
              target_id: string;
            }[] | null,
          }),
    ]);

  const initialMessages = (
    [...(messagesResult.data ?? [])].reverse() as AssistantMessage[]
  );
  const draftRows = draftsResult.data ?? [];
  const vendorIds = [...new Set(draftRows.map((row) => row.target_id))];

  const vendorNamesResult =
    vendorIds.length > 0
      ? await supabase.from("vendors").select("id, name").in("id", vendorIds)
      : { data: [] as { id: string; name: string }[] | null };

  const vendorNameById = new Map(
    (vendorNamesResult.data ?? []).map((row) => [row.id, row.name]),
  );

  const pendingDrafts: AgentDraftPreview[] = draftRows.map((row) => ({
    id: row.id,
    kind: "vendor_outreach",
    subject: row.subject,
    body: row.body,
    status: (row.status === "approved" ? "approved" : "pending") as
      | "pending"
      | "approved",
    targetLabel: vendorNameById.get(row.target_id) ?? "Vendor",
  }));
  const dismissedTourKeys = (toursResult.data ?? []).map(
    (row) => row.tour_key,
  );
  const projectMemberRole = memberRoleResult.data?.role ?? null;

  return (
    <AssistantWorkspace
      projectId={projectId}
      accountKind={accountKind}
      initialMessages={initialMessages}
      pendingDrafts={pendingDrafts}
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
          <ProjectWorkspaceNav
            projectId={projectId}
            accountKind={tabAudience}
            projectMemberRole={projectMemberRole}
          />
          {children}
        </ProjectShell>
      </TourProvider>
    </AssistantWorkspace>
  );
}
