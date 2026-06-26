import { redirect } from "next/navigation";
import { WorkspacePlaceholder } from "@/components/projects/workspace-placeholder";
import { getAccountContext } from "@/lib/account-context";
import { createClient } from "@/utils/supabase/server";

export default async function ContractsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (account?.kind !== "business") {
    redirect(`/projects/${projectId}`);
  }

  return <WorkspacePlaceholder title="Contracts" />;
}
