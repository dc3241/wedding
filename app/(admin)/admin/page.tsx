import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import { getContentBank, getReviewPosts } from "@/lib/admin/queries";
import { createClient } from "@/utils/supabase/server";

function AdminStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="px-5 py-4">
      <div className="mb-1.5 text-[14px] font-medium text-muted">{label}</div>
      <div className="text-[32px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-ink">
        {value}
      </div>
      {sub ? <div className="mt-1 text-[13px] text-muted">{sub}</div> : null}
    </Card>
  );
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const [bank, review] = await Promise.all([
    getContentBank(supabase),
    getReviewPosts(supabase),
  ]);
  const pending = review.filter((item) => item.status === "pending").length;

  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Overview"
        description="Generate posts on Ideation, then approve them into the bank."
      />

      <div className="mb-4 grid grid-cols-2 gap-3.5 md:grid-cols-3">
        <AdminStat label="Waiting on review" value={String(pending)} sub="on Ideation" />
        <AdminStat label="Bank ideas ready" value={String(bank.length)} sub="in the bank" />
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2 md:items-start">
        <Card className="px-6 py-5">
          <Eyebrow className="mb-3 text-accent">Ideation</Eyebrow>
          <p className="text-[15px] font-medium text-muted">
            Pick a platform, angle, and post type. Generate the caption and
            image when you have an idea — TikTok today, LinkedIn or Pinterest
            whenever they show up.
          </p>
          <ButtonLink href="/admin/ideation" variant="primary" className="mt-4">
            Open ideation
          </ButtonLink>
        </Card>
        <Card className="px-6 py-5">
          <Eyebrow className="mb-3 text-accent">Content bank</Eyebrow>
          <p className="text-[15px] font-medium text-muted">
            Approved posts land here, split by audience.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href="/admin/couples/bank" variant="default">
              Couples bank
            </ButtonLink>
            <ButtonLink href="/admin/planner/bank" variant="default">
              Venues & planners
            </ButtonLink>
          </div>
        </Card>
      </div>
    </div>
  );
}
