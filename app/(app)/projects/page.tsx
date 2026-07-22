import Link from "next/link";
import { redirect } from "next/navigation";
import { createProject } from "@/app/(app)/projects/actions";
import { OnboardingForm } from "@/components/projects/onboarding-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  getAccountContext,
  getDirectProjectIds,
} from "@/lib/account-context";
import { getCoupleDestinationPath } from "@/lib/onboarding-gate";
import { createClient } from "@/utils/supabase/server";

function formatWeddingDate(date: string | null) {
  if (!date) return null;
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const accountContext = await getAccountContext(supabase);

  if (!accountContext) {
    const directIds = await getDirectProjectIds(supabase);

    if (directIds.length === 1) {
      redirect(`/projects/${directIds[0]}`);
    }

    if (directIds.length > 1) {
      const { data: projectRows } = await supabase
        .from("projects")
        .select("id, name, wedding_date")
        .in("id", directIds);

      const byId = new Map((projectRows ?? []).map((p) => [p.id, p]));
      const projects = directIds
        .map((id) => byId.get(id))
        .filter((p): p is NonNullable<typeof p> => p != null);

      return (
        <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-8 px-6 py-12">
          <PageHeader
            title="Your weddings"
            description="Weddings you've been invited to."
          />
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-hairline">
              {projects.map((project) => {
                const dateLabel = formatWeddingDate(project.wedding_date);
                return (
                  <li key={project.id}>
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex items-baseline justify-between gap-4 px-5 py-4 no-underline transition-colors hover:bg-well"
                    >
                      <span className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                        {project.name}
                      </span>
                      <span className="shrink-0 text-[13px] tabular-nums text-muted">
                        {dateLabel ?? "No date set"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      );
    }

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
