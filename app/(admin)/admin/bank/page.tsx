import { ContentBankBoard } from "@/components/admin/content-bank-board";
import { getContentBank } from "@/lib/admin/queries";
import { createClient } from "@/utils/supabase/server";

export default async function AdminBankPage() {
  const supabase = await createClient();
  const items = await getContentBank(supabase);

  return (
    <div>
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.01em] text-ink">
        Content bank
      </h1>
      <p className="mb-5 text-[13.5px] text-muted">
        Reusable ideas by platform — pull from here when filling out the schedule, or generate
        new ones from Automations.
      </p>

      <ContentBankBoard items={items} />
    </div>
  );
}
