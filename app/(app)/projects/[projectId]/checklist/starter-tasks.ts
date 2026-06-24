export type StarterTask = {
  title: string;
  phase: string;
  monthsBefore?: number;
  daysBefore?: number;
};

export const STARTER_TASKS: StarterTask[] = [
  { title: "Set budget & guest list", phase: "12+ months", monthsBefore: 12 },
  { title: "Book venue", phase: "12+ months", monthsBefore: 12 },
  { title: "Book photographer", phase: "9 months", monthsBefore: 10 },
  { title: "Book catering", phase: "9 months", monthsBefore: 9 },
  { title: "Shop for attire", phase: "6 months", monthsBefore: 8 },
  { title: "Hire florist", phase: "6 months", monthsBefore: 6 },
  { title: "Book DJ or band", phase: "6 months", monthsBefore: 6 },
  { title: "Send save-the-dates", phase: "6 months", monthsBefore: 5 },
  { title: "Order invitations", phase: "3 months", monthsBefore: 4 },
  { title: "Book hair & makeup", phase: "3 months", monthsBefore: 3 },
  { title: "Menu tasting & finalize catering", phase: "3 months", monthsBefore: 3 },
  { title: "Confirm final headcount", phase: "1 month", monthsBefore: 1 },
  { title: "Final walkthrough with venue", phase: "1 month", daysBefore: 14 },
  { title: "Pack for honeymoon", phase: "week of", daysBefore: 7 },
  { title: "Rehearsal dinner", phase: "week of", daysBefore: 1 },
];

export function dueDateFromWedding(
  weddingDate: string,
  task: StarterTask
): string | null {
  const d = new Date(weddingDate + "T00:00:00");

  if (task.daysBefore !== undefined) {
    d.setDate(d.getDate() - task.daysBefore);
  } else if (task.monthsBefore !== undefined) {
    d.setMonth(d.getMonth() - task.monthsBefore);
  } else {
    return null;
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
