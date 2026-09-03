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
        description="Brainstorm with Claude, then rate and comment — future generations pull your best- and worst-rated ideas as context."
      />

      <IdeationBoard items={items} />
    </div>
  );
}
