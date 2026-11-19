import { PartnerManager, type PartnerRow } from "@/components/admin/partner-manager";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/utils/supabase/server";

function thirtyDaysAgo(): string {
  return new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
}

export default async function AdminPartnersPage() {
  const supabase = await createClient();
  const since = thirtyDaysAgo();
  const [{ data: links, error }, { data: clicks }] = await Promise.all([
    supabase
      .from("partner_links")
      .select(
        "id, slug, kind, partner_name, title, body, cta_label, url, image_url, placements, active, starts_on, ends_on, sort_order",
      )
      .order("sort_order")
      .order("created_at"),
    supabase.from("partner_link_clicks").select("link_id, clicks").gte("day", since),
  ]);

  const totals = new Map<string, number>();
  for (const c of clicks ?? []) totals.set(c.link_id, (totals.get(c.link_id) ?? 0) + c.clicks);

  const rows: PartnerRow[] = (links ?? []).map((l) => ({
    ...l,
    body: l.body ?? "",
    image_url: l.image_url ?? "",
    starts_on: l.starts_on ?? "",
    ends_on: l.ends_on ?? "",
    clicks30: totals.get(l.id) ?? 0,
  }));

  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Partners"
        description="Affiliate links and sponsor cards on the public site. Cards link through /go/<slug>, which counts clicks."
      />
      {error ? (
        <p className="mb-4 rounded-[var(--radius-inner)] bg-rosewood-wash px-4 py-3 text-[14px] text-rosewood">
          Couldn&apos;t load partners: {error.message}. Has the partners migration been pasted?
        </p>
      ) : null}
      <PartnerManager rows={rows} />
    </div>
  );
}
