export type RsvpSubmissionResponse = "yes" | "no";

export type RsvpSubmissionStatus = "new" | "reviewed";

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
};
