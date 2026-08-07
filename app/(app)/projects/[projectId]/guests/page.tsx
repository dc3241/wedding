import { AddGuestForms } from "./AddGuestForms";
import { GuestPersonList } from "./GuestPersonList";
import { MealConfigCard } from "./MealConfigCard";
import {
  isMealServiceStyle,
  type MealOption,
  type MealServiceStyle,
} from "./meal-types";
import { RsvpSubmissionsPanel } from "./RsvpSubmissionsPanel";
import { SongRequestsCard } from "./SongRequestsCard";
import type { RsvpSubmission } from "./rsvp-submissions";
import {
  RSVP_STATUSES,
  countPeopleByHouseholdStatus,
  isGuestMemberType,
  type Guest,
  type GuestMember,
  type GuestPersonLine,
  type PrimaryMemberOption,
  type RsvpStatus,
} from "./types";
import { AskAssistantPrompt } from "@/components/assistant/AskAssistantPrompt";
import { ASSISTANT_PREFILLS } from "@/components/assistant/prefills";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { tallyAttendingMeals } from "@/lib/caterer-tally";
import { dataRowClass, sectionStackClass } from "@/lib/density";
import { resolvePartnerSides } from "@/lib/partner-sides";
import { createClient } from "@/utils/supabase/server";

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

function buildPersonLines(
  guests: Guest[],
  nameByMemberId: Map<string, string>,
): GuestPersonLine[] {
  const lines: GuestPersonLine[] = [];

  for (const guest of guests) {
    const members = [...guest.members].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.created_at.localeCompare(b.created_at);
    });

    members.forEach((member, index) => {
      const relatedId = member.related_to_member_id;
      lines.push({
        member,
        guestId: guest.id,
        householdFullName: guest.full_name,
        householdLabel: guest.household,
        email: guest.email,
        phone: guest.phone,
        address: guest.address,
        rsvp_status: guest.rsvp_status,
        rsvp_token: guest.rsvp_token,
        householdMemberCount: members.length,
        isFirstInHousehold: index === 0,
        relatedToPrimaryName: relatedId
          ? (nameByMemberId.get(relatedId) ?? null)
          : null,
      });
    });
  }

  return lines;
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
        "id, full_name, email, phone, address, household, party_size, rsvp_status, rsvp_token, notes",
      )
      .eq("project_id", projectId)
      .order("household", { ascending: true, nullsFirst: false })
      .order("full_name", { ascending: true }),
    supabase
      .from("guest_members")
      .select(
        "id, project_id, guest_id, name, meal_option_id, dietary_note, attending, sort_order, relationship_side, relationship, member_type, related_to_member_id, created_at, meal_options(name)",
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
        "id, submission_id, name, dietary_note, song_request, sort_order, meal_option_id, meal_options(name)",
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
      .select("meal_service_style, slug, published, song_requests_enabled")
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  const mealOptions = (mealOptionRows ?? []) as MealOption[];
  const optionNameById = new Map(
    mealOptions.map((option) => [option.id, option.name]),
  );

  const membersByGuest = new Map<string, GuestMember[]>();
  const nameByMemberId = new Map<string, string>();
  for (const row of memberRows ?? []) {
    const memberTypeRaw = row.member_type;
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
      relationship_side: row.relationship_side ?? null,
      relationship: row.relationship ?? null,
      member_type:
        typeof memberTypeRaw === "string" && isGuestMemberType(memberTypeRaw)
          ? memberTypeRaw
          : "adult",
      related_to_member_id: row.related_to_member_id
        ? String(row.related_to_member_id)
        : null,
      created_at: String(row.created_at),
    };
    if (member.name?.trim()) {
      nameByMemberId.set(member.id, member.name.trim());
    }
    const list = membersByGuest.get(member.guest_id) ?? [];
    list.push(member);
    membersByGuest.set(member.guest_id, list);
  }

  const allGuests: Guest[] = (guestRows ?? []).map((row) => ({
    id: String(row.id),
    full_name: String(row.full_name),
    email: row.email ?? null,
    phone: row.phone ?? null,
    address: row.address ?? null,
    household: row.household ?? null,
    party_size: Number(row.party_size) || 1,
    rsvp_status: row.rsvp_status as RsvpStatus,
    rsvp_token: String(row.rsvp_token ?? ""),
    notes: row.notes ?? null,
    members: membersByGuest.get(String(row.id)) ?? [],
  }));

  const allPeople = buildPersonLines(allGuests, nameByMemberId);

  const primaryOptions: PrimaryMemberOption[] = allPeople
    .filter(
      (person) =>
        person.member.member_type === "adult" &&
        person.member.related_to_member_id == null &&
        Boolean(person.member.name?.trim()),
    )
    .map((person) => ({
      id: person.member.id,
      name: person.member.name!.trim(),
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, "en-US", { sensitivity: "base" }),
    );

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
      song_request: row.song_request ?? null,
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
    allPeople.map((person) => person.member),
    optionNameById,
  );

  const rawStyle = websiteRow?.meal_service_style;
  // App-level default when unset (no website row). Stored 'none' is preserved.
  const mealServiceStyle: MealServiceStyle =
    typeof rawStyle === "string" && isMealServiceStyle(rawStyle)
      ? rawStyle
      : "buffet";
  const mealSelectionActive = mealServiceStyle === "plated";
  const songRequestsEnabled = Boolean(websiteRow?.song_requests_enabled);

  const statusFilter = RSVP_STATUSES.includes(statusParam as RsvpStatus)
    ? (statusParam as RsvpStatus)
    : undefined;
  const filteredPeople = statusFilter
    ? allPeople.filter((person) => person.rsvp_status === statusFilter)
    : allPeople;

  // Person-grain summary: total people; status counts by household badge on each line.
  const peopleCount = allPeople.length;
  const attending = countPeopleByHouseholdStatus(allPeople, "attending");
  const declined = countPeopleByHouseholdStatus(allPeople, "declined");
  const pending = countPeopleByHouseholdStatus(allPeople, "pending");

  const projectName = project?.name ?? "Your wedding";
  const weddingDate = project?.wedding_date ?? null;
  const eyebrow =
    weddingDate != null
      ? `${projectName} · ${formatEyebrowDate(weddingDate)}`
      : projectName;
  // wedding_profile has no partner-name columns today; derive from project.name.
  const partnerSides = resolvePartnerSides({
    projectName: project?.name ?? null,
  });

  return (
    <div className={stackClass}>
      <PageHeader
        title="Guests"
        eyebrow={eyebrow}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>RSVP & meals for your guest list.</span>
            <ButtonLink
              href="#guest-list"
              variant="default"
              className="px-3.5 py-1.5 text-[13px]"
            >
              See list
            </ButtonLink>
          </span>
        }
      />

      <Card className="p-[30px]">
        <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              People
            </dt>
            <dd className="mt-1.5 font-display text-[40px] font-extrabold leading-none tracking-[-0.035em] tabular-nums text-ink md:text-[52px]">
              {peopleCount}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Attending
            </dt>
            <dd className="mt-1.5 font-display text-[32px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-sage md:text-[42px]">
              {attending}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Declined
            </dt>
            <dd className="mt-1.5 font-display text-[32px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-rosewood md:text-[42px]">
              {declined}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Pending
            </dt>
            <dd className="mt-1.5 font-display text-[32px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-muted md:text-[42px]">
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

      <AddGuestForms
        projectId={projectId}
        partnerSides={partnerSides}
        primaryOptions={primaryOptions}
      />

      <MealConfigCard
        projectId={projectId}
        mealServiceStyle={mealServiceStyle}
        mealSelectionActive={mealSelectionActive}
        mealOptions={mealOptions}
      />

      <SongRequestsCard
        projectId={projectId}
        songRequestsEnabled={songRequestsEnabled}
      />

      <GuestPersonList
        projectId={projectId}
        people={filteredPeople}
        totalPeopleCount={allPeople.length}
        statusFilter={statusFilter}
        mealOptions={mealOptions}
        mealSelectionActive={mealSelectionActive}
        rowClass={rowClass}
        partnerSides={partnerSides}
        emptyAction={
          <AskAssistantPrompt
            prefill={ASSISTANT_PREFILLS.guests}
            title="Get help organizing your list"
            description="Households, RSVP tracking, and what details to capture."
            cta="Organize guests"
          />
        }
      />

      <RsvpSubmissionsPanel submissions={rsvpSubmissions} />
    </div>
  );
}
