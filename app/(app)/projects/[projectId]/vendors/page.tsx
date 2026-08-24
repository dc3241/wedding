import { toLocalDateKey } from "@/app/(app)/calendar/calendar-source";
import { getAddedPlaceIds } from "@/app/(app)/projects/[projectId]/vendors/actions";
import {
  BookedVendorsSection,
  type BookedLinkableItem,
  type BookedVendorObject,
  type EmptyBookedSlot,
} from "@/components/vendors/BookedVendorsSection";
import type { ConnectableBookedVendor } from "@/components/vendors/ConnectExistingVendorControl";
import { GmailConnection } from "@/components/vendors/GmailConnection";
import { OutreachRegion } from "@/components/vendors/OutreachRegion";
import { VendorSearchForm } from "@/components/vendors/VendorSearchForm";
import type { NeededVendorTarget } from "@/components/vendors/VendorSearchRail";
import {
  VendorsToBookSection,
  type VendorTargetRow,
} from "@/components/vendors/VendorsToBookSection";
import { IN_FLIGHT_STATUSES, type OutreachVendor } from "@/components/vendors/outreach-vendor";
import { TourHelpButton } from "@/components/tour/TourHelpButton";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { deriveBookedVendorMoney } from "@/lib/booked-vendor-money";
import { sectionStackClass } from "@/lib/density";
import { getGmailConnectionEmail } from "@/lib/gmail-connection-status";
import { VENDOR_CATEGORIES } from "@/lib/vendor-categories";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const PV_SELECT =
  "id, status, quoted_price, notes, arrival_time, scope_note, confirm_token, confirmed_at, vendors(id, name, category, contact_email, contact_phone, address, website, notes, ai_overview, last_enriched_at)";

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

function buildOnListByCategoryId(
  rows: {
    vendors:
      | { category: string | null }
      | { category: string | null }[]
      | null;
  }[],
): Record<string, number> {
  const byLabel = new Map(
    VENDOR_CATEGORIES.map((c) => [c.label, c.id] as const),
  );
  const counts: Record<string, number> = {};

  for (const row of rows) {
    const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
    const raw = vendor?.category?.trim();
    if (!raw) continue;

    const byId = VENDOR_CATEGORIES.find((c) => c.id === raw);
    const id = byId?.id ?? byLabel.get(raw);
    if (!id) continue;

    counts[id] = (counts[id] ?? 0) + 1;
  }

  return counts;
}

type PvRow = {
  id: string;
  status: string;
  quoted_price: number | string | null;
  notes: string | null;
  arrival_time: string | null;
  scope_note: string | null;
  confirm_token: string;
  confirmed_at: string | null;
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
    arrival_time: string | null;
    scope_note: string | null;
    confirm_token: string;
    confirmed_at: string | null;
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
        arrival_time: row.arrival_time ?? null,
        scope_note: row.scope_note ?? null,
        confirm_token: row.confirm_token,
        confirmed_at: row.confirmed_at ?? null,
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
    addedPlaceIds,
    profileResult,
    { data: allProjectVendorCategories },
    { data: budgetItemRows },
    { data: paymentRows },
    { data: scheduleRows },
    { data: contractRows },
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
    getAddedPlaceIds(projectId),
    supabase
      .from("wedding_profile")
      .select("location")
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("project_vendors")
      .select("vendors(category)")
      .eq("project_id", projectId),
    supabase
      .from("budget_items")
      .select(
        "id, category, label, planned_amount, actual_amount, notes, project_vendor_id",
      )
      .eq("project_id", projectId)
      .order("category", { ascending: true, nullsFirst: false })
      .order("label", { ascending: true }),
    supabase
      .from("budget_payments")
      .select("id, budget_item_id, amount, paid_on, note")
      .eq("project_id", projectId)
      .order("paid_on", { ascending: true, nullsFirst: false }),
    supabase
      .from("payment_schedule")
      .select("id, budget_item_id, amount, due_on, label")
      .eq("project_id", projectId)
      .order("due_on", { ascending: true }),
    supabase
      .from("files")
      .select("id, name, size_bytes, created_at, project_vendor_id")
      .eq("project_id", projectId)
      .eq("kind", "contract")
      .not("project_vendor_id", "is", null)
      .order("created_at", { ascending: false }),
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

  const vendorTargets: VendorTargetRow[] = (targetRows ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    note: row.note,
    status: row.status as VendorTargetRow["status"],
    project_vendor_id: row.project_vendor_id ?? null,
  }));

  const neededTargets: NeededVendorTarget[] = vendorTargets
    .filter((t) => t.status === "needed")
    .map((t) => ({
      id: t.id,
      category: t.category,
      note: t.note,
    }));

  const defaultLocation = profileResult.data?.location?.trim() ?? "";
  const initialOnListByCategoryId = buildOnListByCategoryId(
    allProjectVendorCategories ?? [],
  );

  const todayKey = toLocalDateKey(new Date());

  const budgetItems = (budgetItemRows ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    label: row.label,
    actual_amount:
      row.actual_amount === null || row.actual_amount === undefined
        ? null
        : Number(row.actual_amount),
    notes: row.notes ?? null,
    project_vendor_id: row.project_vendor_id ?? null,
  }));

  const payments = (paymentRows ?? []).map((row) => ({
    id: row.id,
    budget_item_id: row.budget_item_id,
    amount: Number(row.amount),
    paid_on: row.paid_on ?? null,
    note: row.note ?? null,
  }));

  const schedule = (scheduleRows ?? []).map((row) => ({
    id: row.id,
    budget_item_id: row.budget_item_id,
    amount: Number(row.amount),
    due_on: row.due_on,
    label: row.label ?? null,
  }));

  const contractsByPvId = new Map<
    string,
    { id: string; name: string; size_bytes: number | null; created_at: string }[]
  >();
  for (const row of contractRows ?? []) {
    if (!row.project_vendor_id) continue;
    const list = contractsByPvId.get(row.project_vendor_id) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      size_bytes:
        row.size_bytes === null || row.size_bytes === undefined
          ? null
          : Number(row.size_bytes),
      created_at: row.created_at,
    });
    contractsByPvId.set(row.project_vendor_id, list);
  }

  const slotsByPvId = new Map<
    string,
    { id: string; category: string; note: string | null }[]
  >();
  for (const t of vendorTargets) {
    if (t.status !== "booked" || t.project_vendor_id == null) continue;
    const list = slotsByPvId.get(t.project_vendor_id) ?? [];
    list.push({ id: t.id, category: t.category, note: t.note });
    slotsByPvId.set(t.project_vendor_id, list);
  }

  const bookedVendors: BookedVendorObject[] = bookedPv.map((row) => {
    const money = deriveBookedVendorMoney(
      row.id,
      budgetItems,
      payments,
      schedule,
      todayKey,
    );
    return {
      projectVendorId: row.id,
      vendorId: row.vendor.id,
      name: row.vendor.name,
      category: row.vendor.category,
      contact_phone: row.vendor.contact_phone,
      contact_email: row.vendor.contact_email,
      slots: slotsByPvId.get(row.id) ?? [],
      linkedItems: money.linkedItems.map((item) => ({
        id: item.id,
        category: item.category,
        label: item.label,
        actual_amount: item.actual_amount,
        notes: item.notes,
        paid: item.paid,
        payments: item.payments,
        schedule: item.schedule,
        nextDue: item.nextDue,
        pastDue: item.pastDue,
      })),
      price: money.price,
      paid: money.paid,
      nextDue: money.nextDue,
      pastDue: money.pastDue,
      notes: money.notes,
      arrival_time: row.arrival_time,
      scope_note: row.scope_note,
      confirm_token: row.confirm_token,
      confirmed_at: row.confirmed_at,
      contracts: contractsByPvId.get(row.id) ?? [],
    };
  });

  const emptyBookedSlots: EmptyBookedSlot[] = vendorTargets
    .filter((t) => t.status === "booked" && t.project_vendor_id == null)
    .map((t) => ({
      id: t.id,
      category: t.category,
      note: t.note,
    }));

  const connectableVendors: ConnectableBookedVendor[] = bookedPv.map((row) => ({
    projectVendorId: row.id,
    name: row.vendor.name,
    coveredCategories: vendorTargets
      .filter((t) => t.project_vendor_id === row.id)
      .map((t) => t.category),
  }));

  const nameByProjectVendorId = new Map(
    [...inFlightPv, ...bookedPv, ...declinedPv].map((row) => [
      row.id,
      row.vendor.name,
    ]),
  );

  const slotOptions = vendorTargets.map((t) => ({
    id: t.id,
    category: t.category,
    status: t.status,
    project_vendor_id: t.project_vendor_id,
    linkedVendorName: t.project_vendor_id
      ? (nameByProjectVendorId.get(t.project_vendor_id) ?? null)
      : null,
  }));

  const linkableItems: BookedLinkableItem[] = budgetItems.map((item) => ({
    id: item.id,
    category: item.category,
    label: item.label,
    project_vendor_id: item.project_vendor_id,
    linkedVendorName: item.project_vendor_id
      ? (nameByProjectVendorId.get(item.project_vendor_id) ?? null)
      : null,
  }));

  const existingVendors = [...inFlightPv, ...bookedPv, ...declinedPv].map(
    (row) => ({
      projectVendorId: row.id,
      name: row.vendor.name,
      category: row.vendor.category,
    }),
  );

  return (
    <div className={stackClass}>
      <PageHeader
        title="Vendors"
        eyebrow={eyebrow}
        description="Find local vendors, track outreach, and book your team."
        actions={<TourHelpButton tourKey="vendors" />}
      />

      <GmailConnection
        connectedEmail={connectedEmail}
        returnTo={returnTo}
        errorMessage={gmailError ?? null}
        justConnected={gmailConnected === "1"}
      />

      <VendorSearchForm
        projectId={projectId}
        defaultLocation={defaultLocation}
        initialAddedPlaceIds={addedPlaceIds}
        neededTargets={neededTargets}
        initialOnListByCategoryId={initialOnListByCategoryId}
      />

      <BookedVendorsSection
        projectId={projectId}
        vendors={bookedVendors}
        emptySlots={emptyBookedSlots}
        slotTargets={slotOptions}
        connectableVendors={connectableVendors}
        linkableItems={linkableItems}
      />

      <VendorsToBookSection targets={vendorTargets} />

      <OutreachRegion
        projectId={projectId}
        items={outreachList}
        declinedItems={declinedList}
        defaultDate={defaultDate}
        existingVendors={existingVendors}
        categoryTargets={slotOptions}
        defaultCategoryId={categoryPrefill ?? null}
      />
    </div>
  );
}
