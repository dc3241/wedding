import Link from "next/link";
import { AddGuestForms } from "./AddGuestForms";
import { GuestRow } from "./GuestRow";
import { MealConfigCard } from "./MealConfigCard";
import {
  isMealServiceStyle,
  type MealOption,
  type MealServiceStyle,
} from "./meal-types";
import { RsvpAccessCard } from "./RsvpAccessCard";
import type { RsvpAccessMode } from "./rsvp-access-actions";
import { RsvpSubmissionsPanel } from "./RsvpSubmissionsPanel";
import type { RsvpSubmission } from "./rsvp-submissions";
import {
  RSVP_STATUSES,
  sumInvitedCap,
  sumRespondedHeadcount,
  type Guest,
  type GuestMember,
  type RsvpStatus,
} from "./types";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { tallyAttendingMeals } from "@/lib/caterer-tally";
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

function mealNameFromJoin(
  mealJoin: { name: string } | { name: string }[] | null | undefined,
): string | null {
  if (!mealJoin) return null;
  if (Array.isArray(mealJoin)) return mealJoin[0]?.name ?? null;
  return mealJoin.name ?? null;
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

  const [
    { data: guestRows },
    { data: memberRows },
    { data: submissionRows },
    { data: attendeeRows },
    { data: project },
    { data: mealOptionRows },
    { data: websiteRow },
  ] = await Promise.all([
    supabase
      .from("guests")
      .select(
        "id, full_name, email, phone, household, party_size, rsvp_status, rsvp_token, notes",
      )
      .eq("project_id", projectId)
      .order("household", { ascending: true, nullsFirst: false })
      .order("full_name", { ascending: true }),
    supabase
      .from("guest_members")
      .select(
        "id, project_id, guest_id, name, meal_option_id, dietary_note, attending, sort_order, created_at, meal_options(name)",
      )
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("rsvp_submissions")
      .select(
        "id, project_id, name, response, party_size, email, message, status, created_at, matched_guest_id",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("rsvp_attendees")
      .select(
        "id, submission_id, name, dietary_note, sort_order, meal_option_id, meal_options(name)",
      )
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("projects")
      .select("name, wedding_date")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("meal_options")
      .select(
        "id, project_id, name, description, is_kids, sort_order, created_at",
      )
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("wedding_websites")
      .select("meal_service_style, rsvp_access_mode, slug, published")
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  const mealOptions = (mealOptionRows ?? []) as MealOption[];
  const optionNameById = new Map(
    mealOptions.map((option) => [option.id, option.name]),
  );

  const membersByGuest = new Map<string, GuestMember[]>();
  for (const row of memberRows ?? []) {
    const member: GuestMember = {
      id: String(row.id),
      project_id: String(row.project_id),
      guest_id: String(row.guest_id),
      name: row.name ?? null,
      meal_option_id: row.meal_option_id ? String(row.meal_option_id) : null,
      meal_name: mealNameFromJoin(
        row.meal_options as { name: string } | { name: string }[] | null,
      ),
      dietary_note: row.dietary_note ?? null,
      attending: Boolean(row.attending),
      sort_order: Number(row.sort_order) || 0,
      created_at: String(row.created_at),
    };
    const list = membersByGuest.get(member.guest_id) ?? [];
    list.push(member);
    membersByGuest.set(member.guest_id, list);
  }

  const allGuests: Guest[] = (guestRows ?? []).map((row) => ({
    id: String(row.id),
    full_name: String(row.full_name),
    email: row.email ?? null,
    phone: row.phone ?? null,
    household: row.household ?? null,
    party_size: Number(row.party_size) || 1,
    rsvp_status: row.rsvp_status as RsvpStatus,
    rsvp_token: String(row.rsvp_token ?? ""),
    notes: row.notes ?? null,
    members: membersByGuest.get(String(row.id)) ?? [],
  }));

  const guestNameById = new Map(
    allGuests.map((guest) => [guest.id, guest.full_name]),
  );

  const attendeesBySubmission = new Map<
    string,
    RsvpSubmission["attendees"]
  >();

  for (const row of attendeeRows ?? []) {
    const attendee = {
      id: String(row.id),
      submission_id: String(row.submission_id),
      name: row.name ?? null,
      dietary_note: row.dietary_note ?? null,
      sort_order: Number(row.sort_order) || 0,
      meal_option_id: row.meal_option_id ? String(row.meal_option_id) : null,
      meal_name: mealNameFromJoin(
        row.meal_options as { name: string } | { name: string }[] | null,
      ),
    };
    const list = attendeesBySubmission.get(attendee.submission_id) ?? [];
    list.push(attendee);
    attendeesBySubmission.set(attendee.submission_id, list);
  }

  const rsvpSubmissions: RsvpSubmission[] = (submissionRows ?? []).map(
    (row) => {
      const matchedId = row.matched_guest_id
        ? String(row.matched_guest_id)
        : null;
      return {
        id: String(row.id),
        project_id: String(row.project_id),
        name: String(row.name),
        response: row.response as RsvpSubmission["response"],
        party_size: Number(row.party_size) || 1,
        email: row.email ?? null,
        message: row.message ?? null,
        status: row.status as RsvpSubmission["status"],
        created_at: String(row.created_at),
        matched_guest_id: matchedId,
        matched_guest_name: matchedId
          ? (guestNameById.get(matchedId) ?? null)
          : null,
        attendees: attendeesBySubmission.get(String(row.id)) ?? [],
      };
    },
  );

  const catererTally = tallyAttendingMeals(
    allGuests.flatMap((guest) => guest.members),
    optionNameById,
  );

  const hasWebsite = websiteRow != null;
  const rawStyle = websiteRow?.meal_service_style;
  const mealServiceStyle: MealServiceStyle =
    typeof rawStyle === "string" && isMealServiceStyle(rawStyle)
      ? rawStyle
      : "none";
  const mealSelectionActive = mealServiceStyle === "plated";
  const rsvpAccessMode: RsvpAccessMode =
    websiteRow?.rsvp_access_mode === "gated" ? "gated" : "open";
  const siteSlug =
    websiteRow?.published && websiteRow.slug
      ? String(websiteRow.slug)
      : null;

  const statusFilter = RSVP_STATUSES.includes(statusParam as RsvpStatus)
    ? (statusParam as RsvpStatus)
    : undefined;
  const filteredGuests = statusFilter
    ? allGuests.filter((guest) => guest.rsvp_status === statusFilter)
    : allGuests;

  const invited = sumInvitedCap(allGuests);
  const attending = sumRespondedHeadcount(allGuests, "attending");
  const declined = sumRespondedHeadcount(allGuests, "declined");
  const pending = sumRespondedHeadcount(allGuests, "pending");

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

      {catererTally.length > 0 ? (
        <Card className="px-6 py-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Catering
          </p>
          <h2 className="mt-1.5 font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            Meal tally
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Attending people on your guest list, grouped by meal.
          </p>
          <ul className="mt-4 space-y-2">
            {catererTally.map((row) => (
              <li
                key={row.meal_option_id ?? "none"}
                className="flex items-baseline justify-between gap-3 rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed"
              >
                <span className="min-w-0 truncate text-[15px] font-medium text-ink">
                  {row.label}
                </span>
                <span className="shrink-0 text-[15px] tabular-nums font-semibold text-ink">
                  {row.count}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <AddGuestForms projectId={projectId} />

      <MealConfigCard
        projectId={projectId}
        hasWebsite={hasWebsite}
        mealServiceStyle={mealServiceStyle}
        mealSelectionActive={mealSelectionActive}
        mealOptions={mealOptions}
      />

      <RsvpAccessCard
        projectId={projectId}
        hasWebsite={hasWebsite}
        rsvpAccessMode={rsvpAccessMode}
        websiteHref={`/projects/${projectId}/website`}
      />

      <RsvpSubmissionsPanel
        submissions={rsvpSubmissions}
        guests={allGuests.map((guest) => ({
          id: guest.id,
          full_name: guest.full_name,
          rsvp_status: guest.rsvp_status,
          member_count: guest.members.length,
        }))}
      />

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
                  <th className="pb-3 pr-4 text-right font-semibold">Headcount</th>
                  <th className="pb-3 pr-4 font-semibold">RSVP</th>
                  <th className="pb-3 font-semibold">People</th>
                </tr>
              </thead>
              <tbody>
                {filteredGuests.map((guest) => (
                  <GuestRow
                    key={guest.id}
                    guest={guest}
                    mealOptions={mealOptions}
                    mealSelectionActive={mealSelectionActive}
                    rowClass={rowClass}
                    siteSlug={siteSlug}
                    showRsvpQr={rsvpAccessMode === "gated"}
                  />
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
