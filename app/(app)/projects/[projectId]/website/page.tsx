import { CreateWebsiteButton } from "./CreateWebsiteButton";
import { WebsiteEditor } from "./WebsiteEditor";
import { parseWeddingWebsiteContent, type WeddingWebsiteRow } from "@/components/website/types";
import { getAccountContext } from "@/lib/account-context";
import { createClient } from "@/utils/supabase/server";

function rowToWebsite(row: Record<string, unknown>): WeddingWebsiteRow {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    slug: row.slug === null || row.slug === undefined ? null : String(row.slug),
    published: Boolean(row.published),
    template: String(row.template),
    theme: String(row.theme),
    content: parseWeddingWebsiteContent(row.content),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export default async function WebsitePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  const accountKind = account?.kind ?? "personal";

  const { data: row } = await supabase
    .from("wedding_websites")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (!row) {
    return <CreateWebsiteButton projectId={projectId} />;
  }

  return (
    <WebsiteEditor
      projectId={projectId}
      website={rowToWebsite(row)}
      accountKind={accountKind}
    />
  );
}
