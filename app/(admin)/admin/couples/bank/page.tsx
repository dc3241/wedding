import { ContentBankBoard } from "@/components/admin/content-bank-board";
import { PageHeader } from "@/components/ui/page-header";
import { COUPLES_BANK_PLATFORMS } from "@/lib/admin/platform-audience";
import { getContentBank } from "@/lib/admin/queries";
import { createClient } from "@/utils/supabase/server";

export default async function CouplesBankPage() {
  const supabase = await createClient();
  const items = await getContentBank(supabase);

  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Content bank — Couples"
        description="Reusable ideas by platform — pull from here when filling out the schedule, or generate new ones from Automations."
      />
      <ContentBankBoard items={items} platforms={COUPLES_BANK_PLATFORMS} />
    </div>
  );
}
