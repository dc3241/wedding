import { ContentQueueBoard } from "@/components/admin/content-queue-board";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getContentQueue } from "@/lib/admin/queries";
import { createClient } from "@/utils/supabase/server";

function formatWeekOf(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function AdminStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-5 py-4">
      <div className="mb-1.5 text-[14px] font-medium text-muted">{label}</div>
      <div className="font-display text-[32px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-ink">
        {value}
      </div>
    </Card>
  );
}

export default async function AdminContentQueuePage() {
  const supabase = await createClient();
  const { weekOf, items } = await getContentQueue(supabase);

  const pending = items.filter((i) => i.status === "pending").length;
  const approved = items.filter((i) => i.status === "approved").length;
  const denied = items.filter((i) => i.status === "denied").length;

  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Content queue"
        description={
          weekOf ? `Week of ${formatWeekOf(weekOf)}` : "No posts queued yet"
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <AdminStat label="Batch total" value={String(items.length)} />
        <AdminStat label="Pending" value={String(pending)} />
        <AdminStat label="Approved" value={String(approved)} />
        <AdminStat label="Denied" value={String(denied)} />
      </div>

      <ContentQueueBoard items={items} />
    </div>
  );
}
