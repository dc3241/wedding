import { redirect } from "next/navigation";
import { OnboardingWizard } from "./onboarding-wizard";
import { getAccountContext } from "@/lib/account-context";
import {
  getCoupleDestinationPath,
  needsCoupleOnboarding,
} from "@/lib/onboarding-gate";
import { createClient } from "@/utils/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (!account) {
    redirect("/projects");
  }

  if (account.kind === "business") {
    redirect("/dashboard");
  }

  if (!account.firstProjectId) {
    redirect("/projects");
  }

  const projectId = account.firstProjectId;

  const needsOnboarding = await needsCoupleOnboarding(supabase, projectId);
  if (!needsOnboarding) {
    redirect(await getCoupleDestinationPath(supabase, projectId));
  }

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();

  if (!project) {
    redirect("/projects");
  }

  return (
    <OnboardingWizard projectId={projectId} coupleNames={project.name} />
  );
}
