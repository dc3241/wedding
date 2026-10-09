export type ContentTopic = {
  key: string;
  label: string;
  brief: string;
};

export type TopicDeckId = "couples_tip" | "couples_promo" | "couples_list" | "venue_tip" | "venue_promo";

/**
 * Shared cursors walk these in order. Couple tips change per lane so one day does not
 * repeat the same angle on slideshow and pin. Promos are pain-then-feature angles.
 * LinkedIn draws from venue_promo only: the business system, then the couple
 * working inside that wedding. venue_tip stays so older ideas still resolve a label.
 * couples_list is the slideshow list shape: a cover plus five pieces of advice,
 * one light mention of First Look, and a real screen on any advice slide.
 */
export const TOPIC_DECKS: Record<TopicDeckId, ContentTopic[]> = {
  couples_tip: [
    { key: "budget-forgotten", label: "Budget · forgotten costs", brief: "Costs couples forget until the invoice arrives." },
    { key: "budget-deposits", label: "Budget · deposit calendar", brief: "A reminder buffer before each deposit due date, because a few days late can cancel the contract. Everyday words. Do not name a product. Do not tell them to build a calendar." },
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
    { key: "timeline-photos", label: "Photo timeline", brief: "The photo block on the day-of timeline, with enough time left to eat. Not a separate shot-list tool." },
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
  couples_list: [
    { key: "list-before-invites", label: "Before invitations", brief: "List. Cover plus 5. Real advice on every item. A real screen on any advice slide. Mention First Look once, only on the guest-list item, as a light aside, never as the cover. Items: close the guest list (screen: guests; mention: the list can live in First Look), decide plus-ones and kids (screen: guests), put the hotel cutoff where guests will see it (screen: website), choose the meal options (screen: guests), start a seating draft before place cards (screen: seating)." },
    { key: "list-caterer-deposit", label: "Before the caterer deposit", brief: "List. Cover plus 5. Real advice. A real screen on any advice slide. Mention First Look once, on the deposit item, as a light aside. Items: book the tasting before you sign (screen: calendar), know the headcount range (screen: guests), know what happens if the count drops, put a due date on the deposit (screen: budget-item; mention: that due date can sit on the payment in First Look), decide kids' meals (screen: guests)." },
    { key: "list-rsvp-week", label: "The week RSVPs are due", brief: "List. Cover plus 5. Real advice. A real screen on the advice slides. Mention First Look once, on the pending-RSVP item. Items: the deadline is a date you already told people (screen: website), who is still pending (screen: guests; mention: First Look already has the pending count), the meal tally is not the headcount (screen: guests), kids and plus-ones still outstanding (screen: guests), the number you will send the venue (screen: guests)." },
    { key: "list-dates-slip", label: "Dates that slip", brief: "List. Cover plus 5. Real advice. Mention First Look once, on the payment item. Items: the tasting (screen: calendar), the fitting (screen: calendar), the room-block cutoff (screen: website), the day the headcount locks (screen: guests), the final payment due date (screen: budget-item; mention: First Look keeps that due date on the payment)." },
    { key: "list-family-handoff", label: "What you hand your family", brief: "List. Cover plus 5, for the week before. Real advice. Mention First Look once, on the timeline item. Items: a ceremony order a relative can follow (screen: timeline), who tells guests where to be (screen: timeline; mention: that run of show can live in First Look), where vendors sit and eat (screen: seating), the photo block with time left to eat (screen: timeline), the weather call." },
    { key: "list-after-venue", label: "Once the venue is booked", brief: "List. Cover plus 5 things you need next. Real advice. Mention First Look once, inside the shared-list item, not as its own pitch slide. Items: a guest count that is still a range (screen: guests), the vendors that book out next (screen: vendors), a budget with the venue payment dated (screen: budget-item), what is still open on a checklist (screen: checklist), one list both of you can open (screen: overview; mention: that shared list is what First Look is for)." },
    { key: "list-first-month", label: "The first month", brief: "List. Cover plus 5 for the first month engaged. Real advice. Mention First Look once, on the shared-list item. Items: pick a season, say a budget number out loud (screen: budget), treat the guest count as a range (screen: guests), name the three vendors that book first (screen: vendors), put it on one list you both see (screen: checklist; mention: First Look is that list)." },
    { key: "list-venue-tour", label: "Before the venue tour", brief: "List. Cover plus 5 before the first tour. Real advice. Mention First Look once, on the budget item. Items: a ceiling you will not cross (screen: budget; mention: First Look holds that number), two or three dates you can hold (screen: calendar), a rough guest count (screen: guests), ask about the rain plan, know what you would cut if the room is over (screen: budget-categories)." },
    { key: "list-before-sign", label: "Before you sign", brief: "List. Cover plus 5 lines to read in a vendor contract. Real advice. Mention First Look once, on the deposit item. Items: cancellation, overtime, whether they get a meal (screen: timeline), the date the deposit is due (screen: budget-item; mention: First Look puts that date on the payment), what booked includes versus a quote (screen: vendors)." },
    { key: "list-send-website", label: "Before you send the site", brief: "List. Cover plus 5 things that have to be on the website before you text the link. Real advice. Screen website on each item. Mention First Look once, on the RSVP item. Items: date and address, where people stay, the schedule, how to RSVP (mention: the RSVP can live on the First Look site), who they should ask instead of texting you." },
    { key: "list-payment-deadlines", label: "Payments that are deadlines", brief: "List. Cover plus 5 payments that are due dates, not just amounts. A few days late can cancel the booking. Screen budget-item on each. Mention First Look once, on the first item. Items: venue retainer (mention: First Look keeps the due date on the payment), photographer deposit, catering final, attire, rentals." },
  ],
  /** Older LinkedIn tips. New days do not draw from this deck. */
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
    { key: "leads-inbox", label: "Leads · inbox pile", brief: "Pain: inquiries sitting in an inbox. The venue or planner shares an inquiry form and every submission lands on a board — new, contacted, proposal, booked — instead of another email thread." },
    { key: "leads-followup", label: "Leads · dropped follow-up", brief: "Pain: a tour never gets a follow-up because the team is on-site. Automations send that note when they trigger it, so a Saturday event does not quietly drop Tuesday's inquiry." },
    { key: "dashboard-book", label: "Dashboard · every wedding", brief: "Pain: weddings scattered across tools, details mixed between clients. Every wedding is its own project in one book, and the planner or venue switches without losing their place." },
    { key: "white-label", label: "White label", brief: "Pain: a couple logs into a generic portal and asks whose software this is. Invited couples see the venue or planner's name, logo, and colors." },
    { key: "proposals", label: "Proposals", brief: "Pain: every proposal starts from a blank document, rebuilt from memory after the tour. Packages live in the app, so it goes out while the visit is fresh, and an accepted proposal becomes the contract." },
    { key: "invoices", label: "Invoices", brief: "Pain: the balance reminder is buried in an email thread the couple stopped checking. The invoice sits in the wedding they are already working in." },
    { key: "calendar-holds", label: "Calendar · date holds", brief: "Pain: a date hold lives in someone's head. The calendar records the hold and when it expires, across every wedding in the book." },
    { key: "automations", label: "Automations", brief: "Pain: the same follow-up gets copied for every inquiry. Automations send that message at the right time, so the team is not pasting it again." },
    { key: "invite-couple", label: "Invite the couple", brief: "Pain: after they book, the couple goes off to plan in other tools and the venue loses the thread. Invite them into the wedding that already exists, under the venue or planner's name, and they work there. The post is to the venue or planner." },
    { key: "one-book", label: "One book · their workspace", brief: "Pain: the contract is in one place and the checklist, budget, guests, and day-of timeline are in others. Once the couple is invited, those live in the same project as the proposal and the invoice. The post is to the venue or planner. The image can be the couple's checklist or overview." },
    { key: "couple-rsvps", label: "Headcount · their RSVPs", brief: "Pain: headcount arrives in texts the planner does not control. The couple collects RSVPs and meal choices in the wedding, and that count is the one the venue is planning from. The post is to the venue or planner. The image is the guest list." },
    { key: "couple-seating", label: "Seating · their chart", brief: "Pain: the seating chart is a file the couple emails back and forth. They build it in the wedding, and the planner or venue can still see it. The post is to the venue or planner. The image is the seating chart." },
    { key: "couple-website", label: "Website · guests stop asking", brief: "Pain: guests text the venue the same questions about hotels, timing, and the schedule. The couple's wedding website, inside the book, holds the story, travel, and RSVP. The post is to the venue or planner. The image is the website." },
    { key: "preferred-vendors", label: "Vendors · your roster", brief: "Pain: the preferred vendor list lives in a PDF, or couples book people the venue has never worked with. They book from the venue or planner's vendor library, and those bookings stay in the wedding. The post is to the venue or planner. The image is the vendor library." },
  ],
};

const TOPIC_BY_KEY = new Map<string, ContentTopic>(
  Object.values(TOPIC_DECKS).flatMap((deck) => deck.map((topic) => [topic.key, topic] as const)),
);

export function topicByKey(key: string | null | undefined): ContentTopic | null {
  if (!key) return null;
  return TOPIC_BY_KEY.get(key) ?? null;
}

export function isCoupleListTopic(key: string | null | undefined): boolean {
  if (!key) return false;
  return TOPIC_DECKS.couples_list.some((topic) => topic.key === key);
}
