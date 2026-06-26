import Link from "next/link";
import { AddGuestForms } from "./AddGuestForms";
import { GuestRow } from "./GuestRow";
import {
  RSVP_STATUSES,
  sumPartySize,
  sumPartySizeByStatus,
  type Guest,
  type RsvpStatus,
} from "./types";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
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

  const { data: guests } = await supabase
    .from("guests")
    .select(
      "id, full_name, email, phone, household, party_size, rsvp_status, meal_choice, notes",
    )
    .eq("project_id", projectId)
    .order("household", { ascending: true, nullsFirst: false })
    .order("full_name", { ascending: true });

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

  return (
    <div className={stackClass}>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>Guest list</Eyebrow>
          <h1 className="mt-1 text-[20px] font-medium text-ink">RSVP & meals</h1>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-3 text-[13px] tabular-nums">
          <div>
            <dt className="text-ink-muted">Invited</dt>
            <dd className="text-[26px] font-medium leading-tight text-ink">
              {invited}
            </dd>
          </div>
          <div>
            <dt className="text-sage">Attending</dt>
            <dd className="text-[26px] font-medium leading-tight text-ink">
              {attending}
            </dd>
          </div>
          <div>
            <dt className="text-rosewood">Declined</dt>
            <dd className="text-[26px] font-medium leading-tight text-ink">
              {declined}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Pending</dt>
            <dd className="text-[26px] font-medium leading-tight text-ink">
              {pending}
            </dd>
          </div>
        </dl>
      </header>

      <AddGuestForms projectId={projectId} />

      <section>
        <div className="mb-[18px] flex flex-wrap items-baseline justify-between gap-4">
          <Eyebrow>
            {statusFilter
              ? `${filteredGuests.length} guest${filteredGuests.length === 1 ? "" : "s"}`
              : `${allGuests.length} guest${allGuests.length === 1 ? "" : "s"}`}
          </Eyebrow>
          <nav
            className="flex flex-wrap gap-1"
            aria-label="Filter by RSVP status"
          >
            {FILTER_OPTIONS.map((option) => {
              const active = option.value === statusFilter;
              return (
                <Link
                  key={option.label}
                  href={guestsFilterHref(projectId, option.value)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[13px] transition-colors",
                    active
                      ? "bg-plum-tint text-plum-deep"
                      : "text-ink-muted hover:text-ink",
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
          <p className="px-1 text-[13px] text-ink-muted">
            No guests yet. Add one individually or paste a list above.
          </p>
        ) : filteredGuests.length === 0 ? (
          <p className="px-1 text-[13px] text-ink-muted">
            No guests match this filter.
          </p>
        ) : (
          <Card className="overflow-x-auto px-5 py-3">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-stone text-[12px] font-medium tracking-[0.06em] text-ink-muted">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Household</th>
                  <th className="pb-2 pr-4 text-right font-medium">Party</th>
                  <th className="pb-2 pr-4 font-medium">RSVP</th>
                  <th className="pb-2 font-medium">Meal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone">
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
