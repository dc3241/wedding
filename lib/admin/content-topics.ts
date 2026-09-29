export type ContentTopic = {
  key: string;
  label: string;
  brief: string;
};

export type TopicDeckId = "couples_tip" | "couples_promo" | "venue_tip" | "venue_promo";

/**
 * Shared cursors walk these in order. Tips change per lane so one day does not
 * repeat the same angle on video, slideshow, and pin. Promos are pain-then-feature
 * angles; the deck is long enough that a feature is not the whole week.
 */
export const TOPIC_DECKS: Record<TopicDeckId, ContentTopic[]> = {
  couples_tip: [
    { key: "budget-forgotten", label: "Budget · forgotten costs", brief: "Costs couples forget until the invoice arrives." },
    { key: "budget-deposits", label: "Budget · deposit calendar", brief: "When deposits are due and how to keep the calendar honest." },
    { key: "budget-cuts", label: "Budget · where to cut", brief: "Where to spend less without the day looking cheap." },
    { key: "checklist-first", label: "Checklist · what to lock first", brief: "What to book before anything else." },
    { key: "checklist-months", label: "Checklist · month markers", brief: "What actually matters at 12, 9, 6, 3, and 1 month out." },
    { key: "guests-plus-ones", label: "Guest list · plus-ones and kids", brief: "Plus-ones, kids, and the B-list." },
    { key: "rsvp-chase", label: "RSVPs · deadlines", brief: "Deadlines, chasing, and meal counts." },
    { key: "vendors-questions", label: "Vendors · questions to ask", brief: "Questions to ask before you book a vendor." },
    { key: "vendors-red-flags", label: "Vendors · contract red flags", brief: "Red flags in a vendor contract." },
    { key: "seating-family", label: "Seating · family politics", brief: "Family politics, the kids' table, and who cannot sit together." },
    { key: "seating-vendors", label: "Seating · vendor seats", brief: "Where vendors, the band, and kids actually sit." },
    { key: "dayof-buffer", label: "Day-of · buffer time", brief: "Buffer time and the photo gap that always runs long." },
    { key: "dayof-cues", label: "Day-of · who tells guests", brief: "Who tells guests where to be, and when." },
    { key: "website-guests", label: "Website · what guests open", brief: "The few things guests actually open the site for." },
    { key: "party-roles", label: "Wedding party · who does what", brief: "Who does what, and who pays." },
    { key: "out-of-town", label: "Out-of-town guests", brief: "Hotels, timing, and what to tell people flying in." },
    { key: "week-before", label: "Week before", brief: "The week-before list that is not another Pinterest roundup." },
    { key: "morning-of", label: "Morning of", brief: "Morning-of logistics: who is where, and what is already done." },
    { key: "weather-backup", label: "Weather backup", brief: "The backup plan, told before anyone needs it." },
    { key: "headcount", label: "Headcount", brief: "How headcount drifts and what it changes (meals, rentals, seating)." },
    { key: "timeline-photos", label: "Photo timeline", brief: "Building a photo timeline that still leaves time to eat." },
    { key: "vendor-meals", label: "Vendor meals", brief: "Vendor meals, breaks, and the people couples forget to feed." },
    { key: "ceremony-order", label: "Ceremony order", brief: "A simple ceremony order couples can hand to family." },
    { key: "payment-labels", label: "What each payment is", brief: "Naming what a payment is for so deposits do not blur together." },
  ],
  couples_promo: [
    { key: "vendor-search-tabs", label: "Vendor search · too many tabs", brief: "Pain: twenty tabs and no shortlist. Feature: vendor search." },
    { key: "vendor-search-compare", label: "Vendor search · comparing quotes", brief: "Pain: quotes living in email. Feature: vendor search." },
    { key: "assistant-month", label: "Assistant · what to do this month", brief: "Pain: not knowing the next real step. Feature: the assistant." },
    { key: "assistant-freeze", label: "Assistant · decision freeze", brief: "Pain: frozen on a decision. Feature: the assistant." },
    { key: "checklist-blogs", label: "Checklist · undated blogs", brief: "Pain: a blog list with no dates. Feature: the checklist." },
    { key: "checklist-window", label: "Checklist · missed window", brief: "Pain: booking something too late. Feature: the checklist." },
    { key: "budget-spreadsheet", label: "Budget · spreadsheet drift", brief: "Pain: a spreadsheet that drifted. Feature: the budget." },
    { key: "budget-deposit", label: "Budget · forgotten deposit", brief: "Pain: a deposit nobody wrote down. Feature: the budget item and its due date." },
    { key: "guests-headcount", label: "Guest list · headcount surprise", brief: "Pain: the headcount surprise. Feature: the guest list." },
    { key: "rsvp-texts", label: "RSVPs · chasing by text", brief: "Pain: chasing RSVPs in a group text. Feature: guest RSVPs." },
    { key: "seating-paper", label: "Seating · paper chart", brief: "Pain: moving people on a paper chart. Feature: the seating builder." },
    { key: "seating-politics", label: "Seating · reshuffling family", brief: "Pain: reshuffling family by hand. Feature: the seating builder." },
    { key: "timeline-cues", label: "Day-of timeline · cues", brief: "Pain: nobody holding the run of show. Feature: the day-of timeline." },
    { key: "timeline-photo-gap", label: "Day-of timeline · photo gap", brief: "Pain: photos eating the cocktail hour. Feature: the day-of timeline." },
    { key: "website-texts", label: "Website · guests texting", brief: "Pain: guests texting the same questions. Feature: the wedding website." },
    { key: "notes-email", label: "Notes · contract in email", brief: "Pain: the contract buried in email. Feature: notes and files." },
    { key: "overview-apps", label: "Overview · five apps", brief: "Pain: five apps for one wedding. Feature: the overview." },
  ],
  venue_tip: [
    { key: "inquiry-speed", label: "Inquiry speed", brief: "How fast a venue should answer a new inquiry, and what 'fast' means." },
    { key: "lead-followup", label: "Lead follow-up", brief: "A follow-up rhythm that is not a guilt trip." },
    { key: "double-book", label: "Double bookings", brief: "The holds and date checks that prevent a double booking." },
    { key: "tour-notes", label: "Tour notes", brief: "What to write down on a tour so the proposal is not from memory." },
    { key: "proposal-timing", label: "Proposal timing", brief: "When to send the proposal relative to the tour." },
    { key: "date-holds", label: "Date holds", brief: "How long a date hold should last." },
    { key: "couple-handoff", label: "Couple handoff", brief: "What the couple still has to plan after they book the venue." },
    { key: "peak-season", label: "Peak season capacity", brief: "How venues talk about peak dates without sounding closed." },
  ],
  venue_promo: [
    { key: "leads-inbox", label: "Leads · inbox pile", brief: "Pain: inquiries sitting in an inbox. Feature: leads." },
    { key: "leads-followup", label: "Leads · dropped follow-up", brief: "Pain: a tour that never got a follow-up. Feature: leads and automations." },
    { key: "dashboard-book", label: "Dashboard · every wedding", brief: "Pain: weddings scattered across tools. Feature: the planner dashboard." },
    { key: "white-label", label: "White label", brief: "Pain: couples seeing a generic portal. Feature: white-label branding." },
    { key: "proposals", label: "Proposals", brief: "Pain: proposals rebuilt in a doc each time. Feature: proposals." },
    { key: "invoices", label: "Invoices", brief: "Pain: chasing a balance in email. Feature: invoices." },
    { key: "calendar-holds", label: "Calendar · date holds", brief: "Pain: a date held in someone's head. Feature: the calendar." },
    { key: "automations", label: "Automations", brief: "Pain: copying the same follow-up. Feature: automations." },
  ],
};

const TOPIC_BY_KEY = new Map<string, ContentTopic>(
  Object.values(TOPIC_DECKS).flatMap((deck) => deck.map((topic) => [topic.key, topic] as const)),
);

export function topicByKey(key: string | null | undefined): ContentTopic | null {
  if (!key) return null;
  return TOPIC_BY_KEY.get(key) ?? null;
}
