export type RsvpSubmissionResponse = "yes" | "no";

export type RsvpSubmissionStatus = "new" | "reviewed";

export type RsvpAttendee = {
  id: string;
  submission_id: string;
  name: string | null;
  dietary_note: string | null;
  song_request: string | null;
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

/** Compiled song row for SongRequestsCard (derived from RSVP payload). */
export type SongRequestEntry = {
  song: string;
  guestName: string;
  submittedAt: string;
};
