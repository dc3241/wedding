import { IdeationBoard } from "@/components/admin/ideation-board";
import { PageHeader } from "@/components/ui/page-header";
import { getIdeationItems } from "@/lib/admin/queries";
import { createClient } from "@/utils/supabase/server";

export default async function AdminIdeationPage() {
  const supabase = await createClient();
  const items = await getIdeationItems(supabase);

  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Ideation"
        description="Like ideas and set platform, format, and audience on each. Friday produces those likes, then they leave this list so they are not made again."
      />

      <IdeationBoard items={items} />
    </div>
  );
}
