import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectNav } from "@/components/projects/project-nav";
import { createClient } from "@/utils/supabase/server";

function formatWeddingDate(date: string | null) {
  if (!date) return null;
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, wedding_date")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const weddingDate = formatWeddingDate(project.wedding_date);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link
        href="/projects"
        className="text-sm text-zinc-500 hover:text-zinc-700"
      >
        ← All projects
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {project.name}
        </h1>
        {weddingDate ? (
          <p className="mt-1 text-sm text-zinc-500">{weddingDate}</p>
        ) : (
          <p className="mt-1 text-sm text-zinc-400">No date set</p>
        )}
        <div className="mt-6">
          <ProjectNav projectId={projectId} />
        </div>
      </header>

      {children}
    </div>
  );
}
