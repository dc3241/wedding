import { Eyebrow } from "@/components/ui/eyebrow";

const GROUPS = [
  {
    label: "For planners & venues",
    items: [
      "Lead pipeline & proposals",
      "Proposals → signed contracts",
      "Invite couples to their wedding",
      "Every client in one book",
      "White-labeled client workspace",
      "Venue accounts: multiple seats, your own branding throughout",
    ],
  },
  {
    label: "The plan",
    items: [
      "Starter plan from your date & budget",
      "Checklist with smart phases",
      "Day-of run sheet, printable",
      "Notes & file storage",
    ],
  },
  {
    label: "Budget",
    items: [
      "Planned vs. actual spend",
      "Vendor quotes & allocations",
      "Package variance across vendors",
      "Spend by category",
    ],
  },
  {
    label: "Guests",
    items: [
      "Guest list & households",
      "Online RSVP collection",
      "Meals, courses & dietary notes",
      "Live attending head counts",
    ],
  },
  {
    label: "Vendors",
    items: [
      "Vendor discovery & search",
      "Email outreach from your inbox",
      "Booking pipeline, contacted → booked",
      "Venue packages, one vendor many jobs",
    ],
  },
  {
    label: "Seating",
    items: [
      "Visual seating chart",
      "Sweetheart & head tables",
      "Dance floor layout",
      "Per-table guest breakdown",
    ],
  },
  {
    label: "Your website",
    items: [
      "Designer website templates",
      "Photo gallery & wedding party",
      "Meal-aware online RSVP page",
      "Gift registry with guest claims",
    ],
  },
  {
    label: "Always on",
    items: [
      "Assistant on every tab",
      "Wedding-day countdown",
      "Shareable public wedding site",
    ],
  },
] as const;

function SageCheck() {
  return (
    <span
      className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-sage-wash text-[10px] font-bold text-sage"
      aria-hidden
    >
      ✓
    </span>
  );
}

/**
 * Static capabilities checklist — authored copy only, no data wiring.
 * Owns `id="features"` for the Features nav anchor.
 */
export function CapabilitiesPanel() {
  return (
    <section
      id="features"
      className="mx-auto max-w-6xl scroll-mt-24 px-6 py-14 md:px-10 md:py-16"
    >
      <div className="mx-auto mb-9 max-w-[52ch] text-center">
        <Eyebrow className="mb-4 block">Everything in one place</Eyebrow>
        <h2 className="text-[32px] font-extrabold tracking-[-0.03em] text-ink md:text-[42px]">
          Every part of the day, tracked.
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted md:text-[16px]">
          From the first checklist to the last dance — here&apos;s exactly what
          lives in your workspace.
        </p>
      </div>

      <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-raised sm:p-8 md:p-9">
        <div className="grid grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2.5 text-[11px] font-semibold tracking-[0.09em] text-accent uppercase">
                {group.label}
              </p>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-[13px] leading-snug font-medium text-ink"
                  >
                    <SageCheck />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-[48ch] text-center text-[13px] leading-relaxed text-muted">
        Couples get every couple-facing tool free to start — planners get the
        whole book from one login.
      </p>
    </section>
  );
}
