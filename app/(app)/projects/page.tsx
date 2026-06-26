import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/projects/onboarding-form";
import { getAccountContext } from "@/lib/account-context";
import { getCoupleDestinationPath } from "@/lib/onboarding-gate";
import { createClient } from "@/utils/supabase/server";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const accountContext = await getAccountContext(supabase);

  if (!accountContext) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <OnboardingForm />
      </div>
    );
  }

  if (accountContext.kind === "personal" && accountContext.singleProjectId) {
    redirect(
      await getCoupleDestinationPath(supabase, accountContext.singleProjectId),
    );
  }

  if (accountContext.kind === "business") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-4 py-12">
      {error ? (
        <p className="mb-4 rounded border border-stone bg-surface px-3 py-2 text-sm text-rosewood">
          {error}
        </p>
      ) : null}
      <p className="text-sm text-ink-muted">No projects yet.</p>
    </div>
  );
}
