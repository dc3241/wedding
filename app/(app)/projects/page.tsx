import Link from "next/link";
import { OnboardingForm } from "@/components/projects/onboarding-form";
import { NewWeddingForm } from "@/components/projects/new-wedding-form";
import { createClient } from "@/utils/supabase/server";

type Project = {
  id: string;
  name: string;
  wedding_date: string | null;
  created_at: string;
};

function formatWeddingDate(date: string | null) {
  if (!date) return null;
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
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

  const { data: memberships } = await supabase
    .from("account_members")
    .select("account_id")
    .limit(1);

  if (!memberships?.length) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <OnboardingForm />
      </div>
    );
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("kind")
    .eq("id", memberships[0].account_id)
    .single();

  const accountKind = account?.kind;

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("wedding_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const projectList = (projects ?? []) as Project[];

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-zinc-500">Your weddings</p>
        </div>
        {accountKind === "business" && <NewWeddingForm />}
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {projectList.length === 0 ? (
        <p className="text-sm text-zinc-500">No projects yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200">
          {projectList.map((project) => {
            const weddingDate = formatWeddingDate(project.wedding_date);

            return (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
                >
                  <span className="font-medium">{project.name}</span>
                  {weddingDate ? (
                    <span className="text-sm text-zinc-500">{weddingDate}</span>
                  ) : (
                    <span className="text-sm text-zinc-400">No date set</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
