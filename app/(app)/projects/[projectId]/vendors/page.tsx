import Link from "next/link";
import { AddVendorForm } from "@/components/vendors/AddVendorForm";
import { AskAssistantLink } from "@/components/assistant/AskAssistantLink";
import { ASSISTANT_PREFILLS } from "@/components/assistant/prefills";
import { GmailConnection } from "@/components/vendors/GmailConnection";
import { OutreachToContactSection } from "@/components/vendors/OutreachToContactSection";
import { OutreachShortlistRow } from "@/components/vendors/OutreachVendorRow";
import { VendorAggregateStepper } from "@/components/vendors/VendorAggregateStepper";
import {
  VendorsToBookSection,
  type VendorTargetRow,
} from "@/components/vendors/VendorsToBookSection";
import {
  OUTREACH_STATUS_ORDER,
  type OutreachVendor,
} from "@/components/vendors/outreach-vendor";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { createClient } from "@/utils/supabase/server";
import { getGmailConnectionEmail } from "@/lib/gmail-connection-status";

function formatDefaultDate(date: string | null) {
  if (!date) return "";
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatEyebrowDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function VendorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ gmail_error?: string; gmail_connected?: string }>;
}) {
  const { projectId } = await params;
  const { gmail_error: gmailError, gmail_connected: gmailConnected } =
    await searchParams;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  const stackClass = sectionStackClass(account?.kind ?? "personal");
  const connectedEmail = await getGmailConnectionEmail();
  const returnTo = `/projects/${projectId}/vendors`;

  const [{ data: project }, { data: rows }, { data: targetRows }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("name, wedding_date")
        .eq("id", projectId)
        .single(),
      supabase
        .from("project_vendors")
        .select(
          "id, status, quoted_price, vendors(id, name, category, contact_email, website, ai_overview, last_enriched_at)",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("vendor_targets")
        .select("id, category, note, status")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
    ]);

  const defaultDate = formatDefaultDate(project?.wedding_date ?? null);
  const projectName = project?.name ?? "Your wedding";
  const weddingDate = project?.wedding_date ?? null;
  const eyebrow =
    weddingDate != null
      ? `${projectName} · ${formatEyebrowDate(weddingDate)}`
      : projectName;

  const outreachList: OutreachVendor[] = (rows ?? []).flatMap((row) => {
    const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
    if (!vendor) return [];
    return [
      {
        id: row.id,
        status: row.status as OutreachVendor["status"],
        quoted_price:
          row.quoted_price === null || row.quoted_price === undefined
            ? null
            : Number(row.quoted_price),
        vendor,
      },
    ];
  });

  const vendorTargets: VendorTargetRow[] = (targetRows ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    note: row.note,
    status: row.status as VendorTargetRow["status"],
  }));

  const toContactItems = outreachList.filter(
    (item) => item.status === "to_contact",
  );
  const otherItems = OUTREACH_STATUS_ORDER.filter(
    (status) => status !== "to_contact",
  ).flatMap((status) =>
    outreachList.filter((item) => item.status === status),
  );

  return (
    <div className={stackClass}>
      <PageHeader
        title="Vendors"
        eyebrow={eyebrow}
        description="Find local vendors, track outreach, and book your team."
        actions={
          <div className="flex shrink-0 flex-wrap gap-2">
            <ButtonLink
              href={`/projects/${projectId}/vendors/outreach`}
              variant="default"
            >
              Review drafts
            </ButtonLink>
            <ButtonLink
              href={`/projects/${projectId}/vendors/search`}
              variant="primary"
            >
              Search vendors
            </ButtonLink>
          </div>
        }
      />

      <GmailConnection
        connectedEmail={connectedEmail}
        returnTo={returnTo}
        errorMessage={gmailError ?? null}
        justConnected={gmailConnected === "1"}
      />

      <AddVendorForm projectId={projectId} />

      <VendorsToBookSection targets={vendorTargets} />

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Outreach
          </p>
          {outreachList.length > 0 ? (
            <Link
              href={`/projects/${projectId}/vendors/outreach`}
              className="text-[14px] font-semibold text-accent hover:opacity-80"
            >
              Manage outreach
            </Link>
          ) : null}
        </div>

        {outreachList.length === 0 ? (
          <Card className="px-8 py-10 text-center">
            <p className="text-[15px] font-medium text-muted">
              No vendors on your outreach list yet. Search or add one manually.
            </p>
            <div className="mt-3">
              <AskAssistantLink prefill={ASSISTANT_PREFILLS.vendors}>
                Ask assistant to find vendors
              </AskAssistantLink>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="px-6 py-5">
              <VendorAggregateStepper vendors={outreachList} />
            </Card>

            {toContactItems.length > 0 ? (
              <OutreachToContactSection
                projectId={projectId}
                items={toContactItems}
                defaultDate={defaultDate}
              />
            ) : null}

            {otherItems.length > 0 ? (
              <Card className="overflow-hidden px-3.5 py-3.5">
                <ul>
                  {otherItems.map((item) => (
                    <li key={item.id} className="mb-2 last:mb-0">
                      <OutreachShortlistRow
                        projectId={projectId}
                        item={item}
                        className="rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed"
                      />
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
