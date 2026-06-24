import Link from "next/link";
import { AddVendorForm } from "@/components/vendors/AddVendorForm";
import { GmailConnection } from "@/components/vendors/GmailConnection";
import { OutreachToContactSection } from "@/components/vendors/OutreachToContactSection";
import {
  OutreachVendorCard,
  OUTREACH_STATUS_HEADING,
  OUTREACH_STATUS_ORDER,
  type OutreachVendor,
} from "@/components/vendors/OutreachVendorRow";
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
  const connectedEmail = await getGmailConnectionEmail();
  const returnTo = `/projects/${projectId}/vendors`;

  const [{ data: project }, { data: rows }] = await Promise.all([
    supabase
      .from("projects")
      .select("wedding_date")
      .eq("id", projectId)
      .single(),
    supabase
      .from("project_vendors")
      .select(
        "id, status, vendors(id, name, category, contact_email, website, ai_overview, last_enriched_at)"
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
  ]);

  const defaultDate = formatDefaultDate(project?.wedding_date ?? null);

  const outreachList: OutreachVendor[] = (rows ?? [])
    .map((row) => {
      const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
      if (!vendor) return null;
      return {
        id: row.id,
        status: row.status as OutreachVendor["status"],
        vendor,
      };
    })
    .filter((item): item is OutreachVendor => item !== null);

  const grouped = OUTREACH_STATUS_ORDER.map((status) => ({
    status,
    items: outreachList.filter((item) => item.status === status),
  })).filter((group) => group.items.length > 0);

  const toContactItems =
    grouped.find((g) => g.status === "to_contact")?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-zinc-500">
          Find local vendors with live Google Places results.
        </p>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/projects/${projectId}/vendors/outreach`}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Review drafts
          </Link>
          <Link
            href={`/projects/${projectId}/vendors/search`}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Search vendors
          </Link>
        </div>
      </div>

      <GmailConnection
        connectedEmail={connectedEmail}
        returnTo={returnTo}
        errorMessage={gmailError ?? null}
        justConnected={gmailConnected === "1"}
      />

      <AddVendorForm projectId={projectId} />

      <section className="space-y-4">
        <h2 className="text-sm font-medium">Outreach list</h2>

        {grouped.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No vendors on your outreach list yet. Search for vendors or add one
            manually.
          </p>
        ) : (
          grouped.map(({ status, items }) => (
            <div key={status} className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {OUTREACH_STATUS_HEADING[status]} ({items.length})
              </h3>

              {status === "to_contact" ? (
                <OutreachToContactSection
                  projectId={projectId}
                  items={toContactItems}
                  defaultDate={defaultDate}
                />
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <OutreachVendorCard
                      key={item.id}
                      projectId={projectId}
                      item={item}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
