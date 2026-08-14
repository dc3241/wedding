/**
 * Strict local-date past-due predicate for checklist tasks.
 * Rule: status !== "done" AND due_date is set AND due_date < today (local midnight).
 * Single source for Overview attention, assistant getChecklist, wedding-card
 * rollups, planner urgent tasks, and calendar task overlays.
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
