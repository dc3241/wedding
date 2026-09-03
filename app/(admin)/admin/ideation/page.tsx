import { IdeationBoard } from "@/components/admin/ideation-board";
import { getIdeationItems } from "@/lib/admin/queries";
import { createClient } from "@/utils/supabase/server";

export default async function AdminIdeationPage() {
  const supabase = await createClient();
  const items = await getIdeationItems(supabase);

  return (
    <div>
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.01em] text-ink">
        Ideation
      </h1>
      <p className="mb-5 text-[13.5px] text-muted">
        Brainstorm with Claude, then rate and comment — future generations pull your best- and
        worst-rated ideas as context.
      </p>

      <IdeationBoard items={items} />
    </div>
  );
}
