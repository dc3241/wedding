import Link from "next/link";
import { AddGuestForms } from "./AddGuestForms";
import { GuestRow } from "./GuestRow";
import { RsvpSubmissionsPanel } from "./RsvpSubmissionsPanel";
import type { RsvpSubmission } from "./rsvp-submissions";
import {
  RSVP_STATUSES,
  sumPartySize,
  sumPartySizeByStatus,
  type Guest,
  type RsvpStatus,
} from "./types";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { cn } from "@/lib/cn";
import { dataRowClass, sectionStackClass } from "@/lib/density";
import { createClient } from "@/utils/supabase/server";

const FILTER_OPTIONS: { value?: RsvpStatus; label: string }[] = [
  { label: "All" },
  ...RSVP_STATUSES.map((status) => ({
    value: status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
  })),
];

function guestsFilterHref(projectId: string, status?: RsvpStatus) {
  const base = `/projects/${projectId}/guests`;
  return status ? `${base}?status=${status}` : base;
}

function formatEyebrowDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function GuestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { projectId } = await params;
  const { status: statusParam } = await searchParams;

  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  const accountKind = account?.kind ?? "personal";
  const stackClass = sectionStackClass(accountKind);
  const rowClass = dataRowClass(accountKind);

  const [{ data: guests }, { data: submissionRows }, { data: project }] =
    await Promise.all([
      supabase
        .from("guests")
        .select(
          "id, full_name, email, phone, household, party_size, rsvp_status, meal_choice, notes",
        )
        .eq("project_id", projectId)
        .order("household", { ascending: true, nullsFirst: false })
        .order("full_name", { ascending: true }),
      supabase
        .from("rsvp_submissions")
        .select(
          "id, project_id, name, response, party_size, email, message, status, created_at",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("projects")
        .select("name, wedding_date")
        .eq("id", projectId)
        .maybeSingle(),
    ]);

  const rsvpSubmissions = (submissionRows ?? []) as RsvpSubmission[];

  const allGuests = (guests ?? []) as Guest[];
  const statusFilter = RSVP_STATUSES.includes(statusParam as RsvpStatus)
    ? (statusParam as RsvpStatus)
    : undefined;
  const filteredGuests = statusFilter
    ? allGuests.filter((guest) => guest.rsvp_status === statusFilter)
    : allGuests;

  const invited = sumPartySize(allGuests);
  const attending = sumPartySizeByStatus(allGuests, "attending");
  const declined = sumPartySizeByStatus(allGuests, "declined");
  const pending = sumPartySizeByStatus(allGuests, "pending");

  const projectName = project?.name ?? "Your wedding";
  const weddingDate = project?.wedding_date ?? null;
  const eyebrow =
    weddingDate != null
      ? `${projectName} · ${formatEyebrowDate(weddingDate)}`
      : projectName;

  return (
    <div className={stackClass}>
      <PageHeader
        title="Guests"
        eyebrow={eyebrow}
        description="RSVP & meals for your guest list."
      />

      <Card className="p-[30px]">
        <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Invited
            </dt>
            <dd className="mt-1.5 font-display text-[40px] font-extrabold leading-none tracking-[-0.035em] tabular-nums text-ink md:text-[52px]">
              {invited}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Attending
            </dt>
            <dd className="mt-1.5 font-display text-[40px] font-extrabold leading-none tracking-[-0.035em] tabular-nums text-sage md:text-[52px]">
              {attending}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Declined
            </dt>
            <dd className="mt-1.5 font-display text-[40px] font-extrabold leading-none tracking-[-0.035em] tabular-nums text-rosewood md:text-[52px]">
              {declined}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Pending
            </dt>
            <dd className="mt-1.5 font-display text-[40px] font-extrabold leading-none tracking-[-0.035em] tabular-nums text-muted md:text-[52px]">
              {pending}
            </dd>
          </div>
        </dl>
      </Card>

      <AddGuestForms projectId={projectId} />

      <RsvpSubmissionsPanel submissions={rsvpSubmissions} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            {statusFilter
              ? `${filteredGuests.length} guest${filteredGuests.length === 1 ? "" : "s"}`
              : `${allGuests.length} guest${allGuests.length === 1 ? "" : "s"}`}
          </p>
          <nav
            className="flex flex-wrap gap-2"
            aria-label="Filter by RSVP status"
          >
            {FILTER_OPTIONS.map((option) => {
              const active = option.value === statusFilter;
              return (
                <Link
                  key={option.label}
                  href={guestsFilterHref(projectId, option.value)}
                  className={cn(
                    "rounded-[var(--radius-pill)] px-3.5 py-2 text-[13px] font-semibold transition-colors",
                    active
                      ? "bg-accent text-surface"
                      : "bg-well text-muted hover:text-ink",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {option.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {allGuests.length === 0 ? (
          <EmptyState>
            No guests yet. Add one individually or paste a list above.
          </EmptyState>
        ) : filteredGuests.length === 0 ? (
          <EmptyState>No guests match this filter.</EmptyState>
        ) : (
          <Card className="overflow-x-auto px-6 py-4">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-hairline text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
                  <th className="pb-3 pr-4 font-semibold">Name</th>
                  <th className="pb-3 pr-4 font-semibold">Household</th>
                  <th className="pb-3 pr-4 text-right font-semibold">Party</th>
                  <th className="pb-3 pr-4 font-semibold">RSVP</th>
                  <th className="pb-3 font-semibold">Meal</th>
                </tr>
              </thead>
              <tbody>
                {filteredGuests.map((guest) => (
                  <GuestRow key={guest.id} guest={guest} rowClass={rowClass} />
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
