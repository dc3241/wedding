import Link from "next/link";
import { AddVendorForm } from "@/components/vendors/AddVendorForm";
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
import { Eyebrow } from "@/components/ui/eyebrow";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { createClient } from "@/utils/supabase/server";
import { getGmailConnectionEmail } from "@/lib/gmail-connection-status";

function formatDefaultDate(date: string | null) {
  if (!date) return "";
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
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
      .select("wedding_date")
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-[13px] text-ink-muted">
          Find local vendors with live Google Places results.
        </p>
        <div className="flex shrink-0 gap-2">
          <ButtonLink
            href={`/projects/${projectId}/vendors/outreach`}
            variant="default"
          >
            Review drafts
          </ButtonLink>
          <ButtonLink href={`/projects/${projectId}/vendors/search`} variant="primary">
            Search vendors
          </ButtonLink>
        </div>
      </div>

      <GmailConnection
        connectedEmail={connectedEmail}
        returnTo={returnTo}
        errorMessage={gmailError ?? null}
        justConnected={gmailConnected === "1"}
      />

      <AddVendorForm projectId={projectId} />

      <VendorsToBookSection targets={vendorTargets} />

      <section className="mt-12">
        <div className="mb-[18px] flex items-baseline justify-between">
          <Eyebrow>Outreach</Eyebrow>
          {outreachList.length > 0 ? (
            <Link
              href={`/projects/${projectId}/vendors/outreach`}
              className="text-[13px] text-plum hover:text-plum-deep"
            >
              Manage outreach
            </Link>
          ) : null}
        </div>

        {outreachList.length === 0 ? (
          <p className="px-1 text-[13px] text-ink-muted">
            No vendors on your outreach list yet. Search for vendors or add one
            manually.
          </p>
        ) : (
          <div className="space-y-5">
            <VendorAggregateStepper vendors={outreachList} className="mb-5" />

            {toContactItems.length > 0 ? (
              <OutreachToContactSection
                projectId={projectId}
                items={toContactItems}
                defaultDate={defaultDate}
              />
            ) : null}

            {otherItems.length > 0 ? (
              <div className="divide-y divide-stone">
                {otherItems.map((item) => (
                  <OutreachShortlistRow
                    key={item.id}
                    projectId={projectId}
                    item={item}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
