/**
 * Strict local-date past-due predicate shared by dashboard card rollups.
 * Rule: status !== "done" AND due_date is set AND due_date < today (local midnight).
 * Matches buildOverviewData attention + assistant getChecklist overdue checks.
 */
export function isTaskPastDue(
  dueDate: string | null | undefined,
  status: string,
  now: Date = new Date(),
): boolean {
  if (!dueDate || status === "done") return false;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  return due < today;
}
