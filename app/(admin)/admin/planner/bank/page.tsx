import { ContentBankBoard } from "@/components/admin/content-bank-board";
import { PageHeader } from "@/components/ui/page-header";
import { PLANNER_BANK_PLATFORMS } from "@/lib/admin/platform-audience";
import { getContentBank } from "@/lib/admin/queries";
import { createClient } from "@/utils/supabase/server";

export default async function PlannerBankPage() {
  const supabase = await createClient();
  const items = await getContentBank(supabase);

  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Content bank — Venues & planners"
        description="Approved queue graphics aimed at planners, plus LinkedIn, Reddit, and YouTube ideas."
      />
      <ContentBankBoard items={items} platforms={PLANNER_BANK_PLATFORMS} audience="planner" />
    </div>
  );
}
