import { GuestExportDocument } from "./GuestExportDocument";
import {
  buildPersonLines,
  isGuestMemberType,
  type Guest,
  type GuestMember,
  type RsvpStatus,
} from "../types";
import { getAccountContext } from "@/lib/account-context";
import { tallyAttendingMeals } from "@/lib/caterer-tally";
import { sectionStackClass } from "@/lib/density";
import {
  buildGuestListRows,
  buildMailingHouseholds,
} from "@/lib/guest-exports/mailing";
import { resolvePartnerSides } from "@/lib/partner-sides";
import { createClient } from "@/utils/supabase/server";

function mealNameFromJoin(
  mealJoin: { name: string } | { name: string }[] | null | undefined,
): string | null {
  if (!mealJoin) return null;
  if (Array.isArray(mealJoin)) return mealJoin[0]?.name ?? null;
  return mealJoin.name ?? null;
}

function parseJob(raw: string | undefined): "mailing" | "people" {
  return raw === "people" ? "people" : "mailing";
}

export default async function GuestsPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ job?: string }>;
}) {
  const { projectId } = await params;
  const job = parseJob((await searchParams).job);

  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  const stackClass = sectionStackClass(account?.kind ?? "personal");

  const [{ data: guestRows }, { data: memberRows }, { data: project }] =
    await Promise.all([
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
        .from("projects")
        .select("name, wedding_date")
        .eq("id", projectId)
        .maybeSingle(),
    ]);

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
  const partnerSides = resolvePartnerSides({
    projectName: project?.name ?? null,
  });
  const mailing = buildMailingHouseholds(allGuests);
  const people = buildGuestListRows(allPeople, partnerSides);
  const tally = tallyAttendingMeals(allPeople.map((person) => person.member));

  return (
    <div className={stackClass}>
      <GuestExportDocument
        projectId={projectId}
        coupleNames={project?.name ?? "Wedding"}
        weddingDate={project?.wedding_date ?? null}
        job={job}
        mailing={mailing}
        people={people}
        tally={tally}
      />
    </div>
  );
}
