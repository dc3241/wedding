import { monthsBefore } from "@/lib/date-months";
import { VENDOR_CATEGORIES, vendorCategoryLabel } from "@/lib/vendor-categories";

/**
 * AGENTIC-05 — typical booking lead times by vendor category.
 *
 * These are rule-of-thumb industry guidance, NOT facts about any market or
 * vendor. Popular dates and big cities book earlier. The assistant must
 * present them as "typically" and never as a deadline a vendor set.
 * `bookByMonths` is how many months before the wedding to have the vendor
 * booked; `startMonths` is when to begin looking.
 */
export const BOOKING_WINDOWS: Record<
  string,
  { startMonths: number; bookByMonths: number }
> = {
  venue: { startMonths: 18, bookByMonths: 12 },
  planner: { startMonths: 14, bookByMonths: 10 },
  photographer: { startMonths: 14, bookByMonths: 10 },
  videographer: { startMonths: 12, bookByMonths: 9 },
  caterer: { startMonths: 12, bookByMonths: 9 },
  band: { startMonths: 12, bookByMonths: 9 },
  dj: { startMonths: 9, bookByMonths: 6 },
  florist: { startMonths: 9, bookByMonths: 6 },
  rentals: { startMonths: 8, bookByMonths: 5 },
  "hair-makeup": { startMonths: 8, bookByMonths: 4 },
  officiant: { startMonths: 8, bookByMonths: 4 },
  baker: { startMonths: 6, bookByMonths: 4 },
  jewelry: { startMonths: 6, bookByMonths: 3 },
};

export type BookingUrgency = "overdue" | "due_soon" | "on_track" | "not_yet";

export type BookingWindowRow = {
  category: string;
  label: string;
  /** booked | in_progress (tracked, not booked) | not_started | skipped */
  state: "booked" | "in_progress" | "not_started" | "skipped";
  start_looking_by: string;
  book_by: string;
  urgency: BookingUrgency;
};

/** Pure date math so the tool and tests share it. todayIso is YYYY-MM-DD. */
export function computeBookingWindows(input: {
  weddingDate: string;
  todayIso: string;
  booked: ReadonlySet<string>;
  tracked: ReadonlySet<string>;
  ignored: ReadonlySet<string>;
}): BookingWindowRow[] {
  const rows: BookingWindowRow[] = [];
  for (const category of VENDOR_CATEGORIES) {
    const window = BOOKING_WINDOWS[category.id];
    if (!window) continue;
    const bookBy = monthsBefore(input.weddingDate, window.bookByMonths);
    const startBy = monthsBefore(input.weddingDate, window.startMonths);
    const state: BookingWindowRow["state"] = input.booked.has(category.id)
      ? "booked"
      : input.ignored.has(category.id)
        ? "skipped"
        : input.tracked.has(category.id)
          ? "in_progress"
          : "not_started";

    let urgency: BookingUrgency = "on_track";
    if (state === "booked" || state === "skipped") {
      urgency = "on_track";
    } else if (input.todayIso > bookBy) {
      urgency = "overdue";
    } else if (input.todayIso >= monthsBefore(bookBy, 1)) {
      urgency = "due_soon";
    } else if (input.todayIso < startBy) {
      urgency = "not_yet";
    }

    rows.push({
      category: category.id,
      label: vendorCategoryLabel(category.id),
      state,
      start_looking_by: startBy,
      book_by: bookBy,
      urgency,
    });
  }
  const rank: Record<BookingUrgency, number> = {
    overdue: 0,
    due_soon: 1,
    on_track: 2,
    not_yet: 3,
  };
  return rows.sort(
    (a, b) =>
      (a.state === "booked" || a.state === "skipped" ? 1 : 0) -
        (b.state === "booked" || b.state === "skipped" ? 1 : 0) ||
      rank[a.urgency] - rank[b.urgency] ||
      a.book_by.localeCompare(b.book_by),
  );
}
