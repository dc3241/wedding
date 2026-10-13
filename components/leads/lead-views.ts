import {
  followupTiming,
  localISODate,
  type Lead,
  type LeadStage,
} from "./types";

export const LEAD_VIEWS = [
  { key: "open", label: "Open" },
  { key: "reply", label: "Needs reply" },
  { key: "due", label: "Due" },
  { key: "stale", label: "Stale" },
  { key: "season", label: "This season" },
] as const;

export type LeadView = (typeof LEAD_VIEWS)[number]["key"];

const OPEN_STAGES: readonly LeadStage[] = ["inquiry", "contacted", "proposal"];

export function parseLeadView(value: string | null | undefined): LeadView | null {
  return LEAD_VIEWS.some((view) => view.key === value)
    ? (value as LeadView)
    : null;
}

export function parseExpandedStages(
  value: string | null | undefined,
): LeadStage[] {
  if (!value) return [];
  const stages: LeadStage[] = [];
  for (const part of value.split(",")) {
    if ((part === "booked" || part === "lost") && !stages.includes(part)) {
      stages.push(part);
    }
  }
  return stages;
}

/** The three-month season that contains `now`. Winter spans the year boundary. */
export function seasonBounds(now: Date = new Date()): {
  start: string;
  end: string;
} {
  const year = now.getFullYear();
  const month = now.getMonth();
  let startMonth: number;
  let startYear = year;
  if (month === 11 || month <= 1) {
    startMonth = 11;
    startYear = month === 11 ? year : year - 1;
  } else if (month <= 4) {
    startMonth = 2;
  } else if (month <= 7) {
    startMonth = 5;
  } else {
    startMonth = 8;
  }
  const start = new Date(startYear, startMonth, 1);
  const end = new Date(startYear, startMonth + 3, 0);
  return { start: localISODate(start), end: localISODate(end) };
}

export function leadMatchesView(
  lead: Lead,
  view: LeadView | null,
  replyLeadIds: ReadonlySet<string>,
  now: Date = new Date(),
): boolean {
  if (!view) return true;
  if (view === "open") return OPEN_STAGES.includes(lead.stage);
  if (view === "reply") return replyLeadIds.has(lead.id);
  if (view === "due") {
    const timing = followupTiming(lead.next_followup_on, now);
    return timing === "today" || timing === "overdue";
  }
  if (view === "stale") return Boolean(lead.isStale);
  const date = lead.wedding_date;
  if (!date) return false;
  const { start, end } = seasonBounds(now);
  return date >= start && date <= end;
}

export function leadMatchesQuery(lead: Lead, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [lead.couple_name, lead.contact_email, lead.venue].some((value) =>
    (value ?? "").toLowerCase().includes(needle),
  );
}
