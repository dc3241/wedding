import { notFound } from "next/navigation";
import { isProjectToolHidden } from "@/lib/project-tools";

export default async function WebsiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (await isProjectToolHidden(projectId, "website")) {
    notFound();
  }
  return children;
}
