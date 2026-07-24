import Link from "next/link";
import { AddVendorForm } from "@/components/vendors/AddVendorForm";
import { AskAssistantLink } from "@/components/assistant/AskAssistantLink";
import { ASSISTANT_PREFILLS } from "@/components/assistant/prefills";
import {
  BookedVendorsSection,
  type BookedSlot,
  type UnslottedBookedVendor,
} from "@/components/vendors/BookedVendorsSection";
import { DeclinedVendorsGroup } from "@/components/vendors/DeclinedVendorsGroup";
import { GmailConnection } from "@/components/vendors/GmailConnection";
import { OutreachToContactSection } from "@/components/vendors/OutreachToContactSection";
import { OutreachShortlistRow } from "@/components/vendors/OutreachVendorRow";
import { VendorAggregateStepper } from "@/components/vendors/VendorAggregateStepper";
import {
  VendorsToBookSection,
  type VendorTargetRow,
} from "@/components/vendors/VendorsToBookSection";
import {
  IN_FLIGHT_STATUSES,
  type OutreachVendor,
} from "@/components/vendors/outreach-vendor";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { createClient } from "@/utils/supabase/server";
import { getGmailConnectionEmail } from "@/lib/gmail-connection-status";

const PV_SELECT =
  "id, status, quoted_price, notes, vendors(id, name, category, contact_email, contact_phone, address, website, notes, ai_overview, last_enriched_at)";

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

type PvRow = {
  id: string;
  status: string;
  quoted_price: number | string | null;
  notes: string | null;
  vendor: {
    id: string;
    name: string;
    category: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    address: string | null;
    website: string | null;
    notes: string | null;
    ai_overview: string | null;
    last_enriched_at: string | null;
  };
};

function mapPvRows(
  rows: {
    id: string;
    status: string;
    quoted_price: number | string | null;
    notes: string | null;
    vendors: unknown;
  }[] | null,
): PvRow[] {
  return (rows ?? []).flatMap((row) => {
    const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
    if (!vendor) return [];
    return [
      {
        id: row.id,
        status: row.status,
        quoted_price: row.quoted_price,
        notes: row.notes ?? null,
        vendor: vendor as PvRow["vendor"],
      },
    ];
  });
}

function toOutreachVendor(row: PvRow): OutreachVendor {
  return {
    id: row.id,
    status: row.status as OutreachVendor["status"],
    quoted_price:
      row.quoted_price === null || row.quoted_price === undefined
        ? null
        : Number(row.quoted_price),
    vendor: {
      id: row.vendor.id,
      name: row.vendor.name,
      category: row.vendor.category,
      contact_email: row.vendor.contact_email,
      website: row.vendor.website,
      ai_overview: row.vendor.ai_overview,
      last_enriched_at: row.vendor.last_enriched_at,
    },
  };
}

export default async function VendorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    gmail_error?: string;
    gmail_connected?: string;
    category?: string;
  }>;
}) {
  const { projectId } = await params;
  const {
    gmail_error: gmailError,
    gmail_connected: gmailConnected,
    category: categoryPrefill,
  } = await searchParams;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  const stackClass = sectionStackClass(account?.kind ?? "personal");
  const connectedEmail = await getGmailConnectionEmail();
  const returnTo = `/projects/${projectId}/vendors`;

  const [
    { data: project },
    { data: inFlightRows },
    { data: bookedRows },
    { data: declinedRows },
    { data: targetRows },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("name, wedding_date")
      .eq("id", projectId)
      .single(),
    supabase
      .from("project_vendors")
      .select(PV_SELECT)
      .eq("project_id", projectId)
      .in("status", [...IN_FLIGHT_STATUSES])
      .order("created_at", { ascending: true }),
    supabase
      .from("project_vendors")
      .select(PV_SELECT)
      .eq("project_id", projectId)
      .eq("status", "booked")
      .order("created_at", { ascending: true }),
    supabase
      .from("project_vendors")
      .select(PV_SELECT)
      .eq("project_id", projectId)
      .eq("status", "declined")
      .order("created_at", { ascending: true }),
    supabase
      .from("vendor_targets")
      .select("id, category, note, status, project_vendor_id")
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

  const inFlightPv = mapPvRows(inFlightRows);
  const bookedPv = mapPvRows(bookedRows);
  const declinedPv = mapPvRows(declinedRows);

  const outreachList = inFlightPv.map(toOutreachVendor);
  const declinedList = declinedPv.map(toOutreachVendor);

  const vendorByProjectVendorId = new Map(
    bookedPv.map((row) => [row.id, row]),
  );

  const vendorTargets: VendorTargetRow[] = (targetRows ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    note: row.note,
    status: row.status as VendorTargetRow["status"],
    project_vendor_id: row.project_vendor_id ?? null,
  }));

  const slottedProjectVendorIds = new Set(
    vendorTargets
      .map((t) => t.project_vendor_id)
      .filter((id): id is string => id != null),
  );

  const bookedSlots: BookedSlot[] = vendorTargets
    .filter((t) => t.status === "booked")
    .map((t) => {
      const linked = t.project_vendor_id
        ? vendorByProjectVendorId.get(t.project_vendor_id)
        : undefined;
      return {
        id: t.id,
        category: t.category,
        note: t.note,
        vendor: linked
          ? {
              vendorId: linked.vendor.id,
              name: linked.vendor.name,
              contact_email: linked.vendor.contact_email,
              contact_phone: linked.vendor.contact_phone,
              address: linked.vendor.address,
              website: linked.vendor.website,
              notes: linked.vendor.notes ?? linked.notes,
              quoted_price:
                linked.quoted_price === null || linked.quoted_price === undefined
                  ? null
                  : Number(linked.quoted_price),
            }
          : null,
      };
    });

  const unslottedBooked: UnslottedBookedVendor[] = bookedPv
    .filter((row) => !slottedProjectVendorIds.has(row.id))
    .map((row) => ({
      projectVendorId: row.id,
      vendorId: row.vendor.id,
      name: row.vendor.name,
      category: row.vendor.category,
    }));

  const toContactItems = outreachList.filter(
    (item) => item.status === "to_contact",
  );
  const midFlightItems = outreachList.filter(
    (item) => item.status === "contacted" || item.status === "replied",
  );

  const slotOptions = vendorTargets.map((t) => ({
    id: t.id,
    category: t.category,
    status: t.status,
    project_vendor_id: t.project_vendor_id,
  }));

  const existingVendors = [...inFlightPv, ...bookedPv, ...declinedPv].map(
    (row) => ({
      name: row.vendor.name,
      category: row.vendor.category,
    }),
  );

  const hasOutreachContent =
    outreachList.length > 0 || declinedList.length > 0;

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

      <BookedVendorsSection
        projectId={projectId}
        slots={bookedSlots}
        unslotted={unslottedBooked}
        slotTargets={slotOptions}
      />

      <VendorsToBookSection targets={vendorTargets} />

      <AddVendorForm
        projectId={projectId}
        existingVendors={existingVendors}
        defaultCategoryId={categoryPrefill ?? null}
      />

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Outreach
          </p>
          {hasOutreachContent ? (
            <Link
              href={`/projects/${projectId}/vendors/outreach`}
              className="text-[14px] font-semibold text-accent hover:opacity-80"
            >
              Manage outreach
            </Link>
          ) : null}
        </div>

        {!hasOutreachContent ? (
          <Card className="px-8 py-10 text-center">
            <p className="text-[15px] font-medium text-muted">
              No vendors in outreach yet. Search or add one manually.
            </p>
            <div className="mt-3">
              <AskAssistantLink prefill={ASSISTANT_PREFILLS.vendors}>
                Ask assistant to find vendors
              </AskAssistantLink>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {outreachList.length > 0 ? (
              <Card className="px-6 py-5">
                <VendorAggregateStepper vendors={outreachList} />
              </Card>
            ) : null}

            {toContactItems.length > 0 ? (
              <OutreachToContactSection
                projectId={projectId}
                items={toContactItems}
                defaultDate={defaultDate}
              />
            ) : null}

            {midFlightItems.length > 0 ? (
              <Card className="overflow-hidden px-3.5 py-3.5">
                <ul>
                  {midFlightItems.map((item) => (
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

            {outreachList.length === 0 && declinedList.length > 0 ? (
              <Card className="px-8 py-8 text-center">
                <p className="text-[15px] font-medium text-muted">
                  No vendors in flight. Declined vendors are below.
                </p>
              </Card>
            ) : null}

            <DeclinedVendorsGroup projectId={projectId} items={declinedList} />
          </div>
        )}
      </section>
    </div>
  );
}
