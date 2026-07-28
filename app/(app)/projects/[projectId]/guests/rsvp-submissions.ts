export type RsvpSubmissionResponse = "yes" | "no";

export type RsvpSubmissionStatus = "new" | "reviewed";

export type RsvpAttendee = {
  id: string;
  submission_id: string;
  name: string | null;
  dietary_note: string | null;
  sort_order: number;
  meal_option_id: string | null;
  meal_name: string | null;
};

export type RsvpSubmission = {
  id: string;
  project_id: string;
  name: string;
  response: RsvpSubmissionResponse;
  party_size: number;
  email: string | null;
  message: string | null;
  status: RsvpSubmissionStatus;
  created_at: string;
  matched_guest_id: string | null;
  matched_guest_name: string | null;
  attendees: RsvpAttendee[];
};

/** Best-guess guest id by fuzzy name similarity. Couple must confirm — never auto-match. */
export function hintGuestMatch(
  submissionName: string,
  guests: Array<{ id: string; full_name: string }>,
): string | null {
  const needle = submissionName.trim().toLowerCase();
  if (!needle || guests.length === 0) return null;

  let best: { id: string; score: number } | null = null;

  for (const guest of guests) {
    const hay = guest.full_name.trim().toLowerCase();
    if (!hay) continue;

    let score = 0;
    if (hay === needle) score = 100;
    else if (hay.startsWith(needle) || needle.startsWith(hay)) score = 80;
    else if (hay.includes(needle) || needle.includes(hay)) score = 60;
    else {
      const needleTokens = new Set(needle.split(/\s+/).filter(Boolean));
      const hayTokens = hay.split(/\s+/).filter(Boolean);
      const overlap = hayTokens.filter((token) => needleTokens.has(token)).length;
      if (overlap > 0) score = 40 + overlap * 10;
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { id: guest.id, score };
    }
  }

  return best && best.score >= 40 ? best.id : null;
}
