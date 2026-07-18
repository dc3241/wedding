import { redirect } from "next/navigation";
import { createProject } from "@/app/(app)/projects/actions";
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

  if (accountContext.kind === "personal") {
    if (accountContext.firstProjectId) {
      redirect(
        await getCoupleDestinationPath(
          supabase,
          accountContext.firstProjectId,
        ),
      );
    }

    return (
      <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-4 py-12">
        {error ? (
          <p className="mb-4 rounded-[var(--radius-inner)] border border-hairline bg-surface px-3 py-2 text-sm text-rosewood">
            {error}
          </p>
        ) : null}
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              Create your wedding
            </h1>
            <p className="text-sm text-muted">
              Your account is ready. Add a wedding to continue.
            </p>
          </div>
          <form action={createProject} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-ink">
                Wedding name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Sarah & James — Oct 2026"
                className="w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-[var(--radius-inner)] bg-accent px-[11px] py-[11px] text-sm font-medium text-white hover:opacity-90"
            >
              Create wedding
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (accountContext.kind === "business") {
    redirect("/dashboard");
  }

  return null;
}
