# Wedding Planning SaaS — Project Bible (v41)

Canonical **current-state** document for this repo. Self-contained — every fact a new chat
needs is in **this** document. Drop this into Project instructions/knowledge so any new chat
picks up cold. Lives in-repo at `PROJECT_BIBLE_v41.md`. The repo's `.cursor/design.mdc`,
`app/globals.css`, and `supabase/migrations/` remain the live source of truth; this
summarizes them and the decisions behind them.

**Current through migration 0099** (on disk). **Next-free migration is 0100.** **v41 ships
schema 0097–0099** (task assignment, template clone without dollar amounts, and budget-driven
To Book ignore list) plus NO-SCHEMA product work: Google sign-in, admin inbound mail relay,
Vendors Search/Outreach/Booked tabs, calendar event detail, invite email delivery, library
vendor/contract manage, branded AGENT-01 digests. Fresh-install SQL bundles live under
`supabase/deploy-batches/` (batch1–4) — convenience only; hand-paste of numbered migrations
remains canonical for incremental applies. Deploy-batches do **not** yet include 0080–0099 —
incremental paste of those twenty is required after a batch install.

**Git (migrations):** **0070–0083 are committed** (0070–0078 in `3d50a3d` / `97c234a` /
`4d5bbcd` / `9a0e267`; **0079** in `b2bf8fc`; **0080–0083** in `ca4131f`). ENT-01a /
CHECKOUT-RECONCILE-01 / TRIAL-GUARD-01 / VENUE-04/05 landed in `2d195c4` on `staging`. v38
product work (MKT-01…03, VENUE-06/07, WHITE-02, ONBOARD-NUDGE-01) is on disk. **0084–0096
are on disk** (AUTO-01/02, AGENT-00/01a/03, AUTO-03a/b, ACCT-GRANT-01, DEMO-ANON-01,
WHITE-03, WORKFLOW-00/03/05). **0097–0099 are on disk** (TASK-ASSIGN-01, TMPL-02, VND-13b)
in commits `b453dd8` / `ce46099` / `9e50770`. Confirm remaining git commits + live pastes.
Lead-edit modal, inquiry embed snippet, workflow builder UI, template gallery, Google OAuth
login, Vendors three-tab workspace, and invite emails are on disk (NO SCHEMA except where
noted).

**Dev-ops note:** `STRIPE_SECRET_KEY` was briefly live-mode in local `.env.local` during
testing, producing one real live venue subscription — confirmed cancelled directly in the
Stripe Dashboard by Dom. Rotate the key in the Stripe Dashboard if it was ever exposed outside
this machine. Confirm `.env.local` holds a `sk_test_...` value before any further Checkout
testing.

### Live product facts (current truth — do not revive superseded paths)

- **Couple billing:** local 7-day free trial (PRICE-07 — no Stripe objects, no card) then
  **Monthly $10** Subscription or **Lifetime $99** one-time Checkout (PRICE-08). The older
  **$7 week + day-7 $92** path is **dead**. Schema 0076–0078
  (`stripe_payment_method_id`, `claim_couple_trial_charges`, `set_couple_trial_cancellation`)
  and Edge Function `charge-trial-balance` are **retained residual** — do not wire a new $7
  Checkout or schedule that function as the couple path.
- **Planner billing:** local 7-day trial (PRICE-01) then Monthly **$59** / Annual **$590**
  Checkout (PRICE-02). Customer Portal (PRICE-06) is for **any** account with a real Stripe
  Customer (planner Subscription **or** couple monthly) — not planner-only. Lifetime / local
  trial / seeded active have no Subscription id, so no Portal.
- **Venue billing:** Monthly **$149** / Annual **$1,499** at `/account/venue-upgrade`
  (VENUE-02). Webhook (and CHECKOUT-RECONCILE-01 on return) flips `accounts.plan`. Public
  `/pricing` venue toggle is **cosmetic** — does not start Checkout. **VENUE-08:** a paid
  venue plan already on the account sees a cadence pricing card on Billing instead of the
  Upgrade CTA.
- **Welcome screen:** three equal-weight options — couple / planner / venue (VENUE-06). Venue
  is still `accounts.kind = 'business'` plus a request-only `venueIntent` flag; there is **no**
  `kind='venue'`. `accounts.plan` stays `'planner'` until a paid venue subscription.
- **Auth:** email/password **and** **Continue with Google** (AUTH-GOOGLE-01) on login and
  signup (`signInWithOAuth` → `/auth/callback`). Distinct from Gmail OAuth (`gmail.send`) used
  for outreach.
- **Team seats exist** (TEAM-01) for business accounts — flat, no roles. Parallel to project
  invitations (0028): two tables, two cookies, two accept paths. Do not collapse them.
  **INV-06 / TEAM-EMAIL-01:** both invite paths send best-effort Resend email after the DB
  write; one-time link copy remains the fallback when send fails. Gmail OAuth is **not** used
  for invitations.
- **White-label:** CoupleShell for invited project viewers (WHITE-01). PlannerShell own-shell
  only when `plan = 'venue' AND white_label_enabled` (VENUE-01). Ordinary planner chrome stays
  First Look. Accent picker + contrast guard is WHITE-02 (still one free-text hex).
- **Lock screen** lives in `app/(locked)/account/locked` (ENT-01a). Path `/account/locked`.
  **`(app)/layout` must not branch on pathname.**
- **`isTaskPastDue`** (`lib/task-overdue.ts`) is the **single source** for task overdue
  (OVERDUE-01). Budget/schedule `due_on < today` is a different predicate.
- **Checklist tasks can be assigned** (`tasks.assigned_to` — TASK-ASSIGN-01 / 0097) to any
  account member or project member (`list_project_assignees`). Template + demo clones **never**
  copy assignees.
- **New Booking template clone** (TMPL-01 / 0079 + **TMPL-02 / 0098**): structure only —
  checklist title/phase/position, budget **category + label with `planned_amount = 0`**,
  vendor_targets category. Never copy dates, status, actuals, vendor links, assignees, or
  dollar estimates.
- **Vendors workspace is three tabs** (VND-13): Search / Outreach / Booked (`?tab=`).
  **Still to book** (on Outreach) is **budget-mapped** categories not yet booked and not in
  `ignored_vendor_categories` (0099) — **not** `vendor_targets` status. Vocabularies stay
  separate; `mapBudgetCategoryToVendorCategory` is read-time only.
- **`getAccountContext` includes `plan`** (VENUE-07) and **must filter `account_members` by
  `user_id`** (TEAM-01 fellow-member SELECT).
- **A `subscriptions` row with `status = null` is Checkout-initiation debris, not a
  subscription** (TRIAL-GUARD-01). Guards check `status IS NOT NULL`, not row existence.
- **Deferred destructive drops are 0100+:** MEAL-03a (`guests.meal_choice` +
  `guests.party_size`), `budget_items.due_date`, `rsvp_access_mode`, optional
  `wedding_profile.traditions`, DASH-03a `projects.description`, optional PRICE-03/04/05
  residual drop. **0092–0099 are taken.**
- **Rule-based automation is live on disk:** AUTO-01 payment-schedule watch (0084) and AUTO-02
  booked-vendor countdown confirmations (0085). Date math in, Resend template email out, **no LLM**.
  Distinct from agentic runs — different cron routes, different cost/failure profile.
- **Agentic automation is live on disk:** AGENT-00 plumbing (0086), AGENT-01 weekly synthesis
  (**EMAIL-BRAND-01** branded HTML digest + JSON `{summary, highlights}`), AGENT-01a
  unattended-write impersonation (0087), AGENT-02 daily implication notes, AGENT-03
  vendor-outreach drafts (0088). Same assistant tool loop; cron entry point. Third-party
  sends stay **propose-then-approve**. Architecture companion: `AGENTIC_AUTOMATION_v1.md`.
- **Inquiry capture → extract → draft → approve is live on disk (AUTO-03 complete):** public
  form `/inquire/[slug]` + Resend inbound webhook (0089) write `leads`; 10-minute cron extracts
  facts + composes a reply draft (0090; CON-04-style JSON, not the project tool loop); human
  approves from the Leads kanban. `accounts.inquiry_slug` is lazy-generated. **INQUIRY-EMBED-01**
  added a copyable iframe snippet and dropped inbound-DNS copy from the intake card. **WHITE-03**
  brands the public form when white-label is on (`get_inquiry_branding`). **CONTACT-ROUTE-01:**
  the same inbound webhook relays mail to `ADMIN_INBOUND_ADDRESS` onward to
  `CONTACT_NOTIFY_EMAIL` (still not an anon surface).
- **Authenticated members have table-level UPDATE on `accounts` (0091).** 0070 added the
  "members update own account" RLS policy but never GRANTed UPDATE, so branding / inquiry-slug
  writes failed with "permission denied for table accounts" **before RLS ran**.
- **CRM workflow engine is live on disk (WORKFLOW-00…05):** account-scoped trigger → delayed
  steps at `/automations`. Event + delay dispatch, **not** a fixed cron scan and **not** the
  assistant tool loop. `send_email` inserts a pending `workflow_email` draft — human Approve
  is the only send. Templates flip on with one click (`template_key`).
- **Homepage demos never leak a live brand (DEMO-ANON-01).** Business demo clones are named
  **Lumen Planning**; inquiry slugs are `demo-studio` (never slugified from the template name).
- **There are exactly NINE anon surfaces** (three reads + one INSERT + five RPC executes) —
  see §4. AUTO-02 added `confirm_project_vendor`; AUTO-03a added `submit_inquiry`; WHITE-03
  added `get_inquiry_branding`. The Resend inbound webhook (inquiry + admin relay) is **not**
  an anon surface. Google OAuth is not an anon surface.

| Slice (v38 — all NO SCHEMA) | What | Schema |
|---|---|---|
| **MKT-01** | Homepage repositioned **planner/venue-first** (B2B). Hero + shared nav; in-app couple product unchanged. Hero preview tabs: Leads / Vendors / Contracts. | **NONE** |
| **MKT-02** | Dedicated `/for-planners` landing. Shared marketing chrome. Nav "For planners" points here. | **NONE** |
| **MKT-03** | Dedicated `/for-venues` landing. Nav "For venues" points here. Cross-links to `/for-planners`. | **NONE** |
| **VENUE-06** | Venue is a **first-class equal-weight** welcome option (not a tertiary link). Lock screen (business-kind) "I run a venue" CTA. Billing: side-by-side "Upgrade to Venue" card. Same `bootstrapAccountWithVenueIntent` / no `kind='venue'`. | **NONE** |
| **WHITE-02** | Brand accent: 8 preset swatches (`lib/brand-preset-colors.ts`) + native color picker + hex field; client-side WCAG contrast-vs-white warning (4.5:1) — **does not block save**. Still one free-text hex. | **NONE** |
| **VENUE-07** | Display-only PlannerShell vocabulary (`lib/venue-copy.ts` / `getCopy(key, plan)`). Venue: Leads→Inquiries, New wedding→New booking, Weddings→Bookings. Routes/stages/tables unchanged. | **NONE** |
| **ONBOARD-NUDGE-01** | One-time setup card on `/account/venue-upgrade` when `plan='venue'`. Reuses `user_tours` + `dismissTour` with keys `venue_branding_nudge` / `venue_team_nudge` — **not page tours**. | **NONE** |

| Slice (v39) | What | Schema |
|---|---|---|
| **AUTO-01** | Payment Schedule Watch. Daily Vercel Cron → uncovered installments (waterfall) → digest email to account members. One-shot kinds structurally unique; overdue nags every 5 days (read-time). | **0084** |
| **AUTO-02** | Booked-vendor countdown confirmations (T-30 / T-7 / T-2). Email with standing confirm link. Public `/vendor-confirm/[token]`. Arrival + scope on the booked card. | **0085** |
| **AGENT-00** | Agentic plumbing: `agent_run_log` (service-role only) + `agent_drafts` (account-member SELECT; pending-per-target unique). No loop invocation yet. | **0086** |
| **AGENT-01** | Weekly synthesis. Read-only tool loop per active project; one digest email per account (send-layer batching). Autonomous send-to-self. | **NONE** (uses 0086) |
| **AGENT-01a** | Unattended write: mint a short-lived user JWT (`SUPABASE_JWT_SECRET`); `acted_as_user_id` on the run log; unscheduled smoke route. | **0087** |
| **AGENT-02** | Daily implication scan. At most one `add_note` (`needs_action`) per project, or silence. Impersonated RLS write. Never email, never drafts. | **NONE** (uses 0086/0087) |
| **AGENT-03** | Weekly vendor-outreach gap drafting (12-week window). `create_agent_draft` queues Pending-panel rows; human Approve sends via Gmail. Never sends from cron. | **0088** |
| **AUTO-03a** | Inquiry capture. `accounts.inquiry_slug`; public `/inquire/[slug]` + `submit_inquiry` RPC; Resend inbound webhook; Leads intake card. No LLM. | **0089** |
| **AUTO-03b** | Inquiry extract → compose → approve. 10-minute cron; CON-04 JSON (not the project loop); `leads.estimated_guest_count`; `outreach_messages.lead_id`; clay kanban badge + reply drawer. | **0090** |
| **ACCT-GRANT-01** | Table GRANT `UPDATE` on `accounts` to `authenticated`. Closes 0070's RLS-without-GRANT hole. | **0091** |
| **LEAD-EDIT-01** | Shared `Modal` primitive + lead Edit modal (name/contact/date/venue/source/budget/notes). Delete stays on the card. | **NONE** |

| Slice (v40) | What | Schema |
|---|---|---|
| **INQUIRY-EMBED-01** | Intake card: copyable iframe snippet (`https://www.usefirstlook.app/inquire/{slug}`); inbound-DNS / Resend copy removed from the planner UI. Webhook capture path still exists, unadvertised. | **NONE** |
| **DEMO-ANON-01** | Business demo clones named **Lumen Planning**; leaked inquiry slugs cleared; trigger so `clone_demo_account` cannot copy a live brand. App-side `ensureInquirySlug` always uses `demo-studio` for `is_demo`. | **0092** |
| **WHITE-03** | Public inquiry branding. Anon RPC `get_inquiry_branding(slug)` returns `account_found` + brand fields only when white-label is on. Invalid slug is now a pre-submit UI. "Powered by First Look" on white-labeled embeds. | **0093** |
| **WORKFLOW-00** | CRM automation schema: `automation_workflows` / `automation_steps` / `automation_runs` / `automation_run_log`. Event + delay model. No dispatcher yet. | **0094** |
| **WORKFLOW-01** | Event dispatch on lead stage change (and `createLead` → `lead_created`). Impersonated step executor: `add_note`, `change_lead_stage`, `create_task`. Automation failure never fails the lead mutation. | **NONE** (uses 0094) |
| **WORKFLOW-02** | Delay halt (`next_due_at`) + daily Vercel Cron `/api/cron/automation-dispatch` (15:25 UTC) to resume due runs. Cap 20 per invocation. | **NONE** (uses 0094) |
| **WORKFLOW-03** | `send_email` action + `agent_drafts.kind = workflow_email`. Dispatcher never sends; human Approve via existing Gmail path. Tokens `{{couple_name}}` / `{{account_name}}` / `{{wedding_date}}`. | **0095** |
| **WORKFLOW-04** | Builder UI at `/automations`. Create / edit / reorder (up/down, not @dnd-kit) / enable / disable / delete. Trigger UI is `lead_stage_changed` + optional `to_stage`. | **NONE** |
| **WORKFLOW-05** | One-click templates (`booking_confirmation`, `proposal_followup_note`, `lost_lead_note`). Nullable `template_key`; at most one row per `(account, template)`. | **0096** |
| **AUTH-GOOGLE-01** | Continue with Google on login + signup (`signInWithOAuth` → `/auth/callback`). | **NONE** |
| **CONTACT-ROUTE-01** | Same Resend inbound webhook: mail to `ADMIN_INBOUND_ADDRESS` → forward to `CONTACT_NOTIFY_EMAIL`. | **NONE** |

| Slice (v41) | What | Schema |
|---|---|---|
| **TASK-ASSIGN-01** | Checklist `tasks.assigned_to` + `list_project_assignees` RPC; board filter by assignee; clones null assignees. | **0097** |
| **TMPL-02** | `clone_project_template` copies budget category/label only — `planned_amount` always `0`. | **0098** |
| **VND-13** | Vendors Search / Outreach / Booked tabs (`?tab=`). | **NONE** |
| **VND-13b** | Budget-driven Still to book + `ignored_vendor_categories`. | **0099** |
| **VND-LIB-01** | Library detail: delete unused account vendor; unlink from a booking. | **NONE** |
| **CON-ARCHIVE-01** | Contracts archive: delete file + Edit-in-project jump. | **NONE** |
| **VND-16** | Booked card "Copy confirm link" via shared `vendorConfirmUrl`. | **NONE** |
| **VENUE-08** | Paid venue Billing shows cadence card (not Upgrade CTA). | **NONE** |
| **CAL-05** | Calendar event detail modal + wedding-hue retune (≥50° spread). | **NONE** |
| **CAL-06** | Invited-collaborator Calendar tab (same CAL-04 role exception). | **NONE** |
| **INV-06 / TEAM-EMAIL-01** | Best-effort Resend on project + Team invites; link copy fallback. | **NONE** |
| **EMAIL-BRAND-01** | AGENT-01 digest: JSON synthesis + branded HTML shell (own-brand when venue white-label). | **NONE** |
| **VND-OUTREACH-MOBILE-01** | Outreach actions + filters stay on one mobile line. | **NONE** |

Full per-slice narratives for the entire product (foundation through v41) are in **§7 of this
file**. Migration index **0001–0099** is in **§5 of this file**.

> **Numbering note:** **0070–0099 are taken.** Next-free is **0100.** Do not `db push`. **`viewer`
> invite remains deferred by product choice** (WRITE-01 write gates are done). **CON-03** (real PDF
> bytes) remains **DEFERRED by choice**. **Marketing copy policy:** do not promote or lead with
> "AI"; frame as the app / "automatically" / "the assistant." CON-04's UI label "Generate with the
> assistant" is the sanctioned framing for that surface. **Do not promote the $7+$92 couple trial**
> — that product path is gone. **Do not auto-send anything that reaches a third party** (AGENT-03
> / AUTO-03 / WORKFLOW-03 stay propose-then-approve).

**Verification status (READ THIS):**
- **0031–0059** on disk; **0059 applied live + visually verified.**
- **0060–0069** — ON DISK. **0068–0069 claimed LIVE VERIFIED** (Dom) — re-confirm if unsure.
- **0070–0083** — ON DISK **and committed in git**. Confirm remaining hand-pastes + Edge Function
  deploys + schedules. **0071 LIVE VERIFIED** (`pg_policies`).
- **0084–0099** — ON DISK. Confirm hand-pastes + Vercel Cron env (`CRON_SECRET`, Resend,
  `SUPABASE_JWT_SECRET`, `INQUIRY_INBOUND_DOMAIN`, `RESEND_INBOUND_WEBHOOK_SECRET`,
  `ADMIN_INBOUND_ADDRESS`, `CONTACT_NOTIFY_EMAIL`) + Google OAuth provider in Supabase Auth +
  schedules in `vercel.json`. **0091 GRANT is the live gate for member writes to `accounts`.**
  **WORKFLOW-01** was claimed live-verified in production (a real `lead_stage_changed` run
  executed two zero-delay steps) — re-confirm 0094–0099 pastes independently.
- Shipped in code (residual pastes + Edge Function ops + Cron env are the human gate): WHITE-01/02/03,
  WRITE-01, CAL-04/05, ONB-06, ENT-01/01a, PRICE-01/02/06/07/08, TMPL-01/02, AGR-01, HYG-01/01a,
  WEB-REVAL, DEMO-04/04b, DEMO-ANON-01, RSVP-THROTTLE, TEAM-01, VENUE-01…08, GMAIL-THREAD, VND-12/13,
  LEAD-STALE, OVERDUE-01, CHECKOUT-RECONCILE-01, TRIAL-GUARD-01, MKT-01/02/03,
  ONBOARD-NUDGE-01, AUTO-01/02, AGENT-00/01/01a/02/03, AUTO-03a/03b, ACCT-GRANT-01,
  LEAD-EDIT-01, INQUIRY-EMBED-01, WORKFLOW-00…05, AUTH-GOOGLE-01, CONTACT-ROUTE-01,
  TASK-ASSIGN-01, VND-LIB-01, CON-ARCHIVE-01, VND-16, INV-06, TEAM-EMAIL-01, EMAIL-BRAND-01,
  VND-OUTREACH-MOBILE-01.
  **PRICE-03/04/05 product path is superseded** (schema residual).
- **Still open (human gate):** confirm remaining **0060–0070 / 0072–0099** pastes (+ demo seeds);
  deploy/schedule `purge-demo` (do **not** treat `charge-trial-balance` as the live couple path);
  confirm Vercel Cron actually fires in the deployed environment; broad Soft stack visual checkpoint
  including Team, venue upgrade + own-shell branding + venue copy, vendor cards + three-tab Vendors,
  Still to book / ignore, task assignees, stale-lead pills, lock-screen route group, couple local
  trial → Monthly/Lifetime, View in Gmail, three-option welcome, venue-upgrade trial + setup nudge,
  `/for-planners` + `/for-venues`, accent picker, inquiry form + embed snippet + branded embed +
  intake card + reply drawer, vendor-confirm page, Pending drafts, lead Edit modal,
  `/automations` templates + builder, Google login, invite email delivery, calendar detail modal.
  See §10 / §15.

**Companion docs:** a separate **Launch Prep Runbook** exists (ops checklist for going to production).
A separate **Agentic Automation Architecture (v1)** lives at `AGENTIC_AUTOMATION_v1.md` (AGENT-01/02/03
+ AUTO-03 — trigger-based invocations of the existing assistant loop). Distinct from AUTO-01/02
(rule-based cron, no LLM) **and** from WORKFLOW-00…05 (account-scoped CRM event + delay engine;
no LLM). This bible covers product/architecture **current state** including what has shipped; the
runbook covers deployment; the automation architecture covers *how* scheduled/event-triggered
assistant invocation should work (autonomy tiers, reuse discipline, deferred v2). Keep all three.
Do not restate the architecture companion in this file — do record shipped tables, routes,
and product behavior here. The CRM workflow engine is documented **in this bible** (it is not
the assistant loop).

## 1. What this is

An AI-native wedding-planning SaaS competing with Zola, The Knot, and Aisle Planner, serving BOTH
couples and wedding planners on one platform. (This "AI-native" phrasing is an **internal** descriptor;
user-facing marketing/product copy never leads with "AI" — see the copy policy.)

**Core architecture — "unified foundation, two experiences":** one app, one auth, one data model.
A couple is a `personal` account owning exactly ONE project (their wedding); a planner is a
`business` account owning MANY projects (one per client). Not two products — two experiences over
one foundation, differentiated by routing and role-gated tabs. (The "two separate products" approach
was explicitly rejected.)

**There is a THIRD class of user: the invited project member** (originally couple-only; **v26 /
INV-07 also issues `collaborator`**). A planner invites by email; the invitee gets a `project_members`
row on ONE project and **no account of their own** — no `accounts` row, no `account_members` row. They
see that project and nothing else in the planner's book — no CRM tabs. This is the Aisle Planner model
and it is what `can_access_project`'s "OR direct project member" branch was designed for in 0001.
**Distinct from TEAM-01 account seats** (`account_invitations` — fellow planners on a business
account, same `account_members` row the owner has). Two invitation grains; do not collapse them.
See §4.

The welcome screen offers **three equal-weight options** — couple / planner / venue (VENUE-06).
Couple maps to `kind='personal'`; planner and venue both map to `kind='business'`. Venue submits
via `bootstrapAccountWithVenueIntent` (`venueIntent: true` is request-only, never persisted) and
lands on `/account/venue-upgrade` instead of `/dashboard`. **No `kind='venue'`**, no distinct
venue dashboard. Venue accounts render through the identical PlannerShell as any planner account;
display copy swaps via `getCopy` (VENUE-07). `accounts.plan='venue'` only unlocks own-shell
white-label + the venue price tier (VENUE-01), set solely by a confirmed paid subscription.

The app spans: the couple planning product (**6-step onboarding → AI plan with plan-scope /
formality / priority / already-booked signals**, checklist, vendors, **guests as a flat
one-line-per-person list over a preserved household tier — per-person relationship + partner-side,
plus-one/child association (GST-12), per-person meal members, gated-only RSVP that auto-populates the
household badge, event-level song requests, household mailing address**, budget with a per-item
Estimate/Actual/Difference/Paid model + payment ledger + dated payment schedule + filterable cards
(**paid/actual category bars**), **notes with an optional action lifecycle (needs-action pin / done) +
files**, day-of timeline, gift registry with public share + guest claims, **in-app AI assistant with
in-page prompts on Overview and empty tabs**, **guided page tours (TOUR-01)**, **a seating builder at
the per-member grain with at most one sweetheart table**, **a project Calendar tab (personal owners +
invited couples via CAL-04 + invited collaborators via CAL-06) with wedding/kind hue polish**, **a couple Agreements tab for
signed/vendor contract files**), a planner CRM (contracts, lead pipeline **with derived stale-lead
pills (LEAD-STALE-01) + inquiry intake (form link / inbound email) + clay reply-ready drafts
(AUTO-03) + Edit modal (LEAD-EDIT-01)**, proposals → accepted agreement → printable contract,
project access + couple/collaborator invitations, **account-level Team seats (TEAM-01)**, archive
finished weddings, **dashboard wedding cards**, **New wedding optional structure clone (TMPL-01)**,
an account-level Vendor library **with card-grid list (VND-12) + detail/portfolio + Instagram +
private media**, **white-label branding for invited CoupleShell viewers (WHITE-01) + venue own-shell
branding (VENUE-01) + accent picker/contrast guard (WHITE-02) + public inquiry-embed branding
(WHITE-03)**, an authorable Calendar, **outreach
"View in Gmail" thread links**, a cross-project Contracts archive with reusable contract templates
**+ assistant-drafted templates (CON-04)**, **rule-based payment reminders (AUTO-01) and booked-vendor
countdown confirmations (AUTO-02)**, **agentic weekly synthesis / implication notes / vendor-outreach
drafts (AGENT-01/02/03)**, **account-scoped CRM workflows with one-click templates (WORKFLOW-00…05)**,
Stripe billing (**couple local 7-day trial → Monthly $10 / Lifetime $99;
planner local trial → Monthly/Annual; venue Monthly/Annual; entitlement lock screen**), marketing `/`
**(planner/venue-first, MKT-01)** + `/for-planners` **(MKT-02)** + `/for-venues` **(MKT-03)** +
`/pricing` **with live demo CTAs (DEMO-02/03 + DEMO-04 purge/throttle + DEMO-ANON-01 fictional
studio name)** (Checkout stays post-login),
and a **public, shareable wedding website** with a 5-template photo-led gallery, **an editor that
reorders and collapses sections with a sticky live preview, image border-shape and timeline-layout
options**, **adaptive meal- and song-aware gated RSVP intake** (household lookup → per-attendee meal
+ optional song; **no self-report headcount, email optional**; **real household velocity throttle**),
a registry sub-page (under Website / public `/w/[slug]/registry` — **not** a project workspace tab),
a **public inquiry form** (`/inquire/[slug]`) **with embed snippet + optional white-label**, and a
**public vendor-confirm page** (`/vendor-confirm/[token]`).

---

## 2. Stack

- Next.js (App Router, TypeScript, React Server Components)
- Supabase (Postgres **17.6**, Auth, Row Level Security, Storage)
- Tailwind CSS (v4 `@theme inline` — Soft stack tokens mapped in `app/globals.css`)
- Anthropic Claude — model centralized in `lib/anthropic-model.ts` as `ANTHROPIC_MODEL`
  (`claude-sonnet-4-6`, env-overridable). Plan generation, outreach drafts, vendor enrichment,
  the assistant.
- Google Places API (New) — vendor discovery
- Supabase Auth Google provider — **Continue with Google** on login/signup
  (AUTH-GOOGLE-01). Distinct from Gmail send OAuth below.
- Gmail OAuth (scope `gmail.send`) — sending outreach from the couple's own mailbox.
  **NOT used for invitations** (invites go via Resend — INV-06 / TEAM-EMAIL-01).
- Stripe — billing for couples, planners, and venues (test mode). **Couple:** local 7-day free
  trial (no Stripe objects) then Monthly $10 Subscription **or** Lifetime $99 one-time Checkout
  (`charge_stage=couple_lifetime`). **Planner:** local 7-day free trial then Monthly $59 /
  Annual $590 Subscription Checkout + Customer Portal. **Venue:** Monthly $149 / Annual $1,499
  Subscription Checkout (`/account/venue-upgrade`); webhook flips `accounts.plan`. PRICE-03/04/05
  $7+$92 path is **superseded** (schema + `charge-trial-balance` residual). **Checkout-return
  reconciliation (CHECKOUT-RECONCILE-01):** venue/planner/couple Checkout success URLs carry
  `session_id={CHECKOUT_SESSION_ID}`; both return pages (`/account/billing` for couple + planner,
  `/account/venue-upgrade` for venue) synchronously retrieve the session and call
  `applyCheckoutSession` — the same write path the webhook uses for `checkout.session.completed` —
  if the `subscriptions` row hasn't been updated yet (e.g. webhook delayed, missed local
  forwarder, or a mode mismatch between the Checkout session and whatever's listening for events).
  The webhook remains the sole primary/source-of-truth writer for every non-return event
  (renewals, cancellations, failures); this is a narrow fallback for the return-page window only,
  and is idempotent against the webhook eventually also arriving. Mechanics verified against disk
  during this bible write-up (`lib/billing/sync-subscription.ts`); re-read that file before
  extending.
- **Resend** — transactional email from `First Look <hello@usefirstlook.app>` via `lib/email/send.ts`
  (AUTO-01 payment digest, AUTO-02 vendor countdown, AGENT-01 weekly synthesis branded digests,
  **INV-06 / TEAM-EMAIL-01** project + Team invite delivery via `sendEmailBestEffort`). **Gmail OAuth
  remains the send path for vendor outreach and inquiry replies** (the human's mailbox, not Resend).
  **Resend Inbound** (`email.received` webhook at `/api/webhooks/resend-inbound`) is AUTO-03a
  inquiry capture **and** CONTACT-ROUTE-01 admin relay — signature-verified
  (`RESEND_INBOUND_WEBHOOK_SECRET`), not an anon surface. Env: `RESEND_API_KEY`,
  `INQUIRY_INBOUND_DOMAIN`, `ADMIN_INBOUND_ADDRESS`, `CONTACT_NOTIFY_EMAIL`.
- **Vercel Cron** (`vercel.json`) — seven scheduled routes, all gated by `Authorization: Bearer
  ${CRON_SECRET}` (`lib/cron/authorize.ts`). Cadences (UTC): payment-schedule-watch `0 15 * * *`;
  countdown-confirmations `5 15 * * *`; agent-review (AGENT-01) `10 15 * * 1`;
  agent-implication-scan (AGENT-02) `15 15 * * *`; agent-outreach-scan (AGENT-03) `20 15 * * 1`;
  agent-inquiry-scan (AUTO-03b) `*/10 * * * *`; automation-dispatch (WORKFLOW-02) `25 15 * * *`.
  Agent routes `maxDuration = 300`; automation-dispatch `maxDuration = 60`. The AGENT-01a
  smoke route (`/api/cron/agent-write-smoke`) is **not scheduled**. Do **not** fold agentic runs
  into the AUTO-01/02 dispatcher — different cost and failure profile (LLM vs. plain SQL). Do
  **not** fold CRM workflows into either — they are event + delay, not a scan.
- **Unattended writes** mint a short-lived HS256 user JWT with `SUPABASE_JWT_SECRET` (Project
  Settings → API) and talk to PostgREST as that member (`lib/assistant/unattended-write-session.ts`).
  Never use the service-role key as the request JWT for agent writes. Actor is the earliest
  `account_members` row (reproducibility only — authorization is the same for every current
  member). TTL 30s, one write, then dead.
- Supabase Edge Functions (manual deploy) — `purge-demo` (live ops); `charge-trial-balance`
  (service-role bearer; **residual PRICE-04 — do not schedule as the couple path**); pg_cron
  not enabled
- pgcrypto (`extensions` schema) — `digest()` for invitation token hashing;
  `gen_random_bytes` for guest `rsvp_token` defaults
- **@dnd-kit (`core`, `sortable`, `utilities`) — lead pipeline kanban ONLY.** Seating uses its own
  SVG pointer drag plus click-to-place / click-empty-to-move / arrow nudge — **not** @dnd-kit (see §7).
  **Website section reorder uses up/down buttons — also not @dnd-kit** (WEB-EDITOR-02; respects the
  §15 "no @dnd-kit in the website editor" constraint).
- **No PDF-generation dependency (deliberate).** Every "printable" surface — CRM contract, run-sheet,
  contract-template fill (CON-02) — is HTML + `@media print` + `window.print()`. Adding a PDF lib is a
  deferred decision (CON-03); see §7 / §13.
- **Fonts (four families via `next/font/google` in root `app/layout.tsx`):**
  - **Figtree** (400/500/600/800) → `--font-sans` — Tier 1 app chrome + Tier 2 emotional surfaces
  - **Hanken Grotesk** (400/500) → `--ws-font-sans` — Tier 3 website **body** only (`.font-ws-sans`)
  - **Cormorant Garamond** (500/600) → `--font-serif` — Tier 3 + run-sheet print header only
    (`.font-serif-display`)
  - **Great Vibes** → `--font-script` — Romance website template only
- Built in Cursor (Agent mode), Windows dev env, repo at `E:\wedding\wedding-app`

> **Name the Supabase target.** For SQL, use `supabase db query --db-url <connection-string>` so the
> destination is in the command. Never `--linked` — that silently uses whatever project the CLI is
> currently pointed at (today: production First Look `szqlbsmvsnxzlitjeewc`, not staging).
> `db query --project-ref` does **not** retarget; combined with `--linked` it still hits the linked
> project even if the refs disagree. **NEVER run `supabase db push`.** Migrations here are
> hand-pasted; there is no `schema_migrations` tracker, so `db push` sees an empty history and tries
> to apply all files from 0001. Reads yes, push never. See §5.

---

## 3. Architecture principles (always-on rules)

In `.cursor/main.mdc` (architecture) + `.cursor/design.mdc` (Soft stack design). Non-negotiable:

- Multi-tenant. NEVER fork the data model or UI by audience — same model, different counts. (UI
  differentiation is by **routing + role-gated tabs** only — the sanctioned mechanism. `plannerOnly`
  and `coupleOnly` both resolve from **account kind** (`business` / `personal`), never from
  `project_members.role`. Invited members pass `kind = null` and see neither planner-only nor
  couple-only tabs — see §6.)
- **Authorization lives in the DATABASE via RLS, never in app code.** Trust RLS; mutate by
  `id`/`project_id`/`account_id`; no manual "and the user owns this" filters.
- Server components read (scoped); mutations are `'use server'` actions that write by id + call
  `revalidatePath`.
- Read existing migrations before writing queries; never invent columns; a new column = a new
  migration. TypeScript strict; `'use client'` only for interactivity; no localStorage/sessionStorage.

**Patterns (treat as rules):**

- **Project-scoped vs account-scoped is the spine.** Most features scope to a project via
  `can_access_project(project_id)`. **Pre-project CRM entities (leads, proposals), billing
  (subscriptions), Team seats (`account_invitations`), agent drafts (`agent_drafts`), inquiry
  capture (`accounts.inquiry_slug`), CRM workflows (`automation_workflows` / `automation_steps`
  / `automation_runs`), and the account workspaces (contract templates, the vendor
  library, branding, `/automations`) are ACCOUNT-scoped** via `is_account_member(account_id)`.
  **`calendar_events` is account-scoped at
  root but DUAL-GATED since CAL-02 (0060)** — `is_account_member(account_id)` OR a project-linked row
  the caller can edit (`project_id is not null AND can_edit_project(project_id)` after WRITE-01 /
  0071; SELECT-equivalent access still via `can_access_project` elsewhere); see §4. (RSVP submissions,
  seating, invitations, the budget ledger `budget_payments`, the `payment_schedule`,
  **guests / guest_members / rsvp_attendees** are project-scoped.)
  **Service-role-only tables** (no authenticated/anon policies): `demo_start_attempts` (0073),
  `payment_reminder_log` (0084), `agent_run_log` (0086), `inquiry_form_attempts` (0089),
  `automation_run_log` (0094). Cron and
  Edge Functions write these; the user-facing client never does.
- **`vendors` is ACCOUNT-scoped; `project_vendors` is the project-scoped LINK.** One vendor row can
  serve many projects in the same account. Project-workspace "remove" means **remove the link**,
  never the vendor. The account Vendor library (VND-08 / VND-11 / **VND-LIB-01**) is the one surface
  that adds a `vendors` row with NO `project_vendors` link, and the one place a `vendors` row may be
  deleted — and only when it has zero links (else unlink from the booking first). **Still to book
  (VND-13)** is budget-category driven + `ignored_vendor_categories`, not `vendor_targets` status.
- **Resolve the BUSINESS account explicitly** (`accounts.kind = 'business'` inner join), never naive
  first-membership. Couples resolve the `personal` account. Helpers in `lib/billing/resolve-account.ts`
  (`resolveBusinessAccountId`). **After TEAM-01, always scope `account_members` reads by
  `user_id = auth.uid()`** — fellow-member SELECT otherwise returns other members' rows
  (`getAccountContext`, billing resolvers).
- **CHECK-constrain status enums.** EXCEPTION: Stripe-owned vocabularies aren't constrained.
  Constrained: `project_vendors.status` (0030/0031), `calendar_events.event_kind` (0045),
  `guests.rsvp_status` (`pending|attending|declined`), **`guest_members.relationship_side`
  (`partner_1|partner_2`, 0056)**, **`guest_members.member_type` (`adult|child`, 0063)**,
  **`notes.action_status` (`needs_action|done` or null, 0062)**, **`wedding_profile.formality`
  (`casual|semi-formal|formal|black-tie` or null, 0068)**, **`user_tours.status`
  (`completed|skipped`, 0066)**, **`accounts.plan` (`planner|venue`, 0083)** + business-only
  when `venue`. **`payment_reminder_log.reminder_kind` (`due_7|due_2|overdue_first|overdue_recurring`,
  0084).** **`project_vendors.last_reminder_kind` (`due_30|due_7|due_2`, 0085).**
  **`agent_run_log.trigger_kind` (`synthesis|implication_scan|outreach_scan|inquiry|smoke`, 0086/0087)
  + `outcome` (`ok|capped|error`).**   **`agent_drafts.kind` (`vendor_outreach|inquiry_reply|workflow_email`) +
  `status` (`pending|approved|rejected|sent`, 0086/0095).** **`accounts.inquiry_slug` format +
  business-only (0089).** **`leads.estimated_guest_count` 1–20000 or null (0090).**
  **`automation_workflows.trigger_kind` (`lead_stage_changed|lead_created|project_created`,
  0094).** **`automation_steps.action_kind` (`create_task|change_lead_stage|add_note|send_email`,
  0094/0095) + `delay_days >= 0`.** **`automation_runs.target_kind` (`lead|project`) + `status`
  (`pending|running|completed|failed|cancelled`).** **`automation_run_log.outcome`
  (`ok|error|skipped`).** **`automation_workflows.template_key` is free-text / writer-guarded
  (0096 — same posture as `user_tours.tour_key`; no DB CHECK; keys live in
  `lib/automations/templates.ts`).**
  **ONB-02 / 0067 closed the four vendor/file/template category
  CHECKs** (`vendor_targets.category`, `vendors.category`, `files.category`,
  `contract_templates.category` — null or one of the 13 canonical ids). `budget_items.category` and
  `guest_members.relationship` stay free-text by design. `leads.source` stays free-text (AUTO-03
  reuses `'form'` / `'email_inbound'` — no CHECK that would break existing CRM labels).
- **Billing source of truth = the webhook-updated `subscriptions` row.**
- **A `subscriptions` row's mere existence is not evidence of a real subscription — only a non-null
  `status` is.** A row with `stripe_customer_id` set and `status = null` is Checkout-initiation
  debris (written once, by the customer-resolution step `getOrCreateStripeCustomer`, before
  Checkout redirect), not a subscription. Any guard reasoning about "does this account already have
  a subscription" must check `status IS NOT NULL`, not row existence (TRIAL-GUARD-01). Reuse this
  exact definition everywhere the question recurs — don't let a second guard reinvent it.
- **Checkout-return reconciliation must call the identical write path the webhook calls** —
  `applyCheckoutSession`, never a second implementation of status-mapping logic. Same posture as
  the existing exhaustive-billing-status rule; two divergent writers of the same `subscriptions`
  row are how these silently disagree later (CHECKOUT-RECONCILE-01). Narrow fallback for the
  return-page window only; webhook remains primary for every non-return event.
- **Self-contained snapshot for public surfaces.** Public-rendered content stores its displayed data
  on its own row — never joins live into private tables. **Website section order + per-section layout /
  image-shape options live in the site's own `content` jsonb** (WEB-EDITOR-02 / WEB-STYLE-01), not in
  a separate table.
- **Service-role key is server-only and rare.** Stripe webhook + billing/admin path + Edge Function
  service paths (`purge-demo`; residual `charge-trial-balance`) + cron dispatchers (AUTO-01/02
  reads/log writes; AGENT-*/AUTO-03b orchestration) + Resend inbound capture insert. Local trials
  (`startPlannerTrial` / `startCoupleTrial`) insert via service-role. **Unattended agent writes
  do NOT use service-role as the request JWT** — they impersonate a real member (AGENT-01a).
  Never in RSC/actions with the user/anon client.
- **An RLS policy without a matching table GRANT is a silent failure that looks like RLS.** 0070
  added `"members update own account"`; authenticated had no `UPDATE` privilege on `accounts`, so
  PostgREST returned "permission denied for table accounts" before RLS ran. 0091 GRANTs it.
  When a member write against a table "should work" and the error is permission-denied-for-table
  (not a policy violation), check `information_schema.role_table_grants` before rewriting RLS.
- **Anon READ = one published-only RLS policy + the anon key.** New columns on an anon-readable row
  (e.g. `wedding_websites.song_requests_enabled`, 0057) are auto-readable **riders** — NOT new anon
  surfaces, no policy change.
- **Anon WRITE = tightly-scoped INSERT-only RLS (or a definer RPC) + server-derived scope.** Public
  writes are RSVP (`submit_rsvp` RPC), registry claims (INSERT), vendor confirm
  (`confirm_project_vendor`), and inquiry capture (`submit_inquiry`). **There are exactly NINE anon
  surfaces** (three reads + one INSERT + five RPC executes) — see §4. **No new anon table
  surfaces have been added since the nine listed in §4** (RSVP-02 form-only; RSVP-THROTTLE-01 replaces `submit_rsvp` in place; `vendor-media`
  private; `brand-media` is a **public storage carve-out** like `website-media`, not a counted table
  surface; `get_project_branding` is authenticated-only; `account_invitations` is authenticated
  account-member only; `agent_drafts` is authenticated account-member only; `automation_workflows`
  / `automation_steps` / `automation_runs` are authenticated account-member only;
  `payment_reminder_log` /
  `agent_run_log` / `inquiry_form_attempts` / `automation_run_log` have zero user-facing policies). **The Resend inbound
  webhook is signature-verified service-role, not an anon surface.** **Demo uses Supabase anonymous
  auth + authenticated RPC** — not a new anon RLS surface.
- **Discrete writes over client-authoritative state.** Every mutation writes by id +
  `revalidatePath`. `useOptimistic` is the sanctioned in-pattern fallback.
- **Keep public/reusable UI pure via prop injection.** `components/website/` imports NO Supabase/auth/
  server-only modules. **The partner-side derive (`lib/partner-sides.ts`) is read at the call site and
  passed as props — never imported into `components/website/`. The sticky editor preview (WEB-EDITOR-02)
  renders `components/website/` with injected props only — no server imports leak in.**
- **Structural enforcement beats action enforcement when it's cheap.** Exemplars: BUD-02's composite
  FK; ONB-00's `already_bootstrapped` guard; 0028's partial unique index; 0029's
  `projects_account_id_immutable` trigger; 0030's `(project_id, vendor_id)` unique index; 0031/0045's
  composite FKs; 0051/0052's `budget_payments`/`payment_schedule` composite FKs; `guest_members
  (project_id, guest_id) → guests` ON DELETE CASCADE (0006); **0059's `(project_id, guest_member_id)`
  unique on `seating_assignments`**; **0064's one-sweetheart-per-project partial unique index**;
  **0067's category CHECKs + `commit_wedding_plan` already-committed guard**; **0069's row-level
  already-booked filter inside `commit_wedding_plan`**; **0084's partial unique index on
  one-shot payment reminder kinds**; **0085's unique `confirm_token`**;   **0086's partial unique
  index "one pending `agent_drafts` row per `(account_id, kind, target_id)`"**; **0089's unique
  `inquiry_slug`**; **0090's XOR check on `outreach_messages` (`project_vendor_id` XOR `lead_id`)**;
  **0094's unique `(workflow_id, position)` on `automation_steps`**; **0096's partial unique
  "one `automation_workflows` row per `(account_id, template_key)` where `template_key` is not
  null"**.
  **Seating occupancy stays action-enforced** (writers check seat_count vs seated count) — 0059 did
  not add a structural occupancy constraint. **AUTO-01 overdue_recurring is deliberately NOT
  structurally unique** — the 5-day gate is read-time in the cron route.
- **Row-level filtering vs. all-or-nothing gating are different enforcement shapes — name which one
  a slice needs, don't default to the simpler one.** `include_vendors` (ONB-02) is a boolean gate:
  the whole `vendor_targets` insert either happens or doesn't. `already_booked_vendor_category_ids`
  (ONB-05) is a per-row filter within an insert that's otherwise proceeding. Confirm in Step 0 which
  shape a suppression requirement actually needs before assuming the existing gate pattern extends.
- **Structural enforcement can only act on a SHARED KEY. Say so out loud when it can't.**
  Exemplar: checklist already-booked suppression (ONB-05) has **no possible** structural backstop —
  `tasks` has no vendor-category column. Prompt-directive only; do not invent title-string heuristics.
- **A dedicated action owns an integrity obligation.** Don't extend a generic `update<Thing>(id,
  fields)` writer with a field that carries a constraint the generic writer doesn't understand.
  Exemplars: `setSeatingTableKind`, `setBudgetItemProjectVendor`, `removeProjectVendor`,
  `set_project_archived`, `addBudgetPayment`/`removeBudgetPayment`, `addScheduleInstallment`/
  `removeScheduleInstallment`, `addBudgetItemsBulk`. The guest writers validate their own canonical
  values — `addGuest` / `updateGuestMember` reject a `relationship` outside `lib/guest-relationships.ts`
  and a `relationship_side` outside the CHECK; **`addGuest` association path** requires the primary to
  be an unassociated adult and sets `related_to_member_id` (chain prevention is writer-only — no
  trigger); `setSeatingTableKind` demotes any other sweetheart before promoting one; `updateRsvp` and
  `submit_rsvp` both write `guests.rsvp_status` (see the dual-writer note below).
- **One terminal routing decision point per audience (ONB-00).** `/projects` is the ONLY place
  allowed to make a terminal routing decision for a personal or account-less account.
- **Two fields that can disagree are a bug waiting to happen; derive one from the other (ONB-01).**
- **A missing RLS policy on a writable table is a SILENT NO-OP that returns success, not an error.**
  Every time a new class of user gains READ access to a table, audit every WRITE policy on that table.
  **WRITE-01 (0071) closed the outstanding project-scoped write audit** for the listed tables
  (writes → `can_edit_project`; SELECT stays `can_access_project` on split-policy tables).
  **Already correct before 0071 (skipped):** `guest_members` — SELECT `can_access_project` +
  INSERT/UPDATE/DELETE `can_edit_project` since **0040** ("WRITE-01 day-one" in that migration);
  `rsvp_attendees` — SELECT `can_access_project` + UPDATE/DELETE `can_edit_project` since **0039**,
  **no INSERT policy** (`submit_rsvp` is the sole inserter). Still out of scope / unchanged:
  `assistant_messages`. **`outreach_messages` (0090):** vendor rows stay
  `can_access_project_vendor`; lead-recipient rows use `is_account_member` (exactly one of
  `project_vendor_id` / `lead_id`). **`calendar_events` exception:** one `FOR ALL` policy
  (CAL-02 / 0071) — project branch uses `can_edit_project` for both `using` and `with_check`, so
  project-linked **reads and writes** tighten together. Offering `viewer` from Access remains a
  **product** deferral — see §13 / §15.
- **One concept must have ONE stored vocabulary, enforced at the write path.** Corollary: the
  **relationship picklist (`lib/guest-relationships.ts`)** is a STANDALONE UI+writer constant —
  deliberately NOT imported from / wired to `VENDOR_CATEGORIES`, carries NO DB CHECK, and is enforced
  by the guest writers (`isGuestRelationship`). A convenience picklist is not a vocabulary and must
  never be "unified" with the vendor-category ids. (Same posture as `budget-quick-categories.ts`.)
  **`priority_vendor_category_ids` / `already_booked_vendor_category_ids` reuse the canonical 13-id
  `VENDOR_CATEGORIES` vocabulary via array-subset CHECK (`<@`) — no new vendor-category vocabulary.**
  **`formality` is a small closed ordinal enum, CHECK-constrained, deliberately distinct from the
  free-text `style` column** (aesthetic/vibe vs. formality/dress-code tier).
- **Resolve display vocabulary AT THE CALL SITE, not inside the consuming lib.** Exemplar:
  `relationship_side` stores a stable token (`partner_1`/`partner_2`); the display label is derived at
  render via `lib/partner-sides.ts` (profile names → `projects.name` split → generic Partner 1/2).
  Names change; a stored name string goes stale — the token doesn't. This is why "derive from the
  couple's names" is architecturally right, and why **Bride/Groom was rejected**.
- **Free-text-at-rest can still be a SET at read, but ONE parser owns the split.**
  (`timeline_events.owner`; `lib/timeline-owners.ts`.)
- **Website photos live as public URLs in `content` jsonb, not as `files` rows.**
- **A value with a canonical vocabulary or derivation must be enforced at the WRITE BOUNDARY, on EVERY
  writer. Where the app's column is DELIBERATELY free-text, matching that is CORRECT, not a gap** —
  `budget_items.category`, `timeline_events.owner`/`section`, and the `guest_members` free-text fields
  (`dietary_note`, `rsvp_attendees.song_request`) are authored free on purpose; do NOT harden to enums.
- **Operational views are active-scoped; repository views span archived.** Dashboard aggregates,
  sidebar, Active count, Calendar overlay filter to `archived_at is null`. The Contracts archive
  (CON-01) deliberately does NOT.
- **Paid is derived ONLY from the `budget_payments` ledger; never from `actual_amount`.** (v29 budget
  dual-source guardrail — unchanged.)
- **Installment coverage is DERIVED AT READ via the waterfall, not stored.** (v29 — unchanged.)
- **The budget "paid so far" headline and Needs-attention panel are GLOBAL; per-card filters never
  rewrite them.** (v29 — unchanged.)
- **Additive-then-destructive for column reinterpretation / supersession.** Exemplars: `actual_amount`
  reinterpreted; `budget_items.due_date` write-dead then dropped later; **`rsvp_access_mode` kept and
  read-dead after gated-only (0054, drop candidate 0100+); `guests.meal_choice` inert after the
  flatten (drop in MEAL-03a / 0100+); `guests.party_size` still written by `addGuest` for create-form
  slots but unused for person-grain headcount (also drop in MEAL-03a / 0100+);
  `wedding_profile.traditions` write-dead as of POLISH-01 (drop unscheduled — same posture).**
- **A gated (token-bound) RSVP write to a KNOWN guest is NOT the forbidden auto-match.** The standing
  rule "no auto-matching of open RSVPs to guests" exists because an **open** submission arrives with no
  guaranteed identity. GST-04 made every submission gated: the household token resolves to
  `matched_guest_id` **deterministically**. Writing a token-identified submission to its resolved
  household (setting `guests.rsvp_status`) is a direct write to a known identity, not a guess. **The
  still-forbidden thing is name-string fuzzy matching** — matching submitted attendee *names* to
  specific `guest_members` rows. GST-09 is household-badge only (Option A) and deliberately does NOT do
  this. **RSVP-02's headcount removal does not change this** — the count was always derived server-side.
- **One authoritative badge column, two legitimate writers, latest-wins.** `guests.rsvp_status` is
  written by BOTH `updateRsvp` (manual dropdown — off-platform / phone / paper entry) AND `submit_rsvp`
  (on-platform gated auto-populate, 0058). NOT a dual-source trap: ONE column, two entry paths,
  newest answer wins. The person-line displays this badge as the authoritative status (GST-06);
  `guest_members.attending` is a **secondary/inert** manual field, not the shown status.

- **Rule-based automation answers "did X happen"; agentic automation answers "what does X mean";
  CRM workflows answer "when X happens, do Y after N days."** AUTO-01/02 are date math + a
  template email, zero LLM. AGENT-01/02/03 reuse the existing assistant tool loop. AUTO-03b
  extract/compose is CON-04-style single-shot JSON — there is no project to reason across yet.
  WORKFLOW-00…05 is an account-scoped event + delay engine (`lib/automations/`) — not a cron
  scan and not the assistant loop. Do not build agentic infrastructure for something a rule
  already solves. Do not fold LLM cron into the AUTO-01/02 route. Do not fold CRM workflows
  into either.
- **The propose-vs-approve line is permanent for v1.** Send-to-self (AGENT-01) and in-app-only
  writes (AGENT-02 `add_note`, WORKFLOW `add_note` / `change_lead_stage`) may run unattended.
  Anything that reaches a third party (AGENT-03 vendor, AUTO-03 inquiry reply, WORKFLOW-03
  `send_email`) **always** waits for a human Approve click. AGENT-01/02 autonomy is not
  precedent for auto-send.
- **Unattended reasoning runs per PROJECT, not per account.** Batching (one digest email) happens
  at the send layer. True cross-project prioritization is deferred. CRM workflows run per
  **target** (today: a lead), not per project.
- **Every agentic run writes `agent_run_log`, including failed and capped ones.** A silent failed
  cron is worse than a failed chat turn — nobody is watching. CRM workflow steps write
  `automation_run_log` the same way (`ok` / `error` / `skipped`).
- **`create_agent_draft` never sends.** Chat tool is `vendor_outreach` only (`target_id` =
  `vendors.id`). AUTO-03b calls `createAgentDraft(..., { kind: "inquiry_reply" })` from cron.
  WORKFLOW-03 calls `createAgentDraft(..., { kind: "workflow_email" })` from the impersonated
  step executor. Neither is a new chat write tool. The human Approve action is the only path
  from a draft to Gmail.
- **Automation failure must not fail the underlying mutation.** `dispatchLeadAutomation` never
  throws to `createLead` / `updateLeadStage` / `reorderLeads`. A broken workflow is an
  `automation_runs.status = failed` row, not a blocked kanban drag.
- **A workflow `change_lead_stage` does not re-dispatch.** The executor updates `leads.stage`
  directly under the impersonated session — it does **not** call `updateLeadStage`. That is
  how cascade loops are avoided. Do not "fix" this by routing the executor through the
  user-facing action.
- **Public inquiry capture does not fire `lead_created` workflows.** `createLead` (manual Add
  Lead) does. `submit_inquiry` and the Resend inbound webhook insert `leads` without calling
  `dispatchLeadAutomation`. `project_created` is schema-legal and unwired. Builder UI offers
  **only** `lead_stage_changed`. Do not assume form/inbound arrivals run templates.

**Soft stack design don'ts (Tier 1 chrome — see §10 / `.cursor/design.mdc`):**
- No raised-inside-raised stacking. (ASSIST-UI-01's `AskAssistantPrompt` is a **recessed** well inside
  a raised card / an `EmptyState` action slot — do not promote it to a nested raised card.)
- No Tier 1 accent floods (`--accent-wash` for pills/washes only).
- No Cormorant or Great Vibes outside Tier 3 (and the run-sheet print-header carve-out).
- No ad-hoc radius utilities — use `--radius-card` / `--radius-inner` / `--radius-pill` (Tier 1);
  website image-shape options read `--ws-*` / website radii (Tier 3), never Tier 1 utilities.
- No florals, photographic ornament, gold/metal gradients, decorative shadows on Tier 1 / Tier 2.
- Do not import Tier 1 Soft stack tokens as website colour; websites read `--ws-*` only.
- **One collapse/chevron affordance** — the website section editor (WEB-EDITOR-02) reuses it; do not
  fork.

---

## 4. The access model (the spine)

Tables: `accounts` (kind: personal | business; **`plan` planner | venue, 0083**), `account_members`,
`projects`, `project_members`, `project_invitations` (0028), **`account_invitations` (0081/0082)**.

### The three user classes (invited members share one class, two roles)

| Class | `accounts` | `account_members` | `project_members` | Sees |
|---|---|---|---|---|
| Self-serve couple | personal | 1 row | none | their one project |
| Planner (incl. teammates) | business | **1+ rows (TEAM-01)** | none | all their projects |
| **Invited member** | **none** | **none** | **1 row per project** (`couple` **or** `collaborator`) | **only invited projects** |

**A planner opening their own project has NO `project_members` row.** An invited member has NO
account kind. `plannerOnly` tab filtering resolves from ACCOUNT kind and must never be switched to
`project_members.role`. **CAL-04 / CAL-06 is the sole deliberate exception:** when `kind === null`
and `projectMemberRole` is `"couple"` or `"collaborator"`, the Calendar tab is shown — still not a
general role-based tab system. **`viewer` exists on the enum but is not issued by Access (INV-07 allowlist remains
`{couple, collaborator}`).** WRITE-01 write gates are done; offering `viewer` is still a product
deferral.

**TEAM-01 teammates are the same planner class** — they have `account_members` on the business
account and therefore `is_account_member` everywhere the owner does. Flat: any member can invite /
revoke / remove (including self), with a structural last-member guard. **`account_members.role`
defaults to `'owner'` and is unused for authorization** — intentional, not a gap. Do not introduce
account-level RBAC without a deliberate slice.

### `project_invitations` (0028; INV-07 uses existing `role`)

- `project_id`, `email`, **`role project_role NOT NULL DEFAULT 'couple'`**, `token_hash` (sha256 hex),
  `invited_by`, `expires_at`, `accepted_at` / `accepted_by`, `revoked_at`, `created_at`
- Partial unique: one live invite per `(project_id, lower(email))`
- Policies: all four gated by `can_manage_project_access`
- **`accept_project_invitation` inserts `project_members.role` from `v_inv.role`** (never hardcodes).
- **Sole app writer:** `createProjectInvitation(projectId, email, role)` — allowlist
  `{couple, collaborator}`; rejects `viewer`.

### `account_invitations` (0081 + 0082; TEAM-01)

Account-grain parallel to 0028 — **not** a reuse of `project_invitations`. Business-only.

- `account_id`, `email`, `token_hash` (sha256 hex), `invited_by`, `expires_at` (14 days),
  `accepted_at` / `accepted_by`, `revoked_at`, `created_at`. **No `role` column** (flat seats).
- Partial unique: one live invite per `(account_id, lower(email))`.
- Policies: all four gated by `is_account_member`; **INSERT also requires `accounts.kind =
  'business'`** (0082).
- **`accept_account_invitation(token)`** — SECURITY DEFINER; email must match `auth.email()`;
  rejects non-business (`invitation_not_business`); inserts `account_members` (role default
  vestigial); idempotent if same user already accepted.
- **`remove_account_member(account_id, user_id)`** — any member may remove any member including
  self; raises `cannot_remove_last_member`.
- **`list_account_members(account_id)`** — DEFINER; returns fellow members' emails via
  `auth.users` join (gate in-body).
- **`account_members` SELECT** replaced "see own memberships" → **"members see fellow account
  members"** (`is_account_member`). Callers that assumed self-only **must** filter `user_id`.
- **Sole app writer:** `createAccountInvitation(accountId, email)` — kind-checks business in
  the action **and** RLS. Cookie: `pending_account_invite_token`. Path: `/invite/account/[token]`.
- **clone_demo_account does not clone `account_invitations`** (same posture as
  `project_invitations`).

### `project_members` (0001)

- `project_id` / `user_id` FKs cascade; `role` `project_role` enum (`couple | collaborator | viewer`)
  NOT NULL default `couple`; `created_at`. **PK is composite `(project_id, user_id)` — no `id`.**
- Policies: SELECT `can_access_project(project_id)`; DELETE `can_manage_project_access(project_id)`.
  NO INSERT/UPDATE policy — `accept_project_invitation` is the only writer.

> **The `project_members` SELECT policy is recursive BY SHAPE ONLY and is SAFE. Do not re-flag it,
> and do not narrow it.** `can_access_project` is SECURITY DEFINER owned by `postgres`;
> `project_members.relforcerowsecurity = false`. Narrowing to `user_id = auth.uid()` breaks INV-02.

### Access functions (SECURITY DEFINER, `public`, granted to `authenticated`)

- **`can_access_project(project_id)`** — member of the owning account OR direct project member. The
  READ gate on every project-scoped surface. **WRITE gates on most project-scoped tables moved to
  `can_edit_project` in WRITE-01 / 0071** (see below).
- **`is_account_member(account_id)`** — account-scoped features + project INSERT.
- **`can_manage_project_access(project_id)` (0028)** — gates `project_invitations`, the
  `project_members` DELETE, and `set_project_archived`.
- **`can_edit_project(project_id)` (0029)** — `is_account_member` OR a `project_members` row with
  `role in ('couple','collaborator')`. Gates the `projects` UPDATE policy and **WRITE-01 write
  policies** on project-scoped tables (budget, files, guests, notes, schedule, project_vendors, tasks,
  timeline, vendor_targets, wedding_profile, wedding_websites, seating mutate, rsvp_submissions
  mutate, and the project branch of `calendar_events`). **`viewer` deliberately excluded.**
  `guest_members` has used split policies since 0040 (SELECT access / write edit). `rsvp_attendees`
  likewise since 0039 (no INSERT).
- `can_read_vendor(vendor_id)`, `bootstrap_account_and_project(...)`,
  `resolveBusinessAccountId(supabase)`, **`get_project_branding(project_id)` (0070)**,
  **`clone_project_template` (0079)**, couple-trial helpers (**0077/0078**, residual),
  **`list_account_members` / `accept_account_invitation` / `remove_account_member` (0081/0082)**,
  **`confirm_project_vendor(token)` (0085, anon+authenticated execute)**,
  **`submit_inquiry(...)` (0089/0090, anon+authenticated execute)**,
  **`get_inquiry_branding(slug)` (0093, anon+authenticated execute)**.

### Guest / RSVP tables (project-scoped) — the two-tier model (preserved, not flattened away)

The Guests page is a **flat one-line-per-person display** (GST-06), but the **data model stays two
tiers**. Household is the intake, token, mailing-address, and RSVP-grouping unit; the person is the
display line and the home for per-person fields.

- **`guests` (0006 + 0056)** — the **household**. `id`, `project_id`, `full_name` (NOT NULL —
  household/postal identity), `email` (nullable — **UI-deprecated by GST-07, column kept**; no
  add/edit field on Guests), `phone` (nullable — surfaced in place of email), **`address` (nullable,
  0056 — household mailing address)**, `household` (nullable label), `party_size` int default 1
  (**still written by `addGuest` and drives additional create-form slots; person-grain display/
  summary does not use it for headcount — drop in MEAL-03a / 0100+**), `rsvp_status` text NOT NULL
  default `pending` CHECK `pending|attending|declined` (**the badge — the authoritative shown status;
  written by `updateRsvp` AND `submit_rsvp`**), `meal_choice` (nullable, **inert — drop in MEAL-03a /
  0100+**), `notes`, `created_at`, `rsvp_token` NOT NULL default `encode(gen_random_bytes(16),'hex')`
  (the per-household gated-lookup token).
- **`guest_members` (0040 + 0056 + 0063)** — the **person / display line**. `id`, `project_id`,
  `guest_id` (composite FK `(project_id, guest_id) → guests` ON DELETE CASCADE), `name` (nullable),
  `meal_option_id` (nullable FK → `meal_options` ON DELETE SET NULL), `dietary_note` (nullable
  free-text), `attending` bool NOT NULL default true (**secondary/inert manual field — NOT the shown
  status; the badge is**), **`relationship_side` text nullable CHECK `partner_1|partner_2` (0056)**,
  **`relationship` text nullable (0056 — curated picklist value, NO DB CHECK, writer-guarded)**,
  **`member_type` text NOT NULL default `adult` CHECK `adult|child` (0063)**, **`related_to_member_id`
  uuid nullable (0063 — self-FK `(project_id, related_to_member_id) → guest_members(project_id, id)`
  ON DELETE SET NULL on that column only; no-self-ref CHECK; plus-one-of-plus-one chains blocked in
  `addGuest`, not by trigger)**, `sort_order` int default 0, `created_at`. **SEAT-12 / 0059 gives this
  row the seating grain** (`seating_assignments.guest_member_id` — see §5).
- **`rsvp_attendees` (0039 + 0057)** — per-attendee rows attached to an RSVP **submission** (not a
  guest). `id`, `project_id`, `submission_id` FK, `meal_option_id` (nullable), `name`, `dietary_note`,
  **`song_request` text nullable (0057 — persisted only when the event toggle is on)**, `sort_order`,
  `created_at`.
- **`rsvp_submissions`** — one row per submission; `matched_guest_id` (the token-resolved household),
  `name`, `response`, `party_size` (**still written by the RPC; guest-facing self-report removed in
  RSVP-02 but the column is derived server-side, not left null**), `email` (**nullable since 0023;
  guest-facing field removed in RSVP-02**), `message`. Written only by `submit_rsvp`.

> **Backfill discipline (GST-06 / 0055):** every household must have ≥1 `guest_members` row, or a
> members-only display drops it. 0055 backfilled one member each for the 3 legacy zero-member
> households. New guests from `addGuest` already get ≥1 member. Associated (GST-12) guests insert a
> member into an **existing** household — no new `guests` row.

### Seating (SEAT-12 / 0059 — per-member grain; SEAT-13 / 0064 — one sweetheart)

Seating operates at the **`guest_members` (person) grain**. Interaction remains **own SVG pointer drag
+ click-to-place / click-empty-to-move / arrow nudge — not @dnd-kit**.

**`seating_assignments` (0025 + 0059):** `guest_member_id` uuid nullable→required-in-practice with
composite FK `(project_id, guest_member_id) → guest_members(project_id, id)` ON DELETE CASCADE; unique
`(project_id, guest_member_id)` (one seat per person); **`guest_id` is nullable / write-dead** (kept
for backfill history; writers use `guest_member_id`). Occupancy vs `seating_tables.seat_count` is
**action-enforced** in the seating writers — no structural occupancy constraint.

**Sweetheart (SEAT-13 / 0064):** partial unique index `seating_tables_one_sweetheart_per_project` on
`(project_id) WHERE kind = 'sweetheart'`. `setSeatingTableKind` demotes any other sweetheart to
`standard` before promoting; an empty table newly marked sweetheart defaults `seat_count = 2`. Canvas
distinguishes sweetheart by **form + "SWEETHEART" label** (accent stroke), never by a status colour.

### `set_project_archived` + `projects.archived_at` (0044 / ARCH-01)

Unchanged. Sole writer `set_project_archived(uuid, boolean)` — SECURITY DEFINER,
`can_manage_project_access`-gated.

### The nine public (anon) surfaces

1. **Read:** `wedding_websites` anon `SELECT using (published = true)` (0022). Riders:
   `external_registry_links` (0035), `meal_service_style` (0038), `rsvp_access_mode` (0041 —
   **read-dead**), `song_requests_enabled` (0057). **WEB-EDITOR-02 / WEB-STYLE-01 add no columns to the
   anon row — section order + layout/image-shape options live inside the existing `content` jsonb, an
   already-readable rider.**
2. **Write (RPC):** `submit_rsvp(...)` — definer, anon execute (0039; extended 0041; gated-only 0054;
   song handling 0057; auto-populates `guests.rsvp_status` in-transaction 0058; **velocity throttle
   0072**). **RSVP-02** changed only the client form; **RSVP-THROTTLE-01** replaces the RPC body in
   place (≤3 / household / 1 minute — constants only in the RPC).
3. **Read:** `registry_items` anon `SELECT` gated to a published site (0035).
4. **Write:** `registry_claims` anon `INSERT` gated to published sites (0036).
5. **Read:** `meal_options` anon `SELECT` gated to a published site (0038).
6. **Read (RPC):** `lookup_rsvp_household(...)` — definer, anon execute (0041; full-name in 0043).
7. **Write (RPC):** `confirm_project_vendor(token)` — definer, anon execute (0085 / AUTO-02).
   Token-gated one-click confirm on a `project_vendors` row. Returns vendor name + wedding
   identifier only (`already_confirmed` for idempotent re-clicks). **No anon SELECT on
   `project_vendors`.** Standing per-link token (`rsvp_token` generation, not invitation hashing).
8. **Write (RPC):** `submit_inquiry(slug, name, email, message, honeypot, wedding_date, guest_count)`
   — definer, anon execute (0089 / AUTO-03a). Resolves `account_id` from `accounts.inquiry_slug`
   server-side (business-kind only). Honeypot + hashed-IP velocity throttle (3 / IP / account /
   1 minute; constants only in the RPC). Inserts `leads` with `source = 'form'`. **No anon SELECT
   or INSERT on `leads`.** The Resend inbound webhook is **not** this ledger — signature-verified
   server-to-server, same as Stripe.
9. **Read (RPC):** `get_inquiry_branding(p_slug)` — definer, anon + authenticated execute (0093 /
   WHITE-03). Returns `account_found` plus the three brand fields (`brand_name`, `brand_logo_url`,
   `brand_accent_color`) **only when** `white_label_enabled` is on. Never returns `account_id`,
   email, or any other `accounts` column. Unknown slug → `account_found = false` (invalid-link
   UI). White-label off → `account_found = true` and brand fields null (First Look Wordmark).
   Same posture as `get_project_branding` / `submit_inquiry`. **No anon SELECT on `accounts`.**

`rsvp_attendees` / `guest_members` / `guests` / `rsvp_submissions` / `project_invitations` /
`account_invitations` / `calendar_events` / `contract_templates` / `budget_payments` /
`payment_schedule` / `notes` / `user_tours` / `demo_start_attempts` / `inquiry_form_attempts` / `project_vendors` / `automation_workflows` / `automation_steps` / `automation_runs` / `automation_run_log` / the seating tables have NO
anon policy. Storage carve-outs:
**0042 `website-media` public SELECT** (recorded, not counted); **0070 `brand-media` public SELECT**
(same posture; recorded, not counted); **0061 `vendor-media` private bucket** — authenticated
account-member policies only, **NO anon SELECT**, reads via signed URLs (same posture as
`project-files`). **Demo visitors authenticate anonymously then call authenticated RPCs** — still not
an anon RLS surface.

### Demo account flags (DEMO-01 / 0065) + purge/throttle (DEMO-04 / 0073–0074) + anonymize (DEMO-ANON-01 / 0092) — ON DISK

`accounts` gains `is_demo boolean NOT NULL DEFAULT false`, `is_demo_template boolean NOT NULL DEFAULT
false`, `demo_created_at timestamptz`, plus CHECK `not (is_demo and is_demo_template)`. Template rows
are curated seed data; visitor clones are `is_demo = true`. **0073:** `demo_start_attempts` (hashed
IPs only; no policies for anon/authenticated); `try_record_demo_start` / `purge_demo_accounts` /
`purge_demo_auth_users` (service_role). **0074:** `clone_demo_account` calls the throttle on every
invocation. Edge Function `purge-demo` schedules hourly after manual deploy. See §5 / §7.

**DEMO-ANON-01 / 0092:** homepage demo clones used to copy the business template's live name
("Events by Jordyn") into public workspaces; the leads intake card then slugified that into
`/inquire/events-by-jordyn`. 0092 (1) renames existing demo clones that still match the template
name to **Lumen Planning**, (2) nulls leaked demo `inquiry_slug`s that aren't `demo-studio` /
`demo-studio-*`, (3) adds `BEFORE INSERT` trigger `anonymize_demo_business_account` so new
`is_demo` business rows cannot keep a live brand. **Does not rename the real (non-demo) Events
by Jordyn account.** App-side `ensureInquirySlug` always allocates `demo-studio` (collision
suffix via 2 hex bytes) for `is_demo` accounts. Business demo template seed also uses Lumen
Planning. `clone_demo_account` still does **not** clone `automation_workflows` / steps / runs
(0074 graph never gained those tables).

### Account branding (WHITE-01 / 0070 + VENUE-01 / 0083) — ON DISK

Business accounts may enable white-label: `white_label_enabled`, `brand_name`, `brand_logo_url`,
`brand_accent_color` + CHECK `white_label_enabled = false OR kind = 'business'`. Members may UPDATE
their own `accounts` row (branding writes). Public `brand-media` bucket (5MB; png/jpeg/webp; no SVG).
`get_project_branding(project_id)` returns brand fields when the caller `can_access_project`, the
owner is business, and white-label is on — **authenticated only, not anon**. CoupleShell applies
logo/name and optional `--accent` override for invited project viewers.

**VENUE-01 own-shell:** `getOwnAccountBranding()` brands **PlannerShell** only when
`accounts.plan = 'venue' AND white_label_enabled`. Ordinary planner accounts stay First Look.
Do not white-label public websites. Settings at `/account/branding`.

**WHITE-02 (NO SCHEMA):** `/account/branding` accent UI is 8 curated swatches
(`lib/brand-preset-colors.ts` — Berry / Dusty rose / Wine / Plum / Slate / Navy / Taupe / Forest;
no sage/clay/rosewood status tokens) + a native `<input type="color">` + the existing hex field.
All three write the same `brand_accent_color` through `updateAccountBranding`. Live preview updates
`--accent` from the in-progress selection. Contrast guard (`lib/branding/contrast.ts`) is
**client-side only** (WCAG relative luminance vs white, 4.5:1); a clay warning appears below
threshold and **does not block save**. Do not persist a preset id — the stored value is still a
free-text hex.

**WHITE-03 / 0093:** `/inquire/[slug]` reads branding via `getInquiryBranding` (anon client →
`get_inquiry_branding`). Shared `AccountBrandMark` + `brandAccentStyle` — do not fork a second
logo/accent path. White-labeled inquire pages show a "Powered by First Look" footer. Branding
page copy now names the public inquiry embed as a brand surface. **Do not white-label public
wedding websites.** Embed iframe `src` is hardcoded to `https://www.usefirstlook.app/inquire/{slug}`
in `InquiryIntakeCard` (production origin, not `window.location.origin`).

### Account plan (VENUE-01 / 0083) — ON DISK

`accounts.plan` text NOT NULL default `'planner'` + CHECK `planner|venue` + CHECK
`plan = 'planner' OR kind = 'business'`. Stripe webhook (VENUE-02) is the live writer for paid
venue; **CHECKOUT-RECONCILE-01** is the same-path fallback on the Checkout return page. Column may
also be hand-set for pilot. Personal accounts keep the default and never use it in couple UI.
Idempotent plan flips do **not** touch `white_label_enabled` or brand columns.

**`getAccountContext` returns `plan`** (`planner` | `venue`, defaulting unrecognized values to
`planner`) so PlannerShell copy (VENUE-07) and own-shell branding can resolve at the call site.
Still filters `account_members` by `user_id`.

**VENUE-04 / VENUE-06 venue-intent bootstrap:** `bootstrapAccountWithVenueIntent`
(`app/(app)/projects/actions.ts`) wraps the same `bootstrap_account_and_project` RPC as an ordinary
planner signup — same business-kind path, same zero-project result. The only difference is the
post-bootstrap redirect: `/account/venue-upgrade` instead of `/dashboard`, when venue intent was
signaled on submit. Venue intent is a request-only flag — never written to `accounts` or any other
table. `accounts.plan` stays `'planner'` through this entire path; it flips to `'venue'` only via a
confirmed paid subscription (webhook or the CHECKOUT-RECONCILE-01 fallback). **VENUE-06** made
venue a first-class equal-weight welcome option (and added lock-screen + billing entry points);
the bootstrap mechanics did not change. There is still no `kind='venue'`.

### `user_tours` (TOUR-01 / 0066) — ON DISK (confirm paste)

User-scoped (not project-scoped): PK `(user_id, tour_key)`; `status` `completed|skipped`;
`dismissed_at`. RLS: authenticated own rows only. **No CHECK on `tour_key`**. Page-tour keys live
in `lib/tours/tour-config.ts` (`overview`, `seating`, `guests`, `budget`, `website`, `checklist`,
`vendors`, `notes`). **ONBOARD-NUDGE-01** reuses the same table + sole writer `dismissTour` for
storage-only keys `venue_branding_nudge` / `venue_team_nudge` — these are **not** page tours and
must not be added to `TOUR_KEY_BY_SEGMENT` / `TourProvider` auto-fire. See §7.

### Notes (NOTES-01 / 0062) — ON DISK, paste-unconfirmed

`notes` gains optional **`action_status` text** — `null` (ordinary), `needs_action` (pinned, rosewood
dot), or `done` (sage pill). CHECK: `action_status is null or action_status in ('needs_action','done')`.
UI: preview-card grid → modal editor; list sort pins `needs_action` first, then `updated_at` desc.
Deliberately a **tri-state annotation, not a second task system**. Assistant **`get_notes` / `get_note`
return `action_status`** (pin-sort + needs-action count in summary). Assistant `add_note` accepts an
optional `action_status` (`needs_action` | `done`); omit for an ordinary note (default `null`). AGENT-02
creates notes with `needs_action`.

### Calendar events RLS (CAL-02 / 0060 + WRITE-01 / 0071) — ON DISK; **0071 LIVE VERIFIED**

**One combined `FOR ALL` policy** (not split SELECT/write): **"calendar events managed by account or
project members"** — `is_account_member(account_id)` **OR** (`project_id is not null` AND
**`can_edit_project(project_id)`** after 0071; was `can_access_project` in 0060) on **both** `using`
and `with check`. Consequence: tightening the project branch also tightens project-linked **reads**
for non-account members (a future `viewer` would fail SELECT on project-linked rows too — low risk
today; Access does not issue `viewer`). Account members still pass via `is_account_member`.
**Live check (v35):** `pg_policies` shows `can_edit_project` on that single policy.
**Tab visibility (CAL-04 / CAL-06):** personal owners always; invited members with
`project_members.role` in `('couple','collaborator')` also see Calendar; other kind-null roles do
not. See §6.

### Vendors / vendor-media (VND-11 / 0061) — ON DISK, paste-unconfirmed

- **`vendors.instagram`** text nullable — handle or URL on the account Vendor library detail.
- **Storage bucket `vendor-media`** — private (`public=false`), 25MB, image MIME set; path
  `{account_id}/{vendor_id}/{file}`; all four object policies gated by
  `is_account_member(foldername[1]::uuid)`. **No anon SELECT.**

> **Anon grant sharp edge (recorded, RLS-blocked):** the table-level GRANT on `guests` includes
> `UPDATE` to the anon role, but RLS (`can_access_project` only) blocks any *direct* anon UPDATE — the
> definer `submit_rsvp` is the sole anon-reachable badge writer. Safe today (RLS is the enforcer), but
> belt-and-suspenders-blocked rather than absent; fold into WRITE-01 and don't loosen the `guests`
> policy.

### Payment reminder log (AUTO-01 / 0084) — ON DISK

`payment_reminder_log`: `id`, `payment_schedule_id` FK cascade, `project_id`, `reminder_kind`
CHECK `due_7|due_2|overdue_first|overdue_recurring`, `sent_at`. RLS on, **zero policies** —
service-role cron only (same posture as `demo_start_attempts`). Partial unique index on
`(payment_schedule_id, reminder_kind)` WHERE kind in the three one-shot values. Recurring nags
are excluded so the table can hold many `overdue_recurring` rows; the 5-day gap is read-time in
`app/api/cron/payment-schedule-watch/route.ts`. Cadence constants live only in that route.
Skips demo accounts. Digests per account via `resolveAccountEmails` + Resend. UI for "reminders
sent" / digest frequency is **deferred**.

### Vendor countdown confirm (AUTO-02 / 0085) — ON DISK

`project_vendors` gains `arrival_time` (time), `scope_note` (text), `confirm_token` (NOT NULL,
default `encode(extensions.gen_random_bytes(16), 'hex')`, unique — **rsvp_token generation, not
invitation hashing**), `confirmed_at`, `last_reminder_sent_at`, `last_reminder_kind` CHECK
`due_30|due_7|due_2`. Send-side dedup is `last_reminder_kind` on the row, **not** a log table.
No recurring nag after T-2. Cron skips a booked vendor with no `arrival_time`. Booked-card UI
authors arrival + scope (`updateProjectVendorLogistics`). Public page `/vendor-confirm/[token]`
calls `confirm_project_vendor` via the anon client; standing token (re-confirm is idempotent,
returns `already_confirmed`, token is not invalidated). **No anon SELECT on `project_vendors`.**

### Agent run log + drafts (AGENT-00 / 0086 + AGENT-01a / 0087 + AGENT-03 / 0088) — ON DISK

**`agent_run_log`:** `id`, `project_id` nullable (0089 made it nullable so inquiry runs can be
account/lead-scoped), `account_id` / `lead_id` (0089), `trigger_kind` CHECK
`synthesis|implication_scan|outreach_scan|inquiry|smoke`, `started_at`, `completed_at`, `outcome`
CHECK `ok|capped|error` (nullable until complete), `summary`, **`acted_as_user_id`** (0087 — null
for read-only AGENT-01). Scope CHECK: `project_id is not null OR account_id is not null`. RLS on,
**zero policies** — service-role only. **Every run writes a row, including failed and capped.**

**`agent_drafts`:** `id`, `account_id`, `project_id` nullable (composite FK
`(account_id, project_id) → projects` ON DELETE SET NULL `(project_id)` only — same column-specific
SET NULL as 0045), `kind` CHECK `vendor_outreach|inquiry_reply|workflow_email` (0095 added
`workflow_email`), `target_id` uuid **no FK**
(polymorphic: `vendors.id` or `leads.id`), `subject`, `body`, `status` CHECK
`pending|approved|rejected|sent` default `pending`, `created_at`, `reviewed_at`, `reviewed_by`,
**`outreach_message_id`** (0088, FK SET NULL). Partial unique:
`agent_drafts_one_pending_per_target` on `(account_id, kind, target_id) WHERE status = 'pending'`.
RLS: authenticated SELECT/INSERT/UPDATE via `is_account_member` — **invited project members must
not see these** (CRM, same as leads, not calendar dual-gate). No DELETE policy. 0086 shipped
SELECT only; 0088 added INSERT (unattended `create_agent_draft`) + UPDATE (human approve/reject).
`inquiry_reply` and `workflow_email` both target `leads.id` with `project_id` null; they share
the Leads-kanban clay badge + `InquiryReplyDrawer` (kind-aware title). Chat
`create_agent_draft` remains vendor_outreach only.

### Inquiry slug + form attempts (AUTO-03a / 0089) — ON DISK

`accounts.inquiry_slug` text nullable; format CHECK `^[a-z0-9]+(?:-[a-z0-9]+)*$`; business-only
CHECK (`kind = 'business' OR inquiry_slug is null`); unique partial index where not null. **Never
on personal accounts.** Lazy-generated by `ensureInquirySlug` on first Leads-page load
(`lib/inquiry/ensure-slug.ts`) from the account name — **except demo clones, which always get
`demo-studio`** (DEMO-ANON-01). Public form: `/inquire/[slug]`. Inbound
address: `{slug}@{INQUIRY_INBOUND_DOMAIN}` (still captured; **INQUIRY-EMBED-01 removed inbound
copy from `InquiryIntakeCard`** — planners see form link + iframe snippet only).

`inquiry_form_attempts`: hashed-IP throttle log (DEMO-04 shape). RLS on, zero policies. Threshold
(3 / IP / account / 1 minute) lives **only** inside `submit_inquiry`.

### Outreach dual-target (AUTO-03b / 0090) — ON DISK

`outreach_messages.project_vendor_id` is now nullable. `lead_id` uuid FK → `leads` ON DELETE
CASCADE. XOR CHECK: exactly one of `project_vendor_id` / `lead_id`. RLS split: vendor rows stay
`can_access_project_vendor`; lead-recipient rows use `is_account_member` (CRM). Index on
`(lead_id, created_at)` where `lead_id is not null`. **`leads.estimated_guest_count`** integer
nullable + CHECK 1–20000. Form path (0090 replace of `submit_inquiry`) persists guest count on
the column **and** still appends a notes line. Kanban/edit UI does **not** yet surface
`estimated_guest_count` (extraction writes it; LEAD-EDIT-01 does not include the field).

### Accounts member UPDATE grant (ACCT-GRANT-01 / 0091) — ON DISK

`grant update on table accounts to authenticated;` 0070's `"members update own account"` RLS
was a no-op for member clients because authenticated lacked the table privilege. SELECT already
worked via 0001's policy + default SELECT grant. After 0091, member UPDATE of branding columns
and `inquiry_slug` can pass GRANT and then RLS. `ensureInquirySlug` currently still writes via
service-role as a workaround for the pre-0091 hole — after 0091 is pasted, that write **can**
move back to the member client; do not treat the service-role path as the intended long-term
writer.

### CRM workflows (WORKFLOW-00…05 / 0094–0096) — ON DISK

Account-scoped trigger → delayed steps. Parallel to AUTO-* (fixed cron scan, no LLM) and AGENT-*
(assistant tool loop). Dispatch model is **event + delay**, not a scan.

**`automation_workflows`:** `id`, `account_id`, `name`, `trigger_kind` CHECK
`lead_stage_changed|lead_created|project_created`, `trigger_config` jsonb default `{}`,
`enabled` default true, timestamps, **`template_key` text nullable (0096)**. RLS all four
commands `is_account_member`. Partial unique `automation_workflows_one_per_template` on
`(account_id, template_key) WHERE template_key is not null`. Keys live in
`lib/automations/templates.ts` (`booking_confirmation`, `proposal_followup_note`,
`lost_lead_note`) — **no DB CHECK**.

**`automation_steps`:** no denormalized `account_id` — RLS joins through `workflow_id` (same
posture as outreach → leads in 0090). `position` unique per workflow; `action_kind` CHECK
`create_task|change_lead_stage|add_note|send_email` (0095 added `send_email`); `action_config`
jsonb; `delay_days >= 0`.

**`automation_runs`:** denormalized `account_id` for RLS. `target_kind` `lead|project`;
`target_id` uuid **no FK** (same polymorphic posture as `agent_drafts.target_id`). `status`
`pending|running|completed|failed|cancelled`. `current_step_position` / `next_due_at` implement
delay halt. Authenticated CRUD via `is_account_member`.

**`automation_run_log`:** RLS on, **zero policies** — service-role only. Outcome CHECK
`ok|error|skipped`. Step FK SET NULL.

**Wired today:** `dispatchLeadAutomation` from `createLead` (`lead_created`), `updateLeadStage`
and `reorderLeads` (`lead_stage_changed`). Matcher reads `trigger_config.from_stage` /
`to_stage` (empty `{}` = every stage change). **Unwired:** `project_created`; public
`submit_inquiry` / Resend inbound. Builder UI offers **only** `lead_stage_changed` + optional
"Only when moving to" (`LEAD_STAGES`). Actions in the builder: `add_note`, `change_lead_stage`,
`send_email`. `create_task` is executor-wired (needs `project_id` in `action_config`) but
omitted from the UI because tasks are project-scoped.

**Delay:** `advanceAutomationRun` mode `"start"` honors `delay_days` on every step including
the first; mode `"resume"` executes the due step then honors later delays. Daily cron
`GET /api/cron/automation-dispatch` (15:25 UTC) claims pending rows with `next_due_at <= now`,
cap `AUTOMATION_RUNS_PER_INVOCATION = 20`. Writes go through `mintUnattendedWriteSession`.

**`send_email`:** renders `{{couple_name}}` / `{{account_name}}` / `{{wedding_date}}` only
(`lib/automations/render-email-tokens.ts`); unrecognized tokens become `""`, never leak
`{{...}}`. Inserts pending `workflow_email` via `createAgentDraft`. Existing pending draft →
`skipped`, not `error`. Human Approve is `approveAgentDraft` (Gmail).

**Delete:** blocked when the workflow has run history — disable instead. Template off =
`enabled = false` (row kept). Step reorder is two-phase (+1_000_000 offset) so
`(workflow_id, position)` stays unique mid-swap; UI uses WEB-EDITOR-02 `ReorderButtons`.

### Task assignment (TASK-ASSIGN-01 / 0097) — ON DISK

`tasks.assigned_to` uuid NULL – `auth.users(id)` ON DELETE SET NULL. Index
`(project_id, assigned_to)`. **No new RLS on `tasks`** — rides existing
`can_access_project` / `can_edit_project` policies. RPC `list_project_assignees(p_project_id)`
SECURITY DEFINER, granted to `authenticated`, gated by `can_access_project`: returns account
members (role_label `planner` or `couple` by account kind) UNION `project_members` (role as
label). `assignTask` validates the assignee against that list. Board filter: all / unassigned /
person. Other task updates intentionally do not touch `assigned_to`. **`clone_project_template`
and `clone_demo_account` always null `assigned_to`.**

### Ignored vendor categories (VND-13b / 0099) — ON DISK

Table `ignored_vendor_categories`: `project_id`, `category` CHECK (same 13-id list as
`vendor_targets`), unique `(project_id, category)`. RLS: SELECT `can_access_project`; INSERT /
DELETE `can_edit_project`; **no UPDATE** (toggle = insert/delete). Powers Still to book dismiss;
does not change `vendor_targets`.

---

## 5. Migrations (source of truth: `supabase/migrations/`)

**v41 ships schema 0097–0099** (after v40's 0092–0096). v38 product slices (MKT-01/02/03,
VENUE-06, WHITE-02, VENUE-07, ONBOARD-NUDGE-01) remain NO SCHEMA. v39 product slices
(AGENT-01/02, LEAD-EDIT-01) remain NO SCHEMA. v40 NO SCHEMA: INQUIRY-EMBED-01, WORKFLOW-01/02/04,
AUTH-GOOGLE-01, CONTACT-ROUTE-01. v41 NO SCHEMA: VND-13 UI, VND-LIB-01, CON-ARCHIVE-01, VND-16,
VENUE-08, CAL-05, INV-06, TEAM-EMAIL-01, EMAIL-BRAND-01, VND-OUTREACH-MOBILE-01. Next-free
migration is **0100**.

Applied in order. **You are the source of truth on the next number — next free is 0100.**

> **How migrations are applied here (READ THIS BEFORE SUGGESTING ANY CLI COMMAND):** by hand-pasting
> each file into the Supabase SQL editor and running it once, in order. There is NO CLI
> migration-history tracker. **`supabase db push` is FORBIDDEN.** `supabase db query --db-url
> <connection-string>` for READS is sanctioned. Never `--linked`. Fresh installs may use
> `supabase/deploy-batches/batch1.sql`…`batch4.sql` as a convenience concat — still never `db push`.

> **A migration paste must return clean. Any error means NOTHING applied.** After every migration,
> confirm with `to_regclass` / `to_regprocedure` / `pg_policies` / `pg_indexes` before running any
> checkpoint. A file on disk is NOT an applied migration. **0060–0099 live paste is UNCONFIRMED
> unless Dom closed them; 0068–0069 claimed LIVE VERIFIED — re-confirm before relying; 0071 LIVE
> VERIFIED.** Demo template seeds are a separate guarded hand-apply
> (`supabase/seeds/demo_templates*.sql`; requires `set demo.seed_confirm = 'reseed-demo-templates'`
> and an explicit `--db-url`), not part of the migration sequence. Edge Functions are
> separate Dashboard deploys.

> **Write migrations to be re-runnable.** `create or replace` for functions; `drop … if exists`
> before every `create policy` / `create trigger`; `create … if not exists` for indexes;
> `drop constraint if exists` before `add constraint`; guard backfills so a re-paste is a no-op.

**Complete index (0001–0099):**

- **0001** core tenancy (`accounts`, `account_members`, `projects`, `project_members`,
  `can_access_project`; also project-scoped `vendors` as the worked-example feature table)
- **0002** checklist (`tasks`) · **0003** write access (`is_account_member`,
  `bootstrap_account_and_project`, members create/update projects)
- **0004** vendors_account (account-scoped `vendors`) · **0005** discovery_and_outreach
- **0006** guests (household) · **0007** email_credentials · **0008** outreach_app_columns
- **0009** notes · **0010** budget (`budget_items`) · **0011** files
- **0012** wedding_profile (incl. `onboarded_at`) · **0013** vendor_targets
- **0014** assistant_messages · **0015** timeline_events
- **0016** contract_status (`files.status` draft/sent/signed) · **0017** leads · **0018** proposals
- **0019** proposal_acceptance · **0020** subscriptions
- **0021** wedding_websites · **0022** wedding_websites_public_read
- **0023** rsvp_submissions (anon INSERT later dropped in 0039 in favor of `submit_rsvp`)
- **0024** seating_tables · **0025** seating_assignments
- **0026** budget_item_project_vendor (composite FK, `ON DELETE SET NULL (project_vendor_id)`)
- **0027** bootstrap_idempotency · **0028** project_invitations (INV-01)
- **0029** project_member_updates (INV-04; introduces `can_edit_project`; editors UPDATE
  `projects` + `guard_project_account_id`)
- **0030** vendor_category_and_status (VND-04) · **0031** vendor_target_link (VND-06)
- **0032** budget_item_vendor_many (BUD-04) · **0033** seating_dancefloor (SEAT-11)
- **0034** registry_items · **0035** registry_public · **0036** registry_claims
- **0037** registry_legacy_links_backfill
- **0038** meal_options · **0039** rsvp_attendees (`submit_rsvp`) · **0040** guest_members
- **0041** rsvp_household_access (`lookup_rsvp_household`) · **0042** website_media (WEB-IMG-01)
- **0043** rsvp_full_name_lookup (RSVP-01a) · **0044** project_archive (ARCH-01)
- **0045** calendar_events (CAL-01) · **0046** file_category (CON-01a)
- **0047** contract_templates (CON-02)
- **0048** budget_label_optional · **0049** budget_alert_dismissals
- **0050** registry_teardown (native items/claims/tab dropped; external links remain on websites)
- **0051** budget_payments (BUD-03) · **0052** payment_schedule (BUD-SCHED-01)
- **0053** files_vendor_link (`files.project_vendor_id` composite FK → `project_vendors`;
  ON DELETE SET NULL (`project_vendor_id`); contracts on booked-vendor object + Contracts
  archive; no new RLS — rides 0011 `can_access_project`)
- **0054** rsvp_gated_only (GST-04) · **0055** guest_members_backfill (GST-06)
- **0056** guest_member_relationship (GST-07) · **0057** song_requests (GST-08)
- **0058** rsvp_autopopulate (GST-09)
- **0059 seating_member_grain (SEAT-12)** — applied live + visually verified; DDL reconstructed
- **0060 calendar_project_access (CAL-02)** — ON DISK, paste-unconfirmed
- **0061 vendor_media_and_instagram (VND-11)** — ON DISK, paste-unconfirmed
- **0062 notes_action_status (NOTES-01)** — ON DISK, paste-unconfirmed
- **0063 guest_member_association (GST-12)** — ON DISK, paste-unconfirmed
- **0064 seating_sweetheart_unique (SEAT-13)** — ON DISK, paste-unconfirmed
- **0065 demo_account_clone (DEMO-01)** — ON DISK, paste-unconfirmed
- **0066 user_tours (TOUR-01)** — ON DISK, paste-unconfirmed
- **0067 commit_wedding_plan (ONB-02)** — ON DISK, paste-unconfirmed
- **0068 formality_and_vendor_priority (ONB-04)** — ON DISK; claimed LIVE VERIFIED (Dom)
- **0069 already_booked_vendor_categories (ONB-05)** — ON DISK; claimed LIVE VERIFIED (Dom)
- **0070 account_branding (WHITE-01)** — ON DISK
- **0071 write_edit_gates (WRITE-01)** — ON DISK; **LIVE VERIFIED** (`pg_policies`)
- **0072 rsvp_throttle (RSVP-THROTTLE-01)** — ON DISK
- **0073 demo_cleanup (DEMO-04)** — ON DISK
- **0074 clone_demo_throttle (DEMO-04b)** — ON DISK
- **0075 onboarding_business_no_project (ONB-06)** — ON DISK
- **0076 couple_trial_payment_method (PRICE-03)** — ON DISK (**product superseded**; residual)
- **0077 couple_trial_final_charge (PRICE-04)** — ON DISK (**product superseded**; residual)
- **0078 couple_trial_cancellation (PRICE-05)** — ON DISK (**product superseded**; residual)
- **0079 project_template_clone (TMPL-01)** — ON DISK; **committed** (`b2bf8fc`)
- **0080 outreach_gmail_thread (GMAIL-THREAD-01)** — ON DISK; committed (`ca4131f`)
- **0081 account_invitations (TEAM-01)** — ON DISK; committed
- **0082 account_invitations_business_only (TEAM-01 follow-on)** — ON DISK; committed
- **0083 account_plan (VENUE-01)** — ON DISK; committed
- **0084 payment_reminder_log (AUTO-01)** — ON DISK
- **0085 vendor_countdown_confirm (AUTO-02)** — ON DISK (anon RPC `confirm_project_vendor`)
- **0086 agent_foundation (AGENT-00)** — ON DISK (`agent_run_log` + `agent_drafts`)
- **0087 agent_unattended_write (AGENT-01a)** — ON DISK (`acted_as_user_id` + `smoke`)
- **0088 agent_drafts_outreach (AGENT-03)** — ON DISK (INSERT/UPDATE + `outreach_message_id`)
- **0089 inquiry_capture (AUTO-03a)** — ON DISK (`inquiry_slug` + `submit_inquiry`)
- **0090 inquiry_reply (AUTO-03b)** — ON DISK (`estimated_guest_count` + outreach XOR)
- **0091 accounts_member_update_grant (ACCT-GRANT-01)** — ON DISK (`GRANT UPDATE` on `accounts`)
- **0092 demo_anonymize_business_name (DEMO-ANON-01)** — ON DISK (Lumen Planning + `demo-studio` slug)
- **0093 inquiry_branding (WHITE-03)** — ON DISK (anon RPC `get_inquiry_branding`)
- **0094 automation_foundation (WORKFLOW-00)** — ON DISK (workflows / steps / runs / run_log)
- **0095 workflow_send_email (WORKFLOW-03)** — ON DISK (`send_email` + `workflow_email`)
- **0096 automation_templates (WORKFLOW-05)** — ON DISK (`template_key` + one-per-template index)
- **0097 task_assignment (TASK-ASSIGN-01)** — ON DISK (`tasks.assigned_to` + `list_project_assignees`)
- **0098 tmpl_no_amount_clone (TMPL-02)** — ON DISK (budget clone `planned_amount = 0`)
- **0099 ignored_vendor_categories (VND-13b)** — ON DISK (Still to book ignore list)

DDL for 0059–0083 is expanded in the subsections below; 0084–0099 follow those. 0001–0058 live in
`supabase/migrations/` — read those files before writing queries; do not invent columns.

### 0059 seating_member_grain (SEAT-12) — APPLIED LIVE + visually verified, DDL RECONSTRUCTED (v33)

Moves seating to the `guest_members` (person) grain:
1. Ensures `guest_members_project_id_id_key UNIQUE (project_id, id)` (FK target).
2. Adds `seating_assignments.guest_member_id` + composite FK → `guest_members(project_id, id)` ON
   DELETE CASCADE.
3. Drops household-grain unique `(project_id, guest_id)`; backfills each existing assignment to the
   household's first member; inserts remaining household members as additional assignment rows.
4. Adds unique `(project_id, guest_member_id)` (one seat per person).
5. Makes `guest_id` nullable (write-dead going forward).

**Occupancy remains action-enforced** (writers compare seated count to `seat_count`) — 0059 did not
add a structural occupancy constraint.

### 0060 calendar_project_access (CAL-02) — ON DISK (confirm paste), DDL reconstructed

Replaces the account-members-only `calendar_events` policy with **"calendar events managed by account
or project members"** — `is_account_member(account_id)` OR (`project_id is not null` AND
`can_access_project(project_id)`), both `using` and `with check`. Enables project-linked event writes
for anyone with project access (RLS). Tab visibility is separately `coupleOnly` — §6.
**Checkpoint:** `pg_policies` on `calendar_events` shows the new policy name and both clauses.

### 0061 vendor_media_and_instagram (VND-11) — ON DISK (confirm paste), DDL reconstructed

- `alter table vendors add column if not exists instagram text`
- Private bucket `vendor-media` (25MB; png/jpeg/webp/heic); authenticated SELECT/INSERT/UPDATE/DELETE
  gated by `is_account_member` on `storage.foldername(name)[1]::uuid`. **No anon policy.**
- **Checkpoint:** `vendors.instagram` column present; `storage.buckets` has `vendor-media` with
  `public=false`; four `vendor-media` object policies present.

### 0062 notes_action_status (NOTES-01) — ON DISK (confirm paste), DDL reconstructed

- `alter table notes add column if not exists action_status text`
- CHECK `notes_action_status_check`: `action_status is null or action_status in ('needs_action','done')`
- **Checkpoint:** `notes.action_status` column + CHECK present via `pg_get_constraintdef`.

### 0063 guest_member_association (GST-12) — ON DISK (confirm paste), DDL reconstructed

- Ensures `guest_members_project_id_id_key UNIQUE (project_id, id)` (idempotent with 0059).
- `member_type text NOT NULL DEFAULT 'adult'` + CHECK `adult|child`.
- `related_to_member_id uuid` nullable + composite FK `(project_id, related_to_member_id) →
  guest_members(project_id, id)` with **column-specific** `ON DELETE SET NULL (related_to_member_id)`.
- CHECK `guest_members_no_self_ref`; index on `related_to_member_id`.
- **No trigger** for chain prevention — `addGuest` writer rejects associating to a non-adult or to an
  already-associated primary.
- **Checkpoint:** columns + CHECKs + FK present; confirm `pg_get_constraintdef` on related-to FK.

### 0064 seating_sweetheart_unique (SEAT-13) — ON DISK (confirm paste)

- Partial unique index `seating_tables_one_sweetheart_per_project` on `(project_id) WHERE kind =
  'sweetheart'`. Does **not** change the kind CHECK (`standard|sweetheart|head` already allowed).
- **Checkpoint:** index present in `pg_indexes`.

### 0065 demo_account_clone (DEMO-01) — ON DISK (confirm paste)

- `accounts.is_demo` / `is_demo_template` / `demo_created_at` + CHECK not both demo and template.
- SECURITY DEFINER `clone_demo_account(p_kind text)` → authenticated; idempotent one demo account per
  `(auth.uid(), kind)`; clones a curated `is_demo_template` graph via temp `demo_id_map`.
- Clones projects, vendors, leads/proposals/templates (business), guests + members (association
  remapped in two passes), seating, budget + payments + schedule, tasks, notes, timeline, websites
  (**slug forced null, unpublished**), RSVPs, calendar. **Skips:** subscriptions, `assistant_messages`,
  `project_invitations`, `outreach_messages`. Regenerates guest `rsvp_token`s; file `storage_path`
  shared with template (no storage copy).
- **Seeds:** `supabase/seeds/demo_templates.sql` + `demo_templates_guests.sql` (hand-apply, not this
  migration).
- **Checkpoint:** columns + CHECK; `to_regprocedure('clone_demo_account(text)')`; at least one
  `is_demo_template` row per kind before treating demo CTAs as live.

### 0066 user_tours (TOUR-01) — ON DISK (confirm paste)

- Table `user_tours (user_id, tour_key, status, dismissed_at)` PK `(user_id, tour_key)`; status CHECK
  `completed|skipped`; RLS own-row for authenticated.
- **No CHECK on `tour_key`** — new keys ship in `lib/tours/tour-config.ts`, not migrations.
- **Checkpoint:** `to_regclass('public.user_tours')` + policy present.

### 0067 commit_wedding_plan (ONB-02) — ON DISK (confirm paste)

- Category CHECKs (13 canonical ids): `vendor_targets.category`; `vendors.category` (nullable);
  `files.category` (nullable); `contract_templates.category` (nullable).
- `wedding_profile.include_budget` / `include_checklist` / `include_vendors` boolean NOT NULL default
  true.
- SECURITY DEFINER `commit_wedding_plan(project_id, tasks jsonb, budget_items jsonb, vendor_targets
  jsonb)`: `can_edit_project`; reject if `onboarded_at` set; flag-gated inserts; stamp `onboarded_at`.
  Replaces the three non-atomic client inserts in `commitPlan`.
- **Checkpoint:** four CHECKs via `pg_get_constraintdef`; three `include_*` columns; function present.

### 0068 formality_and_vendor_priority (ONB-04) — claimed APPLIED + LIVE VERIFIED

- `wedding_profile.formality` nullable + CHECK (`casual|semi-formal|formal|black-tie`).
- `priority_vendor_category_ids text[] NOT NULL default '{}'` + `<@` subset CHECK vs 13 ids.
- Prompt-directive only (no code-level budget/checklist weighting).
- **Checkpoint:** columns + CHECKs; invalid category id rejected on direct insert.

### 0069 already_booked_vendor_categories (ONB-05) — claimed APPLIED + LIVE VERIFIED

- `already_booked_vendor_category_ids text[] NOT NULL default '{}'` + same `<@` CHECK pattern.
- Replaces `commit_wedding_plan`: when inserting `vendor_targets`, excludes rows whose category is in
  the already-booked list (**row-level filter**, independent of model compliance). Checklist
  suppression remains prompt-only (no category column on `tasks`).
- Preview mirrors commit: hides already-booked categories from the editable vendor list.
- **Checkpoint:** column + CHECK; direct-payload bypass test (hand-crafted already-booked category in
  payload → excluded at commit).

### 0070 account_branding (WHITE-01) — ON DISK

- Columns on `accounts`: `white_label_enabled` (default false), `brand_name`, `brand_logo_url`,
  `brand_accent_color` + CHECK business-only when enabled.
- Policy **"members update own account"** — `is_account_member` using/with check (branding writes).
- Public storage bucket `brand-media` (5MB; png/jpeg/webp) + anon/authenticated SELECT + member
  INSERT/UPDATE/DELETE on folder `account_id`.
- `get_project_branding(uuid)` SECURITY DEFINER → authenticated execute; empty when white-label off /
  not business / no project access.
- **Checkpoint:** columns + CHECK; bucket `public=true`; RPC execute grant; invited member sees brand
  in CoupleShell when enabled.

### 0071 write_edit_gates (WRITE-01) — ON DISK; **LIVE VERIFIED** (`pg_policies`, v35)

Replaces project-scoped **write** policies to `can_edit_project` (**SELECT policies untouched** on
these tables): `budget_items`, `budget_payments`, `files`, `guests`, `notes`, `payment_schedule`,
`project_vendors`, `tasks`, `timeline_events`, `vendor_targets`, `wedding_profile`,
`wedding_websites`; seating INSERT/UPDATE/DELETE; `rsvp_submissions` UPDATE/DELETE.
**`calendar_events`:** replaces the single CAL-02 `FOR ALL` policy — project branch
`can_access_project` → `can_edit_project` on both `using` and `with check` (reads+writes tighten
together; see §4 / §12).
**Skipped intentionally (already correct — confirmed live):**
- **`guest_members`** (0040): SELECT `can_access_project`; INSERT/UPDATE/DELETE `can_edit_project`.
  v34 listing this under the open write gap was wrong.
- **`rsvp_attendees`** (0039): SELECT `can_access_project`; UPDATE/DELETE `can_edit_project`; **no
  INSERT** (`submit_rsvp` only). Not a viewer write hole; 0071 header notes "no INSERT" as the
  reason it was out of scope for the rewrite pass.
Out of scope unchanged: `assistant_messages`, `outreach_messages`.
- **Checkpoint (done live):** `pg_policies` — calendar `FOR ALL` uses `can_edit_project`; guest_members
  / rsvp_attendees write cmds use `can_edit_project`; SELECT on those two remains `can_access_project`.

### 0072 rsvp_throttle (RSVP-THROTTLE-01) — ON DISK

`create or replace submit_rsvp(...)` — after household token resolve, counts recent
`rsvp_submissions` for `matched_guest_id` within 1 minute; raises `rsvp_throttled` if ≥3. Threshold
constants live only in the RPC. Gated-only + honeypot + 0058 badge write unchanged.
- **Checkpoint:** rapid submit 4th in window fails with `rsvp_throttled`; correction after window OK.

### 0073 demo_cleanup (DEMO-04) — ON DISK

- Table `demo_start_attempts` (ip_hash + created_at); RLS on, no anon/auth policies.
- `try_record_demo_start(text)` — ≤5 / IP hash / hour; service_role.
- `purge_demo_accounts()` — delete `is_demo` older than 24h (not templates); hygiene throttle rows;
  service_role.
- `purge_demo_auth_users()` — anonymous auth users >24h with no `account_members`; service_role.
- **Ops:** deploy Edge Function `purge-demo` + hourly schedule after checkpoints (see function README).

### 0074 clone_demo_throttle (DEMO-04b) — ON DISK

Replaces `clone_demo_account` to derive IP from `request.headers` XFF (leftmost), hash, and
`perform try_record_demo_start` on **every** call including idempotent return. Clone graph otherwise
as 0065.
- **Checkpoint:** throttle fires via RPC path; idempotent remint still records attempt.

### 0075 onboarding_business_no_project (ONB-06) — ON DISK

Replaces `bootstrap_account_and_project`: business → insert account + owner membership, **return
null** (no project). Personal path unchanged (account + member + one project).
`already_bootstrapped` still gates on `account_members` only.
- **Checkpoint:** planner signup lands with 0 projects; couple signup still creates one project.

### 0076 couple_trial_payment_method (PRICE-03) — ON DISK

`subscriptions.stripe_payment_method_id text` nullable (free-text Stripe id posture).

### 0077 couple_trial_final_charge (PRICE-04) — ON DISK

- `claim_couple_trial_charges()` — atomic claim of due personal trials → status `charging`; returns
  customer + payment method; service_role.
- `mark_couple_trial_charge_failed(uuid)` — fail-closed to `canceled`; service_role.
- **Ops:** Edge Function `charge-trial-balance` (hourly) — update BOTH cents constants if $99 total
  changes (`TRIAL_WEEK` / remainder).

### 0078 couple_trial_cancellation (PRICE-05) — ON DISK

- `set_couple_trial_cancellation(account_id, cancel)` — member-gated; sets `cancel_at_period_end` on
  open local couple trials (`trialing`, no `stripe_subscription_id`, period not ended).
- Replaces `claim_couple_trial_charges` to exclude `cancel_at_period_end = true`.

### 0079 project_template_clone (TMPL-01) — ON DISK; **committed** (`b2bf8fc`)

`clone_project_template(source, target)` — same-account, member-gated; rejects if target already has
tasks/budget_items/vendor_targets. Originally copied task title/phase/position; budget
category/label/planned_amount; vendor_targets category only. **Superseded for amounts by TMPL-02
(0098):** planned_amount is now always `0`. **0097** also forces `assigned_to` null on copy.
No dates/status/actuals/vendor links/assignees/dollar estimates.
- **Checkpoint:** New wedding with template source seeds empty project; re-clone raises already-has-data;
  budget lines show `$0` planned.

### 0080 outreach_gmail_thread (GMAIL-THREAD-01) — ON DISK

`alter table outreach_messages add column if not exists gmail_thread_id text`. Nullable; no
backfill — legacy rows stay null. No RLS change (rides existing outreach policies). App persists
Gmail `threadId` from `users.messages.send` and renders a "View in Gmail" link on outreach history.
- **Checkpoint:** send a message → row has `gmail_thread_id`; link opens
  `https://mail.google.com/mail/u/0/#all/{threadId}`.

### 0081 account_invitations (TEAM-01) — ON DISK

- Replaces `account_members` SELECT "see own memberships" with fellow-member
  `is_account_member` policy.
- `list_account_members(uuid)` DEFINER → authenticated.
- Table `account_invitations` + unique live-invite index + four member policies.
- `accept_account_invitation(text)` / `remove_account_member(uuid, uuid)` DEFINER.
- **Checkpoint:** `to_regclass('public.account_invitations')`; fellow member visible; last-member
  remove raises `cannot_remove_last_member`.

### 0082 account_invitations_business_only (TEAM-01 follow-on) — ON DISK

Tightens INSERT `with check` to `is_account_member AND accounts.kind = 'business'`. Replaces
`accept_account_invitation` with an in-body kind check (`invitation_not_business`). Same posture
as WHITE-01's business-only CHECK — do not trust the action alone (DEFINER bypasses RLS).
- **Checkpoint:** personal-account INSERT rejected by RLS; accept on a non-business invite raises
  `invitation_not_business`.

### 0083 account_plan (VENUE-01) — ON DISK

`accounts.plan` text NOT NULL default `'planner'` + `accounts_plan_values` CHECK (`planner|venue`)
+ `accounts_plan_business_only` CHECK (`plan = 'planner' OR kind = 'business'`).
- **Checkpoint:** personal + `plan='venue'` rejected; default on existing rows is `'planner'`.

### 0084 payment_reminder_log (AUTO-01) — ON DISK

`payment_reminder_log` table; RLS on, zero policies; CHECK on `reminder_kind`; partial unique
index `payment_reminder_log_oneshot_idx` for `due_7` / `due_2` / `overdue_first`. Recurring
overdue is **not** in that index.
- **Checkpoint:** `to_regclass('public.payment_reminder_log')`; insert a second `due_7` for the
  same installment is rejected; a second `overdue_recurring` is allowed.

### 0085 vendor_countdown_confirm (AUTO-02) — ON DISK

`project_vendors` columns: `arrival_time`, `scope_note`, `confirm_token` (unique, NOT NULL,
gen_random_bytes default), `confirmed_at`, `last_reminder_sent_at`, `last_reminder_kind` CHECK.
RPC `confirm_project_vendor(p_token text)` SECURITY DEFINER, granted to anon + authenticated.
Invalid token raises `invalid_confirm_token` with no payload.
- **Checkpoint:** `to_regprocedure` for the RPC; unique index on `confirm_token`; anon SELECT on
  `project_vendors` still absent.

### 0086 agent_foundation (AGENT-00) — ON DISK

`agent_run_log` + `agent_drafts`. Run log: service-role only. Drafts: authenticated SELECT via
`is_account_member`; composite project FK with column-specific SET NULL; pending-per-target
unique index. No authenticated INSERT/UPDATE in this file (those arrive in 0088). `project_id`
was NOT NULL here; 0089 relaxes it.
- **Checkpoint:** `to_regclass` both tables; `pg_policies` shows SELECT only on `agent_drafts`.

### 0087 agent_unattended_write (AGENT-01a) — ON DISK

`agent_run_log.acted_as_user_id` uuid FK → `auth.users`. `trigger_kind` CHECK gains `'smoke'`.
No RLS change.
- **Checkpoint:** column exists; `'smoke'` accepted; previous kinds still accepted.

### 0088 agent_drafts_outreach (AGENT-03) — ON DISK

`agent_drafts.outreach_message_id` uuid FK → `outreach_messages` ON DELETE SET NULL.
Authenticated INSERT + UPDATE policies, both `is_account_member`. Required so impersonated
`create_agent_draft` and human approve/reject work under RLS.
- **Checkpoint:** `pg_policies` shows SELECT + INSERT + UPDATE; invited project members still
  cannot see rows (no `account_members`).

### 0089 inquiry_capture (AUTO-03a) — ON DISK

`accounts.inquiry_slug` + format CHECK + business-only CHECK + unique partial index.
`agent_run_log.project_id` drops NOT NULL; adds `account_id` + `lead_id` + scope CHECK.
`inquiry_form_attempts` (hashed IP; zero policies). RPC `submit_inquiry(...)` SECURITY DEFINER,
anon+authenticated execute. Threshold constants only in the RPC. Inserts `leads` with
`source = 'form'`. 0090 replaces this RPC body to also persist `estimated_guest_count`.
- **Checkpoint:** `to_regprocedure` for `submit_inquiry`; personal-account slug rejected;
  honeypot / throttle raise `inquiry_rejected` / `inquiry_throttled`.

### 0090 inquiry_reply (AUTO-03b) — ON DISK

`leads.estimated_guest_count` + CHECK. `outreach_messages.project_vendor_id` nullable;
`lead_id` added; XOR CHECK; lead index. Outreach RLS replaced: vendor branch
`can_access_project_vendor`, lead branch `is_account_member`. `submit_inquiry` replaced in
place to write the guest-count column.
- **Checkpoint:** vendor-only outreach row still valid; lead-only row valid; both-set /
  neither-set rejected; `pg_policies` on `outreach_messages` shows the dual gate.

### 0091 accounts_member_update_grant (ACCT-GRANT-01) — ON DISK

`grant update on table accounts to authenticated;` No RLS change. Fixes member writes
(branding, `inquiry_slug`) that failed with "permission denied for table accounts" before
RLS ran.
- **Checkpoint:** `information_schema.role_table_grants` shows UPDATE for `authenticated` on
  `accounts`; a member `updateAccountBranding` / `ensureInquirySlug` member-client write
  succeeds after paste.

### 0092 demo_anonymize_business_name (DEMO-ANON-01) — ON DISK

Backfill: rename existing `is_demo` business clones that still match the demo-template name
(or literally `'Events by Jordyn'`) to **Lumen Planning**; null leaked `inquiry_slug`s that
aren't `demo-studio` / `demo-studio-*`. Trigger `anonymize_demo_business_account` BEFORE
INSERT on `accounts` when `is_demo AND kind = 'business'` forces `name := 'Lumen Planning'`.
Does **not** rename the real (non-demo) Events by Jordyn account.
- **Checkpoint:** a fresh business demo clone is named Lumen Planning; `inquiry_slug` is
  `demo-studio` (or `demo-studio-*`); the live Events by Jordyn row is unchanged.

### 0093 inquiry_branding (WHITE-03) — ON DISK

SECURITY DEFINER `get_inquiry_branding(p_slug text)` → table of `account_found`, `brand_name`,
`brand_logo_url`, `brand_accent_color`. Granted to anon + authenticated. Unknown / non-business
slug → `account_found = false` and null brands. Found + white-label off → `account_found =
true` and null brands. Found + white-label on → the three brand columns. Never returns
`account_id`.
- **Checkpoint:** `to_regprocedure('get_inquiry_branding(text)')`; unknown slug renders
  invalid-link UI **before** submit; white-labeled account shows logo/name/accent; white-label
  off shows First Look Wordmark.

### 0094 automation_foundation (WORKFLOW-00) — ON DISK

Tables: `automation_workflows`, `automation_steps`, `automation_runs`, `automation_run_log`.
Workflows/steps/runs: authenticated CRUD via `is_account_member` (steps resolve account
through `workflow_id`). Run log: RLS on, zero policies. CHECKs on trigger_kind / action_kind /
target_kind / run status / log outcome. Unique `(workflow_id, position)`. `target_id` has no
FK. This file does **not** add `send_email` or `template_key`.
- **Checkpoint:** `to_regclass` all four; `pg_policies` on workflows/steps/runs; run_log has
  zero anon/authenticated policies.

### 0095 workflow_send_email (WORKFLOW-03) — ON DISK

Replaces `automation_steps.action_kind` CHECK to include `send_email`. Replaces
`agent_drafts.kind` CHECK to include `workflow_email`. No new columns. `action_config` carries
`{ subject, body }`.
- **Checkpoint:** inserting a step with `action_kind = 'send_email'` succeeds; a
  `workflow_email` draft inserts; previous kinds still accepted.

### 0096 automation_templates (WORKFLOW-05) — ON DISK

`automation_workflows.template_key text` nullable. Partial unique
`automation_workflows_one_per_template` on `(account_id, template_key) WHERE template_key is
not null`. No CHECK on the key — values live in `lib/automations/templates.ts`.
- **Checkpoint:** flipping a template on twice does not create a second row; a hand-built
  workflow keeps `template_key` null.

### 0097 task_assignment (TASK-ASSIGN-01) — ON DISK

`tasks.assigned_to uuid` FK – `auth.users` ON DELETE SET NULL. Index
`tasks_project_assigned_idx` on `(project_id, assigned_to)`. RPC `list_project_assignees(uuid)`
DEFINER – authenticated. Rewrites `clone_project_template` + `clone_demo_account` to null
`assigned_to` on task copy. No new RLS on `tasks`.
- **Checkpoint:** `to_regprocedure('list_project_assignees(uuid)')`; assign a teammate; filter
  board by assignee; clone a template – assignees null.

### 0098 tmpl_no_amount_clone (TMPL-02) — ON DISK

Replaces `clone_project_template`: budget insert is category + label with `planned_amount = 0`
(never copy source dollars). Tasks still null `assigned_to`; vendor_targets unchanged.
- **Checkpoint:** New Booking from a template with non-zero planned lines yields `$0` planned
  on the new project.

### 0099 ignored_vendor_categories (VND-13b) — ON DISK

Table `ignored_vendor_categories` + unique `(project_id, category)` + category CHECK (13 ids) +
RLS SELECT/INSERT/DELETE (no UPDATE). Powers Still to book dismiss on the Vendors Outreach tab.
- **Checkpoint:** `to_regclass('public.ignored_vendor_categories')`; Ignore hides a budget-
  mapped category from Still to book; Un-ignore restores it; booked categories stay out.

**Verified against disk:** TEAM-01 / VENUE-01…07 / PRICE-07/08 / GMAIL-THREAD / VND-12 /
LEAD-STALE / ENT-01a / OVERDUE-01 / CHECKOUT-RECONCILE-01 / TRIAL-GUARD-01 / WHITE-02 / WHITE-03 /
ONBOARD-NUDGE-01 / MKT-01…03 / AUTO-01/02 / AGENT-00/01/01a/02/03 / AUTO-03a/03b /
ACCT-GRANT-01 / LEAD-EDIT-01 / INQUIRY-EMBED-01 / DEMO-ANON-01 / WORKFLOW-00…05 / AUTH-GOOGLE-01 / CONTACT-ROUTE-01 / TASK-ASSIGN-01 / TMPL-02 / VND-13 / VND-13b / VND-LIB-01 / CON-ARCHIVE-01 / VND-16 / VENUE-08 / CAL-05 / INV-06 / TEAM-EMAIL-01 / EMAIL-BRAND-01.
0070–0083 DDL on disk **and committed**; **0071 live** on
calendar / guest_members / rsvp_attendees; **`isTaskPastDue` single-sourced** for task overdue.
**0084–0099 on disk.** **Confirm live:** remaining pastes of
0060–0070 / 0072–0099; Edge Function `purge-demo` deploy; demo seeds; Stripe test Checkout
for couple monthly/lifetime + planner + venue (plan flip); Vercel Cron env + schedules;
Resend inbound domain + webhook secret; `SUPABASE_JWT_SECRET`.

### Column reference (current)

**`guest_members.member_type` / `related_to_member_id`** (0063). **`notes.action_status`** nullable
text + CHECK (0062). **`vendors.instagram`** nullable text (0061). **`wedding_websites.content`**
jsonb carries section order + layout / image-shape. **Seating:** member-grain assignments (0059) +
one-sweetheart-per-project index (0064). **`accounts` demo flags** (0065) + **branding columns**
(0070) + **`plan`** (0083) + **`inquiry_slug`** (0089). **`user_tours`** (0066) — page-tour keys plus
ONBOARD-NUDGE-01 storage keys. **`wedding_profile.include_*`** (0067); **`formality` /
`priority_vendor_category_ids`** (0068); **`already_booked_vendor_category_ids`** (0069).
**`wedding_profile.traditions` write-dead** (POLISH-01 — column retained).
**`subscriptions.stripe_payment_method_id`** (0076 — residual). **`demo_start_attempts`** (0073).
**`outreach_messages.gmail_thread_id`** (0080) + **`lead_id` / nullable `project_vendor_id`** (0090).
**`account_invitations`** (0081). **`payment_reminder_log`** (0084). **`project_vendors.arrival_time`
/ `scope_note` / `confirm_token` / `confirmed_at` / `last_reminder_*`** (0085). **`agent_run_log`**
(0086) + **`acted_as_user_id`** (0087) + **nullable `project_id` / `account_id` / `lead_id`** (0089).
**`agent_drafts`** (0086) + **`outreach_message_id`** (0088) + **`kind` includes `workflow_email`**
(0095). **`inquiry_form_attempts`** (0089).
**`leads.estimated_guest_count`** (0090). **`automation_workflows` / `automation_steps` /
`automation_runs` / `automation_run_log`** (0094) + **`template_key`** (0096).
**`tasks.assigned_to`** (0097). **`ignored_vendor_categories`** (0099).

**No-migration slices (complete list):** DASH-01; DASH-02; DASH-03; CON-01; CON-04; budget row
polish; BUD paid/actual ramp polish; BUD-FILTER-01; BUD-QUICKADD-01/02; BUD-NOTES-01; GST-03;
WEB-EDITOR-02; WEB-STYLE-01; RSVP-02; FIX-02; ASSIST-UI-01; CAL-03; CAL-04; Gmail reconnect
hardening; ONB-03; POLISH-01; DEMO-02 / DEMO-03; tour UI; AGR-01; ENT-01; ENT-01a; PRICE-01;
PRICE-02; PRICE-06; PRICE-07; PRICE-08; VENUE-02/02b/03; VENUE-04; VENUE-05; VENUE-06; VENUE-07;
CHECKOUT-RECONCILE-01; TRIAL-GUARD-01; VND-12; LEAD-STALE-01; OVERDUE-01; HYG-01; HYG-01a;
WEB-REVAL-01; ASSIST-BUD-01; WHITE-02; ONBOARD-NUDGE-01; MKT-01; MKT-02; MKT-03; AGENT-01;
AGENT-02; LEAD-EDIT-01; INQUIRY-EMBED-01; WORKFLOW-01; WORKFLOW-02; WORKFLOW-04; AUTH-GOOGLE-01; CONTACT-ROUTE-01; VND-13 (UI); VND-LIB-01; CON-ARCHIVE-01; VND-16; VENUE-08; CAL-05; INV-06; TEAM-EMAIL-01; EMAIL-BRAND-01; VND-OUTREACH-MOBILE-01.

---

## 6. Shell & routing

One login. `lib/post-login-path.ts` routes by account kind **after entitlement**:
- Unentitled account → `/account/locked` (ENT-01 / **ENT-01a**) — lock screen is Tier 2 full-bleed
  in `app/(locked)/` (no couple/planner chrome). **`(app)/layout` must not branch on pathname.**
- **Planner (business):** `/dashboard`, `PlannerShell` + `PlannerProjectSidebar`. Venue +
  white-label may brand the shell (`getOwnAccountBranding`).
- **Couple (personal):** into their project workspace (`CoupleShell`), gated by onboarding.
- **Invited member (no account):** into the invited project via `/projects` (no entitlement gate —
  no account).
- **Team invitee (no membership yet):** `/invite/account/[token]` → cookie → login/signup →
  `consumePendingAccountInvite` → `getPostLoginPath` (now a business member).

**Demo (DEMO-03 / DEMO-04):** when `account.isDemo`, app layout mounts a single non-dismissible
`DemoBanner` (`bg-accent-wash` — not an accent flood). Demo visitors arrive via marketing CTA →
server-brokered `startDemoAction` → `/projects`. Demo accounts are entitled (`status: "demo"`).

**Tours (TOUR-01):** project layout loads dismissed `tour_key`s and wraps children in `TourProvider`;
`TourHelpButton` (`?`) on covered tabs for manual replay.

**Branding (WHITE-01 + VENUE-01):** project layout resolves `getBrandingForProject`; CoupleShell
shows planner logo/name and may override `--accent` for invited viewers. PlannerShell white-labels
**only** for venue + `white_label_enabled` (`getOwnAccountBranding`). Ordinary planner chrome stays
First Look.

### Planner sidebar nav

**Dashboard / Calendar / Leads (venue: Inquiries) / Automations / Vendors / Contracts / Team / Branding / Billing**
— all business-account-kind gated, never `project_members.role`. **Automations** is `/automations`
(WORKFLOW-04/05) — hardcoded label `"Automations"` (not yet in `getCopy`; venue-copy can wrap
later). **Team** is `/account/team`
(TEAM-01). Venue display labels come from `getCopy(key, account.plan)` (VENUE-07) — routes stay
`/leads`, `/projects`, etc. **`/account/venue-upgrade`** is reachable from: the welcome-screen
venue option (VENUE-06), the lock screen (business-kind), and Billing's equal-weight Upgrade card.
Gate remains business-membership-only — no project count, no entitlement check — reachable by a
zero-project, zero-subscription business account immediately post-bootstrap. **VENUE-05:** the page
also offers "Start your 7-day free trial" alongside Monthly/Annual Subscribe, calling the identical
`startPlannerTrial()` used by `/account/locked`. Trial does not set `accounts.plan='venue'` — it
stays `'planner'` through the trial; plan only flips on a confirmed paid subscription. The page
does not redirect an already-trialing or already-subscribed account away — Subscribe remains
visible during trial as the upgrade path to paid venue. **ONBOARD-NUDGE-01:** when `plan='venue'`,
a one-time "Your venue plan is live" card offers Branding + Team with per-row Not now; dismissed
via `user_tours`. Not a sidebar item.

### The signup → workspace path

```
signup (auth.signUp only — NO bootstrap here)
  → email confirm → /auth/callback → exchangeCodeForSession
  → consumePendingInvites  ← INV-05 (project) + TEAM-01 (account)
  → getPostLoginPath → entitlement check → else getAccountContext:
      no account_members row      → /projects  ← THE terminal decision point
      kind = business             → /dashboard  (ONB-06: may have 0 projects)
      personal + firstProjectId   → getCoupleDestinationPath
      personal + 0 projects       → /projects
      not entitled                → /account/locked
```

### `/projects` — the only terminal routing decision point

| account context | direct projects | → |
|---|---|---|
| `null` | 0 | `OnboardingForm` (bootstrap) |
| `null` | 1 | `/projects/{id}` — no onboarding gate |
| `null` | >1 | minimal Card list |
| `personal` | — | `getCoupleDestinationPath(firstProjectId)` |
| `business` | — | `/dashboard` |

A **three-option** welcome (VENUE-06): "We're a couple" / "I'm a planner" / "I run a venue" —
equal weight, `sm:grid-cols-3`. Couple → `bootstrapAccountAndProject` (`kind=personal`). Planner →
same action (`kind=business`). Venue → `bootstrapAccountWithVenueIntent` (still `kind=business`,
`venueIntent: true`) and redirects to `/account/venue-upgrade` on success instead of `/dashboard`.
Abandoning that Checkout returns to `/account/venue-upgrade?status=cancelled` (pre-existing
`cancel_url`). Name field label/placeholder swaps for venue ("Venue name"). There is still no
`accounts.kind='venue'`.

> **`plannerOnly` resolves from ACCOUNT KIND, never from `project_members.role`.** CAL-04 / CAL-06
> is the only role-aware tab exception (Calendar for invited couples and collaborators).

### Invitation acceptance path (INV-05 + INV-08 + TEAM-01 + INV-06 / TEAM-EMAIL-01)

**Project:** `/invite/[token]` middleware sets `pending_invite_token` cookie [httpOnly, 30 min];
authenticated → `acceptProjectInvitation(token)`. Token MUST NOT resolve before authentication.
INV-08 closed the Next 16 cookie-write crash — do not move the write back into `InvitePage`.
**INV-06:** after creating the invitation row, best-effort Resend via `sendEmailBestEffort`; UI
shows sent vs share-link fallback. One-time link remains always available.

**Account (TEAM-01):** `/invite/account/[token]` is matched **before** `/invite/` in middleware
(otherwise `account` would be parsed as a project token). Sets `pending_account_invite_token`
(same cookie options, **different name** so both can queue). `consumePendingInvites` runs both
consumers in parallel on login + auth callback. Project success redirects to the project; account
errors redirect to `/invite/account/{token}?error=`; account success falls through to
`getPostLoginPath` (membership now exists). Do not set either cookie from a page render.
**TEAM-EMAIL-01:** same best-effort Resend pattern as INV-06 after creating the account invitation.

### Dashboard — Urgent + wedding cards (DASH-01 + DASH-03)

**DASH-01** Urgent grouped by wedding — collapsible per-wedding cards, `activeProjectIds`-scoped —
unchanged. **DASH-03** adds planner **wedding cards** (`components/dashboard/wedding-cards.tsx` via
`buildWeddingCardModels` in `lib/dashboard-aggregates.ts`): initials, date/countdown, confirmed-guest
count (`guests.rsvp_status = attending`), sage/rosewood task progress via `lib/task-overdue.ts`
(`isTaskPastDue`), Archive + Enter. Active cards / archived list toggle in
`dashboard-wedding-list.tsx`. Planner-only surface (personal accounts still redirect away from
`/dashboard`). **TMPL-01/02:** New wedding form may clone checklist/budget/vendor-target structure from
another active project on the same business account.

> **DASH-03 caveats (session-authored slice — see §7 provenance exception).**
> - **Confirmed-guest count is household-badge grain** (`guests.rsvp_status = 'attending'`) — a new
>   consumer of the same overcount the guest summary band has: multi-person households count once by
>   badge, so the number reads slightly low vs a per-person headcount. Consistent, deliberate, NOT a
>   bug — do not "fix" it on the card.
> - **Archive moved onto the card** (the in-session slice was Enter-only; the freeform pass added
>   card-level Archive). Fine, but it puts a mutation one click from the active-scoping boundary — the
>   §15 walk item "archived project leaves the ACTIVE grid AND archived ids stay out of the guest/task
>   aggregates" now matters *more*, not less. Keep that assertion live.

### Shared project workspace

`app/(app)/projects/[projectId]/layout.tsx`: tabs from `lib/project-tabs.ts`, audience-gated by
`account.kind` (pass `null` for invited members — do **not** collapse null→personal). Passes
`projectMemberRole` for the CAL-04 / CAL-06 Calendar exception.

**Exact membership + order** (`lib/project-tabs.ts`):
- **personal:** Overview · **Calendar** · Checklist · Budget · Vendors · Guests · Website · Seating ·
  Day-of timeline · **Contracts (`agreements`)** · Notes & files
- **business:** Overview · Checklist · Budget · Vendors · Guests · Website · Seating · Day-of timeline
  · Contracts · Notes & files · Access
- **null + role `couple` (invited couple):** personal set **minus** couple Contracts (`agreements`);
  **Calendar included via CAL-04**
- **null + role `collaborator` (invited collaborator):** personal set **minus** couple Contracts
  (`agreements`); **Calendar included via CAL-06**
- **null (other kind-null roles):** personal set **minus Calendar** and **minus** couple Contracts

**Registry is NOT a workspace tab.** Public registry + claims remain anon surfaces; outbound registry
links live under Website / `external_registry_links`.

> **Calendar tab gating — CAL-04 (v35) + CAL-06.** Base flag remains `coupleOnly` (personal owners).
> **Invited `couple` and `collaborator` members also see Calendar** when `kind === null` and
> `projectMemberRole` is `"couple"` or `"collaborator"`. Other kind-null roles do not. This is the
> **only** tab gate that reads `project_members.role` — do not casually extend the pattern to other
> tabs. Couple Agreements stays personal-only (no role exception). CAL-02/WRITE-01 RLS: project-linked
> events writable by `can_edit_project` editors (account members + couple/collaborator project
> members). RLS already permitted collaborator reads/writes; CAL-06 closes the UI gap.

#### Checklist tab (TASK-ASSIGN-01)

Phase groups + recessed task rows. Per-task **AssigneeChip** (initials + picker grouped by
role). Board filter: all / unassigned / person (`list_project_assignees`). `assignTask` is the
only mutation that writes `assigned_to`. Template/demo clones never copy assignees.

#### Overview (DASH-02 + ASSIST-UI-01)

Shared `ProjectOverview` (`components/dashboard/project-overview.tsx`) powers couple + planner project
dashboards. **ASSIST-UI-01:** a raised card with a **recessed** `AskAssistantPrompt` ("What should I
tackle next?") sits under the stat row; the vendor-empty state also invites the assistant (no nested
raised `EmptyState`). Suggested-path steps omit Overview + Calendar (personal work-step launcher).

#### Vendors tab (VND-13 / VND-13b + outreach + booked)

Project Vendors is three query tabs (`?tab=search|outreach|booked`, default `search`):
- **Search** — Places discover only (needed-target rail removed from search).
- **Outreach** — Gmail outreach + **Still to book** (`VendorsToBookSection`) + shortlist.
  Still to book = budget categories mapped via `mapBudgetCategoryToVendorCategory` that are
  not already booked and not in `ignored_vendor_categories`. Ignore / Un-ignore; "Find vendors"
  jumps to Search. `vendor_targets` still used for booked slots / outreach category linking —
  **not** as the To Book source.
- **Booked** — booked band with arrival/scope (**AUTO-02**) + **Copy confirm link** (VND-16).
Mobile outreach chrome keeps actions + status filters on one scrollable line
(VND-OUTREACH-MOBILE-01). Checklist empty/vendor empty states still offer `AskAssistantPrompt`.

#### Guests tab (GST-03…09 + GST-12)

Flat one-line-per-person display (`GuestPersonList` / `GuestRow`) over the preserved household tier;
per-person relationship + derived partner-side; **Adult/Child + optional "Guest of" association
(GST-12)** on create — associated path inserts into an existing household (no new `guests` row);
association sublabel (`{Primary}'s child` / `{Primary}'s Guest`); **no post-create edit** of
`member_type` / `related_to`. Household address + phone (email UI-deprecated); RSVP dropdown
(`updateRsvp`) with household badge as authoritative shown status; no Headcount; single Add Guest;
event-level song requests (**Requested so far** list on `SongRequestsCard`); gated submit
auto-populates the badge; responses panel is a record, not an inbox. **RsvpAccessCard removed** (no replacement card). Meal column when `meal_service_style ===
plated`; selectable styles no longer include `none` for new config (legacy `none` still editable if
stored). **ASSIST-UI-01:** empty list `EmptyState` includes `AskAssistantPrompt`.

#### Notes & files tab (NOTES-01)

Preview-card grid (`NotesBoard` / `NotePreviewCard`) → modal editor (`NoteModal`). Optional
`action_status`: rosewood dot for `needs_action`, sage "Done" pill for `done`; pin-sort needs-action
first, then `updated_at` desc. Empty notes `EmptyState` includes `AskAssistantPrompt` (draft a note).
Files unchanged (`FileManager`).

#### Couple Agreements tab (AGR-01)

`/projects/[id]/agreements` — personal-only Contracts surface for `files.kind = 'contract'` (same
`FileManager` / category controls as planner project Contracts). Invited members do not see the tab.

#### Seating tab (SEAT-12 + SEAT-13)

Seats assign at the `guest_members` (person) grain. Own SVG drag / click-to-place / arrow-nudge (not
@dnd-kit). **SEAT-13:** at most one sweetheart table per project (0064 + `setSeatingTableKind`
demote); empty sweetheart defaults to 2 seats; canvas labels sweetheart by form/text (accent stroke),
never status colour. Occupancy action-enforced (§5).

#### Website editor tab (WEB-EDITOR-02 / WEB-STYLE-01 + WEB-REVAL-01)

`website/` editor: `page.tsx` (server read of the site + `content` jsonb) → editor with a **sticky side
preview** pinned while editing (renders `components/website/` with injected props only — no server
imports). Sections can be **reordered via up/down buttons** (not @dnd-kit) and **collapsed** per
section (the shared chevron/collapse affordance, §10); order + per-section options persist in `content`
jsonb. **Image border-shape options** and **timeline layout options + visitor-facing centering** are
per-section style props in `content`, rendered Tier 3 on the public site. `FIX-02` corrected the meal
dropdown white-text contrast. Publish/slug mutations **revalidate** public `/w/[slug]` (+ RSVP).
(Tab is labelled "Website"; the route/editor is `website/`.)

#### Public gated RSVP intake (`/w/[slug]/rsvp`) — RSVP-02 + RSVP-THROTTLE-01

Renders the **gated** intake only (household lookup → the form). Per the meal service style: **plated**
→ per-attendee rows (name → meal → dietary), with a **song box under meal** when `song_requests_enabled`;
**buffet/family/stations** → optional per-attendee rows, **forced open** when songs are on;
**`style=none`** → household block, no attendee rows, no song UI. **RSVP-02:** the guest-facing "how
many attending" number is **gone** (headcount derives from seat toggles / attendee rows), and **email
is no longer required** (form-field removal; column nullable since 0023). `submit_rsvp` still writes the
submission + attendees, persists songs only when the toggle is on, derives `party_size` server-side,
sets the household badge, and **rejects rapid-fire spam** (≤3 / household / 1 minute).

### Account-scoped planner surfaces

`/leads` (**LEAD-STALE-01** rosewood inactivity pill; **AUTO-03b** clay reply-ready / retry-send
badge on the card — click opens `InquiryReplyDrawer` reusing `PendingDraftList`; **WORKFLOW-03**
extends that drawer to `workflow_email` drafts (kind-aware title); **LEAD-EDIT-01**
Edit button → shared `Modal`; **AUTO-03a / INQUIRY-EMBED-01** `InquiryIntakeCard` with copyable
form link + iframe embed snippet — inbound-DNS copy is **not** shown),
`/automations` (**WORKFLOW-04/05** — template gallery + hand-built list; `/automations/new` and
`/automations/[workflowId]` editor; personal accounts redirect away),
`/account/billing` (planner plan gets an equal-weight Upgrade-to-Venue card — VENUE-06;
**VENUE-08:** paid venue plan sees a cadence pricing card instead),
**`/account/team` (TEAM-01)**, **`/account/branding` (WHITE-01 + WHITE-02 picker/contrast + WHITE-03
inquiry-embed copy)**,
**`/account/venue-upgrade` (VENUE-02 / VENUE-05 / VENUE-06 / ONBOARD-NUDGE-01)**, `/vendors`
(VND-08/08a + **VND-11 detail/portfolio** + **VND-12 card grid** + **VND-LIB-01** delete/unlink),
`/calendar` (CAL-01 + **CAL-03 hues/chips/legend** + **CAL-05 detail modal**), `/contracts`
(CON-01/01a/02 + **CON-04 generate** + **CON-ARCHIVE-01** archive delete / edit-in-project). Couple project Calendar is
under the project workspace (`/projects/[id]/calendar`, CAL-02/WRITE-01 RLS; **tab = personal +
invited couple**, §6). Shared calendar chrome: `CalendarEventChip`, `CalendarLegend`,
`CalendarEventDetailModal` (**CAL-05** — when / wedding / overdue / location / notes / deep links /
Edit for authored), `lib/calendar-hues.ts` (`--cal-w-1…5` categorical wedding/kind tints —
not status colours; hue spread retuned >=50 degrees).
**Assistant panel Pending section** (`PendingDraftList`) reviews AGENT-03 vendor-outreach drafts
on the project; inquiry-reply **and workflow-email** drafts review on `/leads`, not in the project panel.

### Public surfaces (no auth, outside `(app)`)

`app/w/[slug]`, `/w/[slug]/rsvp`, `/w/[slug]/registry`, `/invite/[token]`, **`/invite/account/[token]`**,
**`/vendor-confirm/[token]` (AUTO-02)**, **`/inquire/[slug]` (AUTO-03a + WHITE-03 — Tier 2: one deep
field + raised form card; white-label logo/accent when enabled; invalid slug is pre-submit)**. Marketing `/` **(MKT-01 planner/venue-first)** + **`/for-planners` (MKT-02)** +
**`/for-venues` (MKT-03)** + `/pricing`. Login/signup offer **Continue with Google**
(AUTH-GOOGLE-01). Marketing copy must not lead with "AI." Entitlement lock:
`/account/locked` (authenticated, **`(locked)` group**).

---

## 7. Features built

Pattern: a folder under the relevant scope with `page.tsx` (server read) + `actions.ts` (`'use server'`
writes by id + `revalidatePath`); RLS authorizes.

Version headings below are **historical organization inside this document**, not pointers to other
files. Every shipped slice the product depends on is described here.

### Foundation (migrations 0001–0058)

**Tenancy & shells.** One app, one auth, one data model. Personal account = one project (couple);
business account = many projects (planner). Invited project members have no account — `project_members`
only (`couple` | `collaborator`; `viewer` exists on the enum but is not issued). CoupleShell vs
PlannerShell differentiated by routing + `account.kind` tab gates. Signup is `auth.signUp` only;
bootstrap happens on `/projects` (ONB-00 / ONB-06).

**Couple planning workspace.** 6-step onboarding → AI starting plan (`commit_wedding_plan`). Checklist
(`tasks`), budget (`budget_items` + `budget_payments` ledger + `payment_schedule` waterfall; Paid is
ledger-only), vendors (`vendors` account-scoped + `project_vendors` links + outreach via Gmail),
guests as a flat person-line over a household tier (GST-03…09), notes + files, day-of timeline +
printable run sheet (HTML/`window.print()`, no PDF lib), seating canvas (own SVG drag, not @dnd-kit)
through dancefloor (SEAT-11) then member-grain (SEAT-12), public wedding website (5 templates,
photo-led gallery, gated RSVP, registry as website sub-page — **not** a workspace tab). Gift registry
native items/claims were torn down (0050); external registry links remain on the site.

**Planner CRM.** Leads kanban (@dnd-kit **here only**), proposals → accepted agreement → printable
contract, Access tab (project invitations INV-01…08), archive (`set_project_archived`), account Vendor
library, authorable Calendar (CAL-01), cross-project Contracts archive + templates (CON-01/01a/02).
Dashboard Urgent-by-wedding (DASH-01).

**Billing foundation.** `subscriptions` row is the source of truth, updated by the Stripe webhook.
Local trials and paid Checkout are PRICE-* (see later in this section). Entitlement lock: `/account/locked`.

**Invites.** Project: hashed token, middleware cookie `pending_invite_token`, `/invite/[token]`.
Account Team seats came later (TEAM-01) — parallel, not a fork.

**Design.** Soft stack (STYLE-01 / C1). Landing overhaul LAND-01 + shared `formatWeddingDate` (LAND-01a).

**Slice IDs from this era still in force:** INV-01…08, VND-04/06/08/08a, BUD-02/03/04, BUD-SCHED-01,
BUD-FILTER-01, BUD-QUICKADD-01/02, BUD-NOTES-01, GST-03…09, SEAT-01…11, CAL-01, CON-01/01a/02,
ARCH-01, DASH-01, WEB-IMG-01, RSVP-01a, STYLE-01, LAND-01/01a, MEAL options (0038). Native registry
teardown is 0050 — do not resurrect items/claims/tab.

### v31 — Website-tab polish + per-member seating

WEB-EDITOR-02 / WEB-STYLE-01 / RSVP-02 / FIX-02 (no schema) + SEAT-12 / **0059**. Visually verified;
0059 DDL reconstructed in §5.

- **WEB-EDITOR-02** — Section reorder via up/down buttons (not @dnd-kit); collapsible section editors
  (shared chevron); sticky side preview rendering `components/website/` with injected props only.
  Order + per-section options persist in `wedding_websites.content` jsonb.
- **WEB-STYLE-01** — Image border-shape options; timeline layout + visitor-facing centering. Stored
  in `content`, rendered Tier 3.
- **RSVP-02** — Guest-facing self-report headcount removed (count derives from seat toggles /
  attendee rows); email no longer required on the form (column nullable since 0023).
- **FIX-02** — Meal `<select>` white-text contrast on the public RSVP form.
- **SEAT-12 / 0059** — Seating assignments move to `guest_members` (person) grain. One seat per
  person; occupancy still action-enforced.

### v32 — Notes action status + in-page assistant + migration catch-up

> **Provenance (repeat of the header note):** the v32 slices were built in **Cursor outside a Claude
> session**; the entries were **reconstructed from code/migration files, not authored from
> working-session reasoning**. Facts (DDL, file existence) are reliable; "why"/"Decided" notes are
> reconstructed and adopted-for-now. **Confirm 0060–0062 hand-pastes** before treating schema as live.

#### NOTES-01 — Notes action lifecycle. Migration **0062** (on disk).

`notes.action_status` optional (`null` | `needs_action` | `done`). Preview grid + modal editor; pin-sort
needs-action; rosewood / sage chrome. Assistant `add_note` accepts optional `action_status` (AGENT-02);
`get_notes`/`get_note` surface `action_status` (v33 confirm). Reconstructed intent: an optional annotation, **not** a second
task system.

#### ASSIST-UI-01 — In-page assistant prompts. NO SCHEMA.

`AskAssistantPrompt` (recessed well + sparkle chip + primary CTA + prefill) on Overview and empty
Checklist / Budget / Timeline / Guests / Notes / Vendors. `EmptyState` gains an optional `action` slot.
Nav chip + tab-suggestion tooltip (`AssistantNavEntry`) unchanged. **Not** Phase 5 proactive
assistant — still reactive; **discovery only** (opens the panel with a prefill; does not auto-send).

#### CAL-02 — Calendar project-member RLS. Migration **0060** (on disk, catch-up).

Couple project Calendar tab + collaborators can manage project-linked `calendar_events`. RLS is fact;
tab gating later gained CAL-04 (invited couples) and **CAL-06** (invited collaborators) — §6.

#### VND-11 — Vendor library detail / portfolio. Migration **0061** (on disk, catch-up).

`vendors.instagram` + private `vendor-media` bucket (signed URLs). Place-photo search session cache
reported UI-only (no schema).

#### DASH-02 — Shared ProjectOverview. NO SCHEMA (catch-up).

One overview surface for couple + planner project dashboards.

### v33 — Guest association + sweetheart + calendar/dashboard/budget polish

> Facts below are code-/migration-scan verified against HEAD (`ce977b0` and tree). Live paste of
> 0063–0064 unconfirmed unless Dom closed them. **Rationale reconstructed / adopted-for-now for every
> slice EXCEPT DASH-03**, whose data model + blurb deferral + `isTaskPastDue` extraction were reasoned
> in a Claude session this cycle (see the DASH-03 entry).

#### GST-12 — Plus-one / child association. Migration **0063** (on disk).

`guest_members.member_type` + `related_to_member_id` self-FK. Create UI: Adult/Child + optional Guest
of. Writer rejects chains (primary must be unassociated adult). Display sublabels; no post-create
association edit. RsvpAccessCard removed. *(Rationale reconstructed.)*

#### SEAT-13 — One sweetheart per project. Migration **0064** (on disk).

Partial unique index + action demote + empty→2 seats. Canvas form/text distinction only. *(Rationale
reconstructed.)*

#### CAL-03 — Calendar hue polish. NO SCHEMA.

`--cal-w-1…5` in `globals.css`; chips + legend; planner wedding tint vs couple kind/status legend.
*(Rationale reconstructed.)*

#### DASH-03 — Planner wedding cards. NO SCHEMA. **(Session-authored — provenance exception.)**

Replaced the plain wedding list under the "Weddings" header with a Soft stack Tier 1 card grid.
`WeddingCardModel` (`buildWeddingCardModels`, `lib/dashboard-aggregates.ts`): initials, short en-US
date + local-date countdown (graceful "Date not set / no countdown" for date-less projects), a NEW
active-scoped confirmed-guest aggregate (`guests.rsvp_status = 'attending'`, household-badge grain —
overcount is consistent, not a bug), and a sage-done / rosewood-overdue task bar. Card is one raised
surface with one recessed progress well (no raised-inside-raised); berry only as `--accent-wash`.
Decided in-session:
- **Blurb deferred → DASH-03a.** The card's one-line description needs a `projects.description` column
  AND an edit affordance; shipping the column with no editor is a dead write path (the VND-06b smell),
  so it was split out rather than bolted on. Pending, not dropped (§13 / §14).
- **`isTaskPastDue` extracted** to `lib/task-overdue.ts` as the single home for the past-due rule
  (strict local-date `<`, `status <> 'done'`). The slice deliberately did NOT refactor Overview /
  assistant in the same pass — confirm they now import it rather than re-inlining (§13 flag).
- The freeform pass added **card-level Archive** (the in-session slice was Enter-only) — raises the
  stakes on the active-scoping checkpoint (§6 DASH-03 caveats).

#### BUD polish — Paid/actual ramps. NO SCHEMA.

Category/item bars = paid ÷ actual (rosewood/clay/sage); collapsed face Actual / Total paid / Next due.
*(Rationale reconstructed.)*

#### Gmail reconnect hardening. NO SCHEMA.

Require refresh_token; `noStore` on credential reads; reconnect messaging; status advance on send.
*(Rationale reconstructed.)*


### v34 — Demo + tours + onboarding polish + contract draft

> **Provenance:** ONB-03…05 / POLISH-01 claimed LIVE VERIFIED (Dom) in v33 appendices (now folded
> here). DEMO / TOUR / ONB-02 / CON-04 are code-verified on disk; confirm pastes for 0065–0067.

#### DEMO-01 / DEMO-02 / DEMO-03 — Ephemeral demo accounts. Migration **0065** + no-schema UI.

Marketing `DemoCta` (landing audience section) → `startDemo(kind)`: real session skips RPC and goes to
`/projects`; else anonymous auth → `clone_demo_account` → `/projects`. In-app `DemoBanner` when
`account.isDemo`; `getSubscriptionForAccount` treats demo as entitled (`status: "demo"`). Seeds are
hand-apply SQL. No convert-to-real-account path yet.

#### TOUR-01 — Page tours. Migration **0066**.

`user_tours` dismissal state. Auto-fire once per tab when targets present; `?` (`TourHelpButton`)
always replays. Keys: `overview`, `seating`, `guests`, `budget`, `website`, `checklist`, `vendors`,
`notes`. Out of slice: Calendar, Access, Day-of timeline, Contracts.

#### ONB-02 — Atomic plan commit + category CHECKs. Migration **0067**.

Four category CHECKs; `include_*` flags; `commit_wedding_plan` SECURITY DEFINER. `commitPlan` calls
the RPC (not three inserts).

#### ONB-03 — Plan-scope UI. NO SCHEMA.

Style-step checkboxes write `include_*`. Preview discards unflagged sections; Approve not blocked by
unchecked checklist. Generator still produces all three sections (accepted cost).

#### POLISH-01 — Toggle + Traditions + Decide Later. NO SCHEMA.

Soft-stack kind toggle; `traditions` write-dead; Decide Later tertiary CTA on steps 1–5.

#### ONB-04 — Formality + vendor priority. Migration **0068**.

`formality` + `priority_vendor_category_ids`. Prompt directives only.

#### ONB-05 — Already booked. Migration **0069**.

`already_booked_vendor_category_ids` + row-level `vendor_targets` exclusion in `commit_wedding_plan`.
Checklist suppression prompt-only. Preview hides already-booked categories.

#### CON-04 — Contract template draft generation. NO SCHEMA.

`/contracts` Templates: generate intake → editable `TemplateEditor` seed → existing
`createContractTemplate`. Account-scoped (`resolveBusinessAccountId`). Allowlist tokens exclude
`{{amount}}`. Not a chat-assistant tool.

### v35 — Branding + write gates + throttles + billing + Calendar for invited couples

> **Provenance:** commits `3d50a3d` / `97c234a` / `4d5bbcd` / `9a0e267` + on-disk **0079**
> (untracked). Code-/migration-scan verified; **0071 live-verified** via `pg_policies`. Remaining
> pastes / Edge Function deploys unconfirmed unless Dom closed them. AGR-01 catch-up was shipped with
> DEMO/TOUR but omitted from the v34 body. HYG-01/01a shipped in the same commit as RSVP/demo
> throttle work — named here, not folded into WEB-REVAL-01.

#### WHITE-01 — Planner white-label branding. Migration **0070**.

Account branding settings + public `brand-media` + `get_project_branding`. CoupleShell override for
invited project viewers only. **v35 said planner chrome stays First Look — PARTIALLY SUPERSEDED in
v36:** venue + `white_label_enabled` may brand PlannerShell (VENUE-01). Ordinary planner chrome
still First Look. Business-only CHECK.

#### WRITE-01 — Project write gates. Migration **0071** (LIVE VERIFIED).

Project-scoped writes → `can_edit_project`; SELECT unchanged on split-policy tables. Calendar
`FOR ALL` project branch → `can_edit_project` (reads+writes). Skipped: `guest_members` (0040) and
`rsvp_attendees` (0039) already correct. `viewer` invite still not offered (product deferral).

#### RSVP-THROTTLE-01 — Real RSVP velocity cap. Migration **0072**.

≤3 submissions per household per minute inside `submit_rsvp`. Soft client throttle is not the source
of truth.

#### DEMO-04 / DEMO-04b — Demo purge + IP throttle. Migrations **0073** / **0074**.

Hashed IP attempt log; purge demo accounts + orphaned anon auth users; throttle inside
`clone_demo_account`; Edge Function `purge-demo`. Server-brokered `startDemoAction`.

#### ONB-06 — Planner bootstrap without placeholder project. Migration **0075**.

Business signup creates account only; planners add weddings via New wedding (optionally TMPL-01).

#### CAL-04 — Invited-couple Calendar tab. NO SCHEMA.

Role exception for `kind === null` + `role === "couple"`. First role-aware tab gate — do not extend
casually to other tabs. Closes the v34 "invited real couple loses Calendar" edge. **CAL-06** later
extends this same Calendar exception to invited `collaborator` members.

#### CAL-06 — Invited-collaborator Calendar tab. NO SCHEMA.

Extends the CAL-04 exception: `kind === null` + (`role === "couple"` **or** `role === "collaborator"`).
Agreements stays personal-only. No RLS change — `can_edit_project` already included collaborators
(0029 / 0071).

#### AGR-01 — Couple Agreements tab. NO SCHEMA (catch-up).

Personal-only `/projects/[id]/agreements` for contract files.

#### TMPL-01 — Project structure clone. Migration **0079**.

Same-account checklist/budget/vendor-target structure clone from New wedding form. **TMPL-02 (0098)** sets `planned_amount = 0` on budget clone; **0097** nulls `assigned_to`.

#### ASSIST-BUD-01 — Assistant budget/payment tool coverage. NO SCHEMA.

`get_budget` fixed — dropped the booked-vendor quote double-count into `allocated` (was
`sumPlanned(budgetItems) + sumVendorCosts(bookedVendors)`); now reuses `computeBudgetAggregates()` from
`lib/budget-aggregates.ts`, the same helper the live Budget UI uses, so summary (target / allocated /
actual / paid / committed / unallocated) and item (estimate / actual / paid / difference) figures can't
drift from the tab. Two new read tools added to `READ_TOOL_DEFINITIONS`: `get_budget_payments` (ledger
rows — date, amount, item, note) and `get_payment_schedule` (uncovered installments, overdue-first, via
the same `deriveScheduleWaterfall()` the UI uses). Read-only; no new write surface, no write-tool audit
re-run needed. Live-verified: assistant budget-status / paid / due-next answers matched the Budget tab
exactly on a project with a booked-vendor quote + partial ledger payment.

#### ENT-01 — Entitlement lock screen. NO SCHEMA.

`/account/locked` (Tier 2); `checkEntitlement` / `getPostLoginPath` gate. Demo still bypasses via
`getSubscriptionForAccount` (`status: "demo"`).

#### PRICE-01 — Planner local free trial. NO SCHEMA.

`startPlannerTrial` inserts `status=trialing` with both Stripe ids null, **or updates a
null-status Checkout stub in place (TRIAL-GUARD-01)**; expiry enforced by
`current_period_end` in `getSubscriptionForAccount`. No Stripe objects.

#### PRICE-02 — Planner paid Checkout. NO SCHEMA.

Monthly/Annual Stripe Subscription Checkout after (or instead of lingering on) the local trial. No
`trial_period_days` on the Checkout Session — PRICE-01 owns the free window.

#### PRICE-03 — Couple $7 trial-week Checkout. Migration **0076**. **SUPERSEDED in v36 (PRICE-07/08).**

`mode=payment` + `setup_future_usage`; stores `subscriptions.stripe_payment_method_id`. Schema
retained; live product no longer starts this Checkout.

#### PRICE-04 — Day-7 $92 off-session charge. Migration **0077** (+ **0078** claim exclude). **SUPERSEDED.**

`claim_couple_trial_charges` / `mark_couple_trial_charge_failed` (service_role); Edge Function
`charge-trial-balance`; transitional status `charging`. Residual ops artifact — do not schedule as
the couple path.

#### PRICE-05 — Couple cancel/resume before day-7 charge. Migration **0078**. **SUPERSEDED.**

`set_couple_trial_cancellation`; claim skips `cancel_at_period_end = true`. No UI consumer in the
PRICE-07/08 path.

#### PRICE-06 — Planner Customer Portal. NO SCHEMA. **Extended in v36 (PRICE-08).**

Portal session for any account with a real Stripe Customer (planner Subscription or couple monthly).
Not local trial / lifetime / seeded active.

#### HYG-01 — Delete stale design artifacts. NO SCHEMA.

Deletes `design/reference.html` + `design/theme-direction.html` (rejected Modern romantic hazard) and
collapses the duplicate type class (`couple-name` / related). `.cursor/design.mdc` + `app/globals.css`
remain the design sources of truth.

#### HYG-01a — Close dangling pointers + Google attribution hex. NO SCHEMA.

Removes stale `design.mdc` references to the deleted files; documents GoogleMapsAttribution
`#5E5E5E` as keep-raw (Google attribution styling + Roboto) — do not tokenize.

#### WEB-REVAL-01 — Public website revalidation. NO SCHEMA.

Publish/slug mutations `revalidatePath` public `/w/[slug]` (+ RSVP). Distinct from HYG-01/01a.

### v36 — Team seats + venue plan + couple monthly/lifetime + vendor cards + staleness

> **Provenance:** commits `b2bf8fc` (couple monthly/lifetime + 0079 commit) / `ca4131f` (TEAM /
> VENUE / vendor cards / lead staleness / Gmail thread / 0080–0083) + on-disk ENT-01a +
> OVERDUE-01 + `lib/billing/plan-constants.ts` extract. Code-/migration-scan verified; remaining
> 0080–0083 pastes unconfirmed unless Dom closed them. PRICE-03/04/05 product path superseded
> here — schema residual.

#### PRICE-07 — Couple local free trial. NO SCHEMA.

`startCoupleTrial` mirrors `startPlannerTrial`: insert `status=trialing` with both Stripe ids
null, **or update a null-status Checkout stub in place (TRIAL-GUARD-01)**; 7-day
`current_period_end`; service-role write. Lock screen "Start your 7-day free trial" for personal
accounts that have never started a real subscription (`status IS NOT NULL` is the guard, not row
existence). No card, no $7 Checkout.

#### PRICE-08 — Couple Monthly / Lifetime Checkout. NO SCHEMA.

`createCoupleCheckoutSession`: Monthly → Stripe Subscription $10/mo; Lifetime → `mode=payment`
$99 with `charge_stage=couple_lifetime` (webhook upserts active, no `stripe_subscription_id`).
No `trial_period_days`. Billing UI + marketing couple card use a Monthly/Lifetime toggle; real
Checkout is post-login. Customer Portal extended to any account with a Stripe Customer.

#### GMAIL-THREAD-01 — Outreach Gmail deep-link. Migration **0080**.

Persist `gmail_thread_id` from send; outreach history "View in Gmail". Legacy rows stay null.
`clone_demo_account` still skips `outreach_messages`.

#### TEAM-01 — Business account seats. Migrations **0081** + **0082**.

Flat membership. `/account/team` invite / pending / members (Leave/Remove). `/invite/account/[token]`
+ dedicated cookie. 0082 business-only INSERT + accept. Fellow-member SELECT required `user_id`
filters on `getAccountContext` and billing resolvers. `account_members.role` unused.

#### VENUE-01 — `accounts.plan`. Migration **0083**.

`planner` | `venue`; business-only when venue. Own-shell PlannerShell branding when venue AND
white-label on. Distinct from CoupleShell project branding.

#### VENUE-02 / 02b — Venue Checkout + plan flip. NO SCHEMA.

Monthly $149 / Annual $1,499 at `/account/venue-upgrade`. Webhook maps venue price ids →
`accounts.plan` (`active`/`trialing` → venue; other known statuses → planner; unrecognized →
planner + warn). Does not touch brand columns. CHECK failures must propagate.

#### VENUE-03a / 03b / 03c — Venue discoverability. NO SCHEMA.

Billing-page link; marketing pricing cosmetic cadence; planners-tab callout. Public `/pricing`
does not create venue Checkout.

#### VND-12 — Vendor library card grid. NO SCHEMA.

`VendorCard` raised-card grid replaces `VendorLibraryRow` (deleted). Preferred sage pill;
Instagram; category footer. One raised card per vendor on canvas — no raised-inside-raised.

#### LEAD-STALE-01 — Stale-lead pills. NO SCHEMA.

`lib/lead-staleness.ts`: ≥14 days since `updated_at` AND stage not `booked`/`lost`. Rosewood
"No activity in Nd" pill. Derived at read — no `leads.stale` column.

#### ENT-01a — Lock screen route group. NO SCHEMA.

`app/(locked)/account/locked` + `app/(locked)/layout.tsx`. `(app)/layout` no longer special-cases
the lock path (cached layout left chrome-less tree mounted after trial). Path unchanged.

#### OVERDUE-01 — Single-source task past-due. NO SCHEMA.

`isTaskPastDue` now used by Overview attention, assistant `getChecklist`, wedding-card rollups,
planner urgent, calendar task overlays. Budget/schedule `due_on < today` stays a different
predicate. Closes the v35 multi-home flag.

### v37 — Venue signup shortcut + trial parity + Checkout reconciliation fallback

#### VENUE-04 — Venue-intent signup shortcut. NO SCHEMA.

`venueIntent: true` is a request-only flag (never persisted); routes business-kind bootstrap to
`/account/venue-upgrade` instead of `/dashboard`. No `kind='venue'`, no venue dashboard (renders
through PlannerShell). `bootstrapAccountWithVenueIntent` wraps the unchanged
`bootstrap_account_and_project` RPC. **The original tertiary-link UI was replaced by VENUE-06**
(three equal-weight welcome options); the bootstrap mechanics did not change.

#### VENUE-05 — Local trial on venue-upgrade. NO SCHEMA.

`/account/venue-upgrade` gains a trial option reusing `startPlannerTrial()` verbatim — not a
venue-specific trial mechanism. Fixes a real gap VENUE-04 introduced: venue-intent signups bypassed
`/account/locked` (the only prior trial-button call site) and landed directly on a page offering
only immediate paid Checkout. Trial keeps `plan='planner'` until a real subscription lands.
(`startPlannerTrial` still redirects to `/dashboard` after start — that redirect is part of the
reused action, not a venue-upgrade special case.)

#### CHECKOUT-RECONCILE-01 — Synchronous Checkout-return fallback. NO SCHEMA.

**Provenance: drafted + confirmed working live by Dom; Cursor's Step 0/implementation report was
not reviewed in chat in the implementation session.** Mechanics below were verified against disk
(`lib/billing/sync-subscription.ts`,
`app/api/stripe/webhook/route.ts`, `app/(app)/account/billing/page.tsx`,
`app/(app)/account/venue-upgrade/page.tsx`, `app/(app)/account/billing/actions.ts`).

Root cause of a real incident this session: a stub `subscriptions` row (customer id only,
`status=null`) is written before Checkout redirect (`getOrCreateStripeCustomer`); only the async
webhook was ever wired to complete it. A missed/delayed webhook (in this incident: a live-mode
Checkout session with no live-mode listener locally) left the row permanently null, producing a
false "success" page and a permanent lockout with no recovery path.

`session_id={CHECKOUT_SESSION_ID}` is on all three audience Checkout success URLs (couple monthly
+ couple lifetime → `/account/billing`; planner → `/account/billing`; venue →
`/account/venue-upgrade`). Both return pages call `reconcileCheckoutReturn`, which retrieves the
session, requires Stripe `session.status === "complete"`, verifies
`session.metadata.account_id` against the authenticated account (and, if the existing row already
has a `stripe_customer_id`, that it matches the session customer), then calls
`applyCheckoutSession` — the same export the webhook uses for `checkout.session.completed`.
Idempotent via `checkoutAlreadyApplied` (no-ops when this session's subscription or couple-lifetime
result is already on the row). Webhook remains primary for renewals, cancellations, failures, and
every non-return event. Return-path failures are logged and swallowed; the page still renders.

#### TRIAL-GUARD-01 — Trial guard no longer blocks on a null-status stub. NO SCHEMA.

`startPlannerTrial` and `startCoupleTrial` guards narrowed from "skip if any row exists" to "skip
only if a row exists with `status IS NOT NULL`." Confirmed via Step 0: no inbound FKs on
`subscriptions.id`; the sole writer of `status=null` is the customer-resolution stub insert; no
lifecycle path ever nulls a real subscription's status. When the only existing row is a
null-status stub, it's updated in place (preserving `stripe_customer_id`) rather than reinserted.
Real rows (paid, trialing, canceled, past_due — any non-null status) still correctly block a
second trial attempt — this narrows the guard by exactly one case, not generally.

### v38 — Marketing landings + venue first-class entry + branding picker + venue copy + setup nudge

All NO SCHEMA. Code-verified against disk in this write-up.

#### MKT-01 — Homepage planner/venue-first repositioning. NO SCHEMA.

Marketing homepage (`components/marketing/landing-page.tsx`) leads with planners and venues as the
primary audience. In-app couple product is unchanged. Hero: "Built for planners & venues" / "Run
your planning business — automated." Primary CTA Start free → `/login`; demo CTA is
`DemoCta kind="business"`. Shared `MarketingTopbar` nav: Features (`/#features`), For planners
(`/for-planners`), For venues (`/for-venues`), Pricing (`/pricing`). Hero product preview tabs are
**Leads / Vendors / Contracts** (not the former couple Checklist/Budget/Seating tabs). Copy policy:
"automatically" / the app — never lead with "AI."

#### MKT-02 — `/for-planners` landing. NO SCHEMA.

`app/for-planners/page.tsx` + `components/marketing/for-planners-page.tsx`. Shared chrome
(`MarketingTopbar` / `MarketingFooter`). Sections: hero + business demo CTA; What-changes
before/after strip; leads-to-contracts with `HeroProductPreview`; team seats; `WhiteLabelShowcase`;
`CoupleCollaboration`; vendor/book close; `FinalCta`. Cross-link to `/for-venues`.

#### MKT-03 — `/for-venues` landing. NO SCHEMA.

`app/for-venues/page.tsx` + `components/marketing/for-venues-page.tsx`. Same chrome and section
primitives as MKT-02, venue-flavored copy (booking calendar / brand / team). Nav "For venues"
points here (no longer a homepage hash). Cross-link to `/for-planners`. Public `/pricing` still
does **not** start venue Checkout.

#### VENUE-06 — Venue entry at full parity. NO SCHEMA.

Welcome: three equal options ("We're a couple" / "I'm a planner" / "I run a venue") in
`OnboardingForm`. Venue still posts `venueIntent: true` via `bootstrapAccountWithVenueIntent`.
Lock screen (`app/(locked)/account/locked`): business-kind only gets a full-width "I run a venue"
pill next to trial/reactivate; personal-kind never sees it. Billing: planner plan (not already
venue) gets a side-by-side "Upgrade to Venue" card at equal weight with the current plan card —
still links to `/account/venue-upgrade`; no second Checkout surface. Unchanged: no third
`accounts.kind`, trial via `startPlannerTrial` does not flip `plan`.

#### WHITE-02 — Brand accent picker + contrast guard. NO SCHEMA.

`/account/branding`: 8 wedding-safe presets in `lib/brand-preset-colors.ts` (constants only — no
preset id stored; status tokens excluded) + native color picker + hex field. All three write
`brand_accent_color` through existing `updateAccountBranding`. Live `--accent` preview from
in-progress selection. Contrast vs white (`lib/branding/contrast.ts`, 4.5:1) is a **client-side
clay warning** — does not block save. `--accent` still applied the same way: CoupleShell for
invited viewers (`getBrandingForProject`) and PlannerShell own-shell (`getOwnAccountBranding`
when venue + white-label).

#### VENUE-07 — Venue-flavored PlannerShell terminology. NO SCHEMA.

`lib/venue-copy.ts` `getCopy(key, plan)`. `getAccountContext` now selects and returns `accounts.plan`.
Venue-only swaps: sidebar Leads → Inquiries, Active weddings → Active bookings; New wedding → New
booking (plus form labels); dashboard Weddings → Bookings + matching empty states / stats / urgent
header; leads page title/add/save/empty/back → inquiry wording. Planner accounts keep today's
strings. Pipeline stages, routes, and Contracts / Vendors / Calendar / Team / Branding / Billing /
Budget labels are untouched. Same call-site-resolution pattern as partner-side names.

#### ONBOARD-NUDGE-01 — Post-venue-Checkout branding + Team nudge. NO SCHEMA.

When `accounts.plan = 'venue'`, `/account/venue-upgrade` shows a raised "Your venue plan is live"
card (`components/account/venue-setup-nudge.tsx`) with two recessed rows: Add your brand colors &
logo → `/account/branding`; Invite your team → `/account/team`. Each row has its own Not now.
Storage: `user_tours` keys `venue_branding_nudge` / `venue_team_nudge` via existing `dismissTour`
(`completed` on continue, `skipped` on Not now). **Not page tours** — do not add these keys to
`tour-config.ts` / `TourProvider`. Card stays until both keys have a row; absence of a row is
undismissed (older venue accounts see both rows; no backfill). Planner Checkout is untouched.

### v39 — Rule-based automation + agentic automation + inquiry CRM + accounts GRANT + lead edit

> **Provenance:** code-/migration-scan verified against disk (0084–0091 + cron routes + public
> pages + leads UI). Live paste of 0084–0091 and Vercel Cron / Resend inbound / JWT-secret env
> are unconfirmed unless Dom closed them. Architecture decisions live in
> `AGENTIC_AUTOMATION_v1.md`; this section records **what shipped**.

#### AUTO-01 — Payment Schedule Watch. Migration **0084**.

Daily Vercel Cron `GET /api/cron/payment-schedule-watch` (15:00 UTC). Service-role reads active
non-demo projects' `payment_schedule` + `budget_payments` + `budget_items`, runs
`deriveScheduleWaterfall()` (same helper as the Budget tab), and emails a per-account digest of
uncovered installments. Kinds: `due_7`, `due_2`, `overdue_first` (one-shot, partial unique
index), `overdue_recurring` (every 5 days — last matching log row older than 5 days; **not**
structurally unique). Recipients from `resolveAccountEmails` (account members). Send via Resend
(`lib/email/send.ts`). Log insert is after a successful send. Cadence constants live only in the
route. **No LLM. No user-facing reminder UI.** Skip demo accounts. Distinct route from agentic
crons.

#### AUTO-02 — Countdown Confirmations. Migration **0085**.

Daily Vercel Cron `GET /api/cron/countdown-confirmations` (15:05 UTC). Sibling of AUTO-01 — same
bearer gate, same Resend helper, **no LLM**. For each booked `project_vendors` row on an active
non-demo project with a wedding date, fires at T-30 / T-7 / T-2 (exact local-date match). Skips
when `arrival_time` is null, when already `confirmed_at`, or when `last_reminder_kind` already
covers that cadence. Email includes vendor name, wedding identifier, arrival, scope note, and a
standing confirm URL `/vendor-confirm/{confirm_token}`. Confirm page is Tier 2 (Wordmark + one
raised card); calls `confirm_project_vendor` via the anon client. Re-click is idempotent
(`already_confirmed`). Booked-card UI authors `arrival_time` + `scope_note`
(`updateProjectVendorLogistics` in project vendors actions). Token generation matches
`guests.rsvp_token` — 16 random bytes hex, not sha256 invitation hashing.

#### AGENT-00 — Agentic plumbing. Migration **0086**.

Schema + RLS only. No tool-loop invocation, no `create_agent_draft` write tool, no
`inquiry_slug`. `agent_run_log` is the audit trail (service-role only). `agent_drafts` is the
propose-then-approve queue (account-member SELECT; INSERT/UPDATE wait for 0088). Pending-per-target
unique index ships with the table so AGENT-03 does not reshape it. Invited project members must
not see drafts — CRM gate, matching leads.

#### AGENT-01 — Prioritized weekly synthesis. NO SCHEMA (uses 0086).

Weekly Vercel Cron `GET /api/cron/agent-review` (Monday 15:10 UTC). **Read-only:**
`runAssistantWithTools` with `readOnly: true` — write tools are neither advertised nor executed.
One loop invocation per eligible active non-demo project (`lib/cron/active-projects.ts`); prompt
variant `lib/assistant/synthesis-prompt.ts`. Per-project summaries are concatenated into **one
digest email per account** (send-layer batching, not cross-project reasoning). Autonomous
send-to-self — not precedent for AGENT-03 / AUTO-03. Duplicate Vercel Cron deliveries inside a
24-hour window reuse an existing `ok` log row rather than re-running. `acted_as_user_id` stays
null. `maxDuration = 300`. Optional `?projectId=` filter for manual ops.

#### AGENT-01a — Unattended write impersonation. Migration **0087**.

Prerequisite for AGENT-02/03. `mintUnattendedWriteSession(userId)` signs a 30-second HS256 user
JWT with `SUPABASE_JWT_SECRET` and returns a Supabase client that hits PostgREST as that member.
Does **not** call `generateLink` / `verifyOtp` — no email, no `auth.sessions` row, no
`last_sign_in_at` bump. Actor = earliest `account_members.user_id` (`resolveUnattendedActorUserId`)
for reproducibility; authorization is still `is_account_member` / `can_edit_project` for whoever
that is. `agent_run_log.acted_as_user_id` records the impersonated user when a write happens.
`trigger_kind` gains `'smoke'`. Unscheduled `GET /api/cron/agent-write-smoke?projectId=` inserts
a disposable `[AGENT-01a smoke] do not keep` note — not a real automation, not in `vercel.json`.

#### AGENT-02 — Downstream-implication noticing. NO SCHEMA (uses 0086/0087).

Daily Vercel Cron `GET /api/cron/agent-implication-scan` (15:15 UTC). Own route because cadence
differs from AGENT-01. Per eligible project: impersonated session, tool loop with write allowlist
**`["add_note"]` only**, prompt `lib/assistant/implication-prompt.ts`. At most one note per pass,
always `action_status = 'needs_action'`. Silence is the expected common output — do not create
placeholder / "nothing to report" notes; skip if an existing needs_action (or recently done) note
covers the same implication (`get_notes` first). Never email, never `agent_drafts`. Logs every
outcome including "nothing found".

#### AGENT-03 — Vendor-outreach gap drafting. Migration **0088**.

Weekly Vercel Cron `GET /api/cron/agent-outreach-scan` (Monday 15:20 UTC). Projects inside a
**12-week** window (`OUTREACH_WINDOW_DAYS = 84`). Candidate filter
(`lib/cron/outreach-candidates.ts`): open category, tracked non-booked vendor with a contact
email, not recently rejected (`REJECT_COOLDOWN_DAYS = 14`), quiet after send
(`QUIET_AFTER_SEND_DAYS = 14`). Prompt `lib/assistant/outreach-prompt.ts`. Write allowlist
**`["create_agent_draft"]` only**. `target_id` MUST be `vendors.id` (never a `project_vendors`
id). Cron **never sends**. Human Approve (`approveAgentDraft` in `components/assistant/draft-actions.ts`)
marks the draft approved, inserts `outreach_messages`, and sends via the existing Gmail path
(`sendOutreachMessage`). Reject sets `status = 'rejected'`. Pending list lives in the assistant
panel (`PendingDraftList`). Chat `create_agent_draft` is the same write tool (vendor_outreach
only). 0088 adds `outreach_message_id` + authenticated INSERT/UPDATE.

#### AUTO-03a — Inquiry capture. Migration **0089**.

No LLM. Two arrival paths become a `leads` row at stage `inquiry`:

1. **Public form** `/inquire/[slug]` (Tier 2: one `#3D2430` deep field + raised card). Fields:
   names, email, optional wedding date, optional guest count, message, honeypot. Server action
   calls `submit_inquiry` RPC. `account_id` is resolved from `inquiry_slug` **server-side** —
   never client-supplied. Honeypot → `inquiry_rejected`; unknown slug → `inquiry_unknown`;
   velocity → `inquiry_throttled` (3 / hashed IP / account / 1 minute).
2. **Resend inbound** `POST /api/webhooks/resend-inbound`. Signature-verified
   (`RESEND_INBOUND_WEBHOOK_SECRET`). Parses `{slug}@{INQUIRY_INBOUND_DOMAIN}` from recipients;
   service-role inserts `leads` with `source = 'email_inbound'`. Not an anon surface.

`InquiryIntakeCard` on `/leads` shows the copyable form URL **and an iframe embed snippet**
(INQUIRY-EMBED-01). Inbound-DNS / Resend copy is **not** shown to planners; the webhook capture
path still exists. `ensureInquirySlug` lazy-fills the
column from the account name (collision suffix via 2 random hex bytes). Couples never get a
slug (`kind !== 'business'`). `agent_run_log.project_id` becomes nullable so later inquiry runs
can log without a project.

#### AUTO-03b — Inquiry extract / compose / approve. Migration **0090**.

10-minute Vercel Cron `GET /api/cron/agent-inquiry-scan` (`*/10 * * * *`). **Not the project
tool loop** — CON-04-style single-shot JSON (`lib/inquiry/extract.ts` + `lib/inquiry/compose.ts`
via `callClaudeJson`). Eligible leads: business, non-demo, `source in ('form','email_inbound')`,
`stage in ('inquiry','contacted')`, no open (`pending`/`approved`) `inquiry_reply` draft, cap 8
per run. Extract fills `wedding_date` / `estimated_guest_count` when the sender stated them
(never guess). Compose may return `{ genuine: false }` (spam / not a wedding inquiry) — that is
a successful "nothing found," not an error. Date conflict: if the account already has an active
project on that exact date, the prompt must mention unavailability honestly. Draft insert goes
through `createAgentDraft` with `kind: 'inquiry_reply'` under an impersonated RLS session.
Human review: clay "Reply ready" / "Retry send" pill on the kanban card → `InquiryReplyDrawer`
(slide-over, full body, same Approve/Reject + Gmail-connect affordance as the project Pending
panel). Approve inserts `outreach_messages` with `lead_id` set and `project_vendor_id` null, then
sends from the planner's Gmail. **Partial unique index is the dedup backstop**; the scan also
skips targets that already have an open draft.

#### ACCT-GRANT-01 — Accounts member UPDATE grant. Migration **0091**.

0070 added RLS `"members update own account"` but never GRANTed `UPDATE` on `accounts` to
`authenticated`. Member writes (branding, `inquiry_slug`) failed with "permission denied for
table accounts" **before RLS ran**. SELECT already worked. 0091 is the one-line GRANT. After
paste, member-client UPDATE can succeed; `ensureInquirySlug`'s service-role write is a
pre-grant workaround, not the intended long-term path.

#### LEAD-EDIT-01 — Lead Edit modal + shared Modal. NO SCHEMA.

Kanban cards gained an **Edit** button that opens `LeadEditModal` in a shared `components/ui/modal.tsx`
portal (scroll-lock, focus trap, Escape, `labelledBy`). Fields: couple name, email, phone,
wedding date, venue, source, estimated budget, notes. Stage change and delete stay on the card.
`friendlyLeadError` maps PostgREST/RLS/permission strings to a generic retry message so raw
Postgres errors are not rendered. `Modal` is exported from `components/ui/index.ts` for reuse;
do not fork a second overlay for this job. Does **not** yet include `estimated_guest_count`
(0090 column exists; UI gap, not a schema gap).

### v40 — Inquiry embed + demo anonymize + CRM workflow engine

> **Provenance:** code-/migration-scan verified against disk (0092–0096 + `/automations` +
> inquire branding + cron route). Live paste of 0092–0096 is unconfirmed unless Dom closed
> them. WORKFLOW-01 was claimed live-verified in production (a real stage-change run executed
> two zero-delay steps). CRM workflows are **not** the assistant loop — do not look for them
> in `AGENTIC_AUTOMATION_v1.md`.

#### INQUIRY-EMBED-01 — Embed snippet; drop infra copy. NO SCHEMA.

`InquiryIntakeCard` now offers two copyable rows: the form link (still uses
`window.location.origin` so local/staging work) and an iframe snippet whose `src` is
**hardcoded** to `https://www.usefirstlook.app/inquire/{slug}` (production origin — embeds
on planner sites must hit prod). Inbound-email address and "DNS still needed" / Resend
receiving-domain copy are **gone from the planner UI**. The Resend inbound webhook
(`/api/webhooks/resend-inbound`) still captures `{slug}@{INQUIRY_INBOUND_DOMAIN}` — it is
unadvertised, not removed. Both the form link and the embed land as a `leads` row via
`submit_inquiry`.

#### DEMO-ANON-01 — Demo clones must not leak a live brand. Migration **0092**.

Homepage demos cloned `accounts.name` from the business template. That template was still
named "Events by Jordyn", so public workspaces and `/inquire/events-by-jordyn` leaked a live
studio. 0092 backfills existing demo clones to **Lumen Planning**, nulls leaked slugs, and
adds a BEFORE INSERT trigger so `clone_demo_account` cannot keep a live name. App-side
`ensureInquirySlug` always writes `demo-studio` (optional hex suffix) for `is_demo`
business accounts, even if a leaked slug is already present. The real Events by Jordyn
account is untouched. Demo template seed (`supabase/seeds/demo_templates.sql`) also uses
Lumen Planning.

#### WHITE-03 — Public inquiry embed branding. Migration **0093**.

Anon surface #9. `/inquire/[slug]` used to always render First Look's Wordmark + default
accent, even with `white_label_enabled`. WHITE-03 calls `get_inquiry_branding` (anon
client) **before** rendering the form: `account_found = false` → invalid-link UI (no form);
white-label on → `AccountBrandMark` + `--accent` override via `brandAccentStyle` (same
helpers CoupleShell / venue PlannerShell use — do not fork); white-label off → First Look
Wordmark, `account_found = true`. White-labeled pages add a muted "Powered by First Look"
footer. `/account/branding` copy now names the public inquiry embed as a brand surface.
Does **not** white-label `/w/[slug]`. Unknown slugs no longer render a submittable form.

#### WORKFLOW-00 — Automation schema. Migration **0094**.

Tables + RLS only. No trigger hooks, no dispatcher, no `send_email`. Four tables as in §4.
`automation_run_log` matches `agent_run_log` posture (RLS on, zero policies).
`automation_steps` has no `account_id` — RLS joins through `workflow_id`.
`automation_runs.target_id` is polymorphic and un-FK'd.

#### WORKFLOW-01 — Event dispatch + impersonated executor. NO SCHEMA (uses 0094).

`dispatchLeadAutomation` (`lib/automations/run.ts`) is called from `createLead`
(`lead_created`), `updateLeadStage`, and `reorderLeads` (`lead_stage_changed`). Never
throws to the lead mutation. Matching workflows insert an `automation_runs` row and
`advanceAutomationRun(..., "start")`. Step executor (`lib/automations/execute-step.ts`)
runs under `mintUnattendedWriteSession` (AGENT-01a). Wired actions: `add_note` (appends to
`leads.notes`, or `addNote` if `action_config.project_id` is set), `change_lead_stage`
(direct `leads.stage` update — **does not** re-enter `updateLeadStage`), `create_task`
(needs `project_id`; omitted from later UI). Claimed live-verified: a real stage change
created a run and executed two zero-delay steps.

#### WORKFLOW-02 — Delay halt + daily dispatcher. NO SCHEMA (uses 0094).

A step with `delay_days > 0` sets `status = pending`, `current_step_position` to that
step, and `next_due_at = now + delay_days`. Daily Vercel Cron `GET
/api/cron/automation-dispatch` (15:25 UTC, `maxDuration = 60`) claims due pending runs
(`status = pending AND next_due_at <= now`, cap 20) and resumes them. Zero due runs is a
clean no-op. One failed target does not abort the batch. Lead-gone-missing on resume →
`failed`.

#### WORKFLOW-03 — `send_email` via `agent_drafts`. Migration **0095**.

Extends `action_kind` and `agent_drafts.kind`. `send_email` **never sends** from the
dispatcher — it inserts a pending `workflow_email` row through `createAgentDraft` (lead
target, `project_id` null). Tokens: `{{couple_name}}`, `{{account_name}}`,
`{{wedding_date}}` only (`renderWorkflowEmailTokens` — unrecognized tokens become `""`).
Existing pending draft → `skipped`. Human Approve reuses `approveAgentDraft` / Gmail.
`InquiryReplyDrawer` is kind-aware ("Workflow email" vs "Inquiry reply"). Leads page loads
both `inquiry_reply` and `workflow_email` open drafts onto the clay kanban badge.

#### WORKFLOW-04 — Builder UI. NO SCHEMA.

`/automations` (PlannerShell, business-only). Create / edit / reorder / enable / disable /
delete. Sidebar link after Leads. Trigger UI is **only** `lead_stage_changed` (select
disabled) plus optional "Only when moving to" (`LEAD_STAGES` or any). Actions offered:
`add_note`, `change_lead_stage`, `send_email`. Step reorder reuses WEB-EDITOR-02
`ReorderButtons` (up/down, not @dnd-kit). Delete blocked when run history exists —
disable instead. `lead_created` / `project_created` remain schema-legal; `create_task`
remains executor-legal. Hand-built workflows have `template_key` null.

#### WORKFLOW-05 — One-click templates. Migration **0096**.

Templates are the front door; the builder is "for anyone who wants full control." Same
`automation_workflows` rows, distinguished by nullable `template_key`. Catalog in
`lib/automations/templates.ts` (no DB CHECK):

| Key | Name | Trigger | Steps |
|---|---|---|---|
| `booking_confirmation` | Send a welcome note when you book a wedding | stage → booked | immediate `send_email` |
| `proposal_followup_note` | Remind yourself to follow up after sending a proposal | stage → proposal | `add_note` after 3 days |
| `lost_lead_note` | Log a note when you lose a lead | stage → lost | immediate `add_note` |

Toggle on: insert workflow + steps (or re-enable). Toggle off: `enabled = false` (row
kept). Customize uses the same `/automations/[id]` editor. Partial unique index: at most
one row per `(account, template)`. Time-based "nudge me when a lead goes quiet" is **not**

### v41 — Task assignment + Vendors tabs + invites email + calendar detail + library manage

> **Provenance:** code-/migration-scan verified against disk (0097–0099 + Vendors three-tab
> workspace + invite email + calendar detail + branded digests). Live paste of 0097–0099 is
> unconfirmed unless Dom closed them. AUTH-GOOGLE-01 and CONTACT-ROUTE-01 shipped with the v40
> bible bump (`fd0efdc`) and are recorded here as current product truth (they were missing from
> the v40 write-up).

#### AUTH-GOOGLE-01 — Continue with Google. NO SCHEMA. (Shipped with v40 bump; documented in v41.)

Login and signup (`LoginCard`) offer **Continue with Google** beside email/password.
`signInWithGoogle` calls `supabase.auth.signInWithOAuth({ provider: "google" })` and returns
through the existing `/auth/callback` path. Distinct from Gmail OAuth (`gmail.send`) used for
outreach. Requires the Google provider enabled in Supabase Auth + correct site URL / redirect
allowlist.

#### CONTACT-ROUTE-01 — Admin inbound relay. NO SCHEMA. (Shipped with v40 bump; documented in v41.)

Same webhook `/api/webhooks/resend-inbound` that captures inquiry mail: if any recipient matches
`ADMIN_INBOUND_ADDRESS`, forward the body to `CONTACT_NOTIFY_EMAIL` via `sendEmail` (optional
`replyTo` from the original From). Otherwise AUTO-03a inquiry slug path. Still signature-verified;
**not** an anon surface. Env: `ADMIN_INBOUND_ADDRESS`, `CONTACT_NOTIFY_EMAIL`.

#### TASK-ASSIGN-01 — Checklist assignees. Migration **0097**.

`tasks.assigned_to` + `list_project_assignees` + `AssigneeChip` / board filter. No new RLS —
rides `can_edit_project`. Assignable set = account members UNION project members. Clones
(`clone_project_template`, `clone_demo_account`) always null `assigned_to`. Turbopack follow-up
stopped re-exporting types from checklist server actions (`f1ac888`) — build-only, no product
change.

#### TMPL-02 — Template clone without dollar amounts. Migration **0098**.

Supersedes TMPL-01's planned_amount copy. New Booking from a template seeds budget **category +
label** with `planned_amount = 0` so planners enter their own estimates. Tasks still null
assignees; vendor_targets still category-only.

#### VND-LIB-01 — Library delete / unlink. NO SCHEMA.

Account vendor detail: **Delete from library** only when `project_vendors` count is 0; otherwise
blocked. Per-booking row: **Remove from this booking** (`removeProjectVendor`) — link only,
never the library row unless unused.

#### CON-ARCHIVE-01 — Contracts archive manage. NO SCHEMA.

Archive rows gain **Delete** (file) and **Edit in {project}** (jump to project Contracts).

#### VND-16 — Copy confirm link. NO SCHEMA.

Booked card copies the same `/vendor-confirm/[token]` URL AUTO-02 emails, via shared
`vendorConfirmUrl` (`lib/vendors/confirm-url.ts`). Cron uses the same helper.

#### VENUE-08 — Venue billing cadence card. NO SCHEMA.

When `accounts.plan = 'venue'` and a real Venue subscription is present, Billing shows the
current Venue Monthly/Annual cadence card instead of the equal-weight Upgrade CTA (VENUE-06).

#### VND-13 / VND-13b — Search / Outreach / Booked + budget To Book. Migration **0099**.

Query tabs `?tab=search|outreach|booked`. Still to book is **budget-mapped** categories not
booked and not ignored (`ignored_vendor_categories`). Read-time map
`mapBudgetCategoryToVendorCategory` — does **not** unify budget free-text with vendor CHECK
vocabularies. `vendor_targets` remains for booked slots / outreach linking. Tour copy updated.

#### VND-OUTREACH-MOBILE-01 — Outreach mobile chrome. NO SCHEMA.

Header actions + status filter chips stay on one horizontal scroll line; compact advance labels;
Remove becomes icon-only on small screens so vendor names stay readable.

#### CAL-05 — Calendar event detail. NO SCHEMA.

Chip/list open `CalendarEventDetailModal` (when, wedding, overdue, location, notes, Go to
task/budget/vendor, Edit for authored events). Wedding hue palette retuned for >=50 degree
spread (`globals.css` + `lib/calendar-hues.ts`). **`calendar_events.location` and `.notes` have
existed since 0045 (CAL-01)** — CAL-05 only surfaces them; no schema mislabel.

#### INV-06 / TEAM-EMAIL-01 — Invite email delivery. NO SCHEMA.

After creating a project invitation or account (Team) invitation, best-effort Resend via
`sendEmailBestEffort`. UI: "Invite sent to …" vs "email didn't send, share this link";
one-time link still shown. DB write remains source of truth. Gmail OAuth stays outreach-only.

#### EMAIL-BRAND-01 — Branded AGENT-01 digests. NO SCHEMA.

Weekly synthesis final model message is strict JSON `{summary, highlights}` stored on
`agent_run_log.summary`. Email renders through `renderBrandedDigestEmail` with First Look logo
(`public/email/firstlook-logo.png`) or venue own-brand via `getOwnAccountBrandingForAccount`
when white-label applies.

---

---

## 8. Onboarding → AI starting plan

**6-step wizard** (`onboarding-wizard.tsx` + `plan-preview-step.tsx`):

| Step | Content |
|---|---|
| 1 Basics | wedding date, location, guest estimate |
| 2 Budget | total budget |
| 3 Style | style / priorities / vibe + **"What should we suggest?"** scope checkboxes (`include_checklist` / `include_budget` / `include_vendors`) |
| 4 Your focus | formality radios + priority vendor-category checkboxes (ONB-04) |
| 5 Already booked | already-booked vendor-category checkboxes (ONB-05) |
| 6 Plan preview | generate → edit → Approve |

**Decide Later** (POLISH-01) is a ghost tertiary CTA on steps 1–5 — same advance/save handler as
Continue/Create (empty-field advance already allowed; labeling/affordance only).

`saveOnboarding` writes profile fields + scope flags + formality + priority/already-booked id arrays
(filtered via `getVendorCategoryById` ahead of DB CHECKs). **`traditions` is no longer written**
(POLISH-01); column retained, reads null; prompt degrades to `"none specified"`.

`generatePlan` / `generate-wedding-plan.ts` still returns the full three-section JSON every time
(ONB-01 shape unchanged). Scope gating is client-side at preview (unflagged sections discarded) and at
Approve (`include_checklist && checklist.length === 0` is the only checklist-empty block). The model
prompt includes formality + priority + already-booked as facts plus **directive** guidance bullets;
priority/formality influence is prompt-only (no code weighting). Already-booked also has a structural
`vendor_targets` filter at commit (0069); checklist already-booked suppression cannot — `tasks` has no
category column (prompt-only + manual preview remove).

**Approve** (`commitPlan`) builds JSON payloads and calls a single `commit_wedding_plan` RPC (0067 /
0069) — not three client inserts. RPC: `can_edit_project`, reject if already `onboarded_at`,
flag-gated inserts, already-booked row filter on vendors, then stamp `onboarded_at`. Computed task due
dates floor through `clampDueDateToToday`; `phase` is derived, never authored.

> **⚠️ `onboarded_at` lives on `wedding_profile`, NOT on `projects`.** A planner-created project has no
> `wedding_profile` row (Mila & Griffin reads null — correct). This is also why the partner-side derive
> (GST-07) needs a `projects.name` fallback: planner projects have no profile to read names from.

> **Invited couples never see the wizard.** The discriminator is whether the user owns the account that
> owns the project.

> **ONB-06:** planner (business) bootstrap creates **no** placeholder project — `bootstrap_account_and_project`
> returns `null` and the app redirects to `/dashboard` (then ENT-01 may send `/account/locked` until
> trial). **VENUE-06:** choosing "I run a venue" uses the same RPC with `venueIntent: true` and
> redirects to `/account/venue-upgrade` instead. Couples still get exactly one project at bootstrap.

The generator's response shape (ONB-01) is unchanged; `vendorCategories[].category` must be a
`VENDOR_CATEGORIES` id; the generated budget `category` is free-text; `plannedAmount` becomes Estimate.
Known cost accepted (ONB-03): unchecked sections are still generated then discarded client-side —
revisit only if token cost/latency becomes a real complaint.

---

## 9. AI assistant

Reactive tool-use agent in `lib/assistant/` + `components/assistant/`, per-project history in
`assistant_messages`, account-kind-aware system prompt, RLS-protected actions, plain prose.

**Tools: read + additive-write only. No delete tools.** A system-prompt honesty rule requires the
assistant to say plainly when it has no tool for something.

**Loop semantics:** capped at `MAX_TOOL_ITERATIONS = 8`. Cap-hit WITH committed writes → `ok:true` +
summary; cap-hit with NO writes → persists nothing. **Cost controls:** static prefix prompt-cached;
history windowed to 10; read-tool payloads compacted; state from LIVE reads.

**Discovery (ASSIST-UI-01):** entry points are (1) the nav **Assistant** chip + one-shot tab-suggestion
tooltip (`AssistantNavEntry` / `tab-suggestions.ts`), and (2) **in-page `AskAssistantPrompt`** wells on
Overview and empty Checklist / Budget / Timeline / Guests / Notes / Vendors (prefill from
`ASSISTANT_PREFILLS`). Still reactive — opens the slide-over panel; does **not** auto-send or push
proactive messages (Phase 5).

> **Read coverage is complete for project-scoped planning entities but NOT for account-scoped
> entities.** Surfaces WITHOUT assistant coverage include leads, proposals, invitations, seating (incl.
> the per-member grain + sweetheart), the calendar, contract templates, the account vendor library,
> **branding, billing/entitlement, Team seats, venue plan, marketing landings, and the guest-rework
> RSVP / website-editor / GST-12 association surfaces (no new chat tools beyond ASSIST-BUD-01 and
> `create_agent_draft`; CON-04 and AUTO-03b are account-scoped JSON generators, not chat tools).**
> **The budget ledger / payment schedule gap closed in ASSIST-BUD-01** — see below. Website has a
> narrow write (`set_website_travel`). The assistant has no vendor-removal tool and should not get one.
> - **`get_notes` / `get_note` return `action_status`** (pin-sort needs-action; summary count) —
>   confirmed in `lib/assistant/read-tools.ts` (v33). **`add_note` accepts optional `action_status`**
>   (`needs_action` | `done`); omit → `null` (ordinary note). Available to chat and to AGENT-02.
>   AGENT-02 always passes `needs_action`. Not a separate note-status write tool — same `add_note`.
> - **ASSIST-BUD-01 (v35, NO SCHEMA)** — `get_budget` fixed (booked-vendor quote double-count into
>   `allocated` removed; now reuses `computeBudgetAggregates()` / `deriveScheduleWaterfall()` from
>   `lib/budget-aggregates.ts`, same helpers the live Budget UI uses). New `get_budget_payments` +
>   `get_payment_schedule` read tools. Live-verified against the Budget tab (Dom).
> - **`create_agent_draft` (AGENT-03).** Chat + outreach-scan write tool. Queues `agent_drafts`
>   `vendor_outreach`; `target_id` = `vendors.id`; validates account ownership + project link; does
>   not send. Inquiry-reply drafts are AUTO-03b (`createAgentDraft` with `kind: "inquiry_reply"`
>   from cron) — **not** a second chat write tool.
> - **`workflow_email` (WORKFLOW-03).** Cron/dispatcher `createAgentDraft` with
>   `kind: "workflow_email"` — **not** a chat write tool. Same Approve path as inquiry_reply.

> **Assistant write-tool canonical audit (re-run after AGENT-03).** Enforced-canonical: `add_task`, `update_task_status`,
> `update_guest_rsvp`, `add_vendor_target`, `set_website_travel`, **`add_note.action_status`** (`needs_action` | `done` | omit),
> **`create_agent_draft`** (queues `agent_drafts` vendor_outreach; `target_id` = `vendors.id`; validates account ownership + project link; does not send).
> Free-text-by-design (correct, not a
> gap): `add_budget_item` category, `add_timeline_event(s)` owner/section, note/guest text, website
> schedule text, `create_agent_draft` subject/body.
> - `update_guest_rsvp` shares `guests.rsvp_status` with `submit_rsvp` (0058) — one column, two writers,
>   latest-wins (§3). Legitimate manual writer; no change needed.
> - **⚠️ VERIFY: the assistant's guest-add path predates the guest rework** and still writes the OLD
>   shape (email; no `address`, `relationship_side`, `relationship`, **`member_type` /
>   `related_to_member_id`**). Not broken (new columns nullable / default adult), but out of sync with
>   the couple-side form — update/retire before relying on assistant-created guests carrying the new
>   fields.
> **Re-run this audit when any new write tool ships.** `inquiry_reply` drafts are AUTO-03b
> (cron `createAgentDraft`, not a new chat write tool); `workflow_email` drafts are WORKFLOW-03
> (dispatcher `createAgentDraft`, not a new chat write tool); chat `create_agent_draft` remains
> vendor_outreach only.

**Agentic automation (shipped):** scheduled / event-triggered invocation of this same loop.
Same tools, same cap, same RLS — new entry point. Distinct from AUTO-01/02 (fixed-cadence
template reminders; no LLM) **and** from WORKFLOW-00…05 (CRM event + delay engine; no LLM;
`lib/automations/`). **On disk:** AGENT-00 (0086), AGENT-01 (weekly synthesis, read-only;
**EMAIL-BRAND-01** JSON `{summary, highlights}` + branded HTML digest), AGENT-01a (0087
impersonation + smoke), AGENT-02 (daily `add_note`), AGENT-03 (0088 `create_agent_draft` +
Pending approve/reject), AUTO-03a (0089 capture), AUTO-03b (0090 extract/compose/approve).
Architecture companion: `AGENTIC_AUTOMATION_v1.md`. Unattended writes use
`mintUnattendedWriteSession` — never service-role as the request JWT. Autonomy line: send-to-self
and in-app notes may run unattended; third-party sends always propose-then-approve. CRM workflow
`send_email` uses the same impersonation + `createAgentDraft` + Approve line.

---

## 10. Design system — Soft stack (C1)

> **This section is a POINTER.** Token VALUES live in `app/globals.css`. RULES live in
> `.cursor/design.mdc`. If they disagree with this file, those two win. Stale
> `design/reference.html` / `design/theme-direction.html` were **deleted** — regenerate
> reference only if you need a rendered Soft stack exemplar again; do not resurrect theme-direction.

**Direction:** Soft stack (C1) — calm tool organized by **depth**. Mauve-tinted canvas; raised white
cards; recessed wells for rows/tracks. Hierarchy = raised-contains-recessed.

### Three-tier surface taxonomy

| Tier | Where | What it gets |
|---|---|---|
| **1 — App chrome** | `app/(app)/`, most of `components/`, planner, forms, **seating canvas**, assistant + **in-page `AskAssistantPrompt` wells** + **Pending draft list**, settings, Access, Branding, Team, venue-upgrade, `/vendors` card grid + project Vendors three-tab workspace / `/calendar` (detail modal) / `/contracts` / **`/automations` (template gallery + builder)** / checklist assignee chips, the Budget page, the Guests page, **the Notes board**, **the website editor incl. the sticky preview**, **the dashboard wedding cards**, **demo banner**, **page-tour overlay**, **CoupleShell + venue PlannerShell white-label chrome**, **Leads kanban (stale pills + reply-ready pills + Edit modal + InquiryIntakeCard)** | Soft stack palette + Figtree; two depth levels; three radii; **no** accent flood; **no** Cormorant/Great Vibes |
| **2 — Emotional** | Landing **incl. `/for-planners` + `/for-venues`**, onboarding hero/welcome, empty-state heroes, `/invite/[token]`, **`/invite/account/[token]`**, **`/account/locked` (`(locked)` group)**, **`/inquire/[slug]` (one deep field; WHITE-03 brand mark in the header, not a second deep field)**, **`/vendor-confirm/[token]`** | Same palette + Figtree; larger display scale; **exactly one** deep field `--deep` per surface |
| **3 — Website + print** | `components/website/`, public `/w/[slug]` (incl. the gated RSVP + song intake, **the image-shape + timeline-layout render**), `RunSheetDocument.tsx` print header, the contract print document | `--ws-*` colour + Cormorant + (Romance) Great Vibes + Hanken |

**Serif / script location rule:** Cormorant Garamond and Great Vibes may appear **only** in
`components/website/`, the run-sheet print header, and the contract print document.

**Status-colour meaning:** sage = settled/done/booked/signed/rsvp-yes/under-or-on budget / notes-done;
clay = in flight; rosewood = wrong/overdue/over-plan/declined/rsvp-no/over budget / notes-needs-action;
well/muted = neutral. **Kind is never encoded in a status colour.** Calendar wedding/kind tints use
**`--cal-w-1…5`** (categorical identity only — separate from status tokens).

> **rosewood is also the DESTRUCTIVE-ACTION colour** (muted at rest, rosewood on hover/focus).

**In-page assistant prompt (ASSIST-UI-01 — Tier 1):** `AskAssistantPrompt` is a **recessed well** (not
a raised card) placed inside a raised card or an `EmptyState` action slot; sparkle chip + primary CTA;
no accent flood, no raised-inside-raised.

**Dashboard wedding cards (DASH-03 — Tier 1):** one raised white card per active project on the mauve
canvas; the task progress bar is a **recessed well** with a sage done-segment + adjacent rosewood
overdue-segment; the countdown is a recessed pill. No raised-inside-raised; berry only as
`--accent-wash` (count pill / avatar / Enter text). sage = done, rosewood = overdue.

**White-label (WHITE-01 / WHITE-02 / VENUE-01 — Tier 1):** CoupleShell may override `--accent` from a
planner brand hex for invited project viewers; venue PlannerShell may do the same when
`plan = 'venue'` AND white-label is on. Preset swatches + picker are chrome controls, not an accent
flood. Contrast warning is clay (in-flight), not rosewood. Logo is a brand mark, not photographic
ornament. Ordinary planner chrome stays First Look.

**Vendor library cards (VND-12 — Tier 1):** one raised `--surface` card per vendor on canvas;
initials in a recessed well; preferred = sage pill (settled), not a status-kind color. No
raised-inside-raised.

**Stale leads (LEAD-STALE-01 — Tier 1):** rosewood pill = going cold (wrong/inaction), never a
kind color. Terminal booked/lost leads are not stale.

**Inquiry reply drafts (AUTO-03b — Tier 1):** clay "Reply ready" / "Retry send" pill on the
kanban card (in-flight, not a problem). Click opens a slide-over reusing Pending approve/reject.
Do not mix clay with rosewood staleness.

**Shared Modal (LEAD-EDIT-01 — Tier 1):** portal overlay, `bg-ink/25` scrim, raised `--surface`
panel, `--radius-card`. Scroll-lock + focus trap + Escape. One primitive — do not fork a second
modal for leads vs notes vs anything else. Notes still use `NoteModal` (pre-existing); new
overlays should reuse `components/ui/modal.tsx`.

**Public inquiry form (AUTO-03a / WHITE-03 — Tier 2):** `/inquire/[slug]` may use **exactly one** deep field
(`bg-deep`, radius 28px, emotional shadow) plus a raised form card. Not a Tier 1 chrome page.
Invalid-slug state is a single raised card, no second deep field. White-label logo/name live in
the **header** (not a second deep field). "Powered by First Look" is muted footer copy, not
chrome serif.

**CRM automations (WORKFLOW-04/05 — Tier 1):** `/automations` is a raised-card list + template
gallery (sage On / muted Off pills). Editor reuses WEB-EDITOR-02 up/down reorder. Do not pull
@dnd-kit in (kanban-only). Template cards are one raised surface each — no raised-inside-raised.

**Vendor confirm (AUTO-02 — Tier 2):** `/vendor-confirm/[token]` is Wordmark + one raised card
(success / already-confirmed / invalid). No accent flood.

**Website editor (WEB-EDITOR-02 / WEB-STYLE-01 — Tier 1 chrome hosting a Tier 3 preview):**
- **Sticky side preview** renders the Tier 3 site while the Tier 1 editor is in view; no serif/script
  leakage into chrome.
- **Section reorder** = up/down buttons (not drag/@dnd-kit). **Collapsible section editors** reuse the
  shared chevron/collapse affordance.
- **Image border-shape** + **timeline layout/centering** are Tier 3 render options (`--ws-*` / website
  radii), authored in the editor, stored in `content` jsonb.
- **FIX-02:** meal `<select>` white-text contrast corrected (Tier 3).

**Collapse pattern:** DASH-01 per-wedding cards, VND-08a category groups, the budget quick-add menu and
category cards, the Guests household cue, **and the website section editor** share ONE chevron/expand
affordance — do not fork.

**Date formatting (LAND-01a):** public/couple-identifying long wedding dates → shared
`formatWeddingDate`, locale `en-US`. All-day calendar placement, the wedding countdown, budget
due-dates/installments and any guest/RSVP date derive by **local date** (no tz off-by-one; strict `<`
for past-due). **DASH-03 note:** the card's short en-US date is built from the same local-date parse
the countdown uses — it does NOT import the Tier 3 `components/website/` `formatWeddingDate` helper
(wrong tier, wrong signature, long form). This feeds the open "Tier 1 date locale policy" item; it
does not resolve it.

### Open design items

| Item | Status |
|---|---|
| Legacy CSS aliases (`--plum`, `--stone`, …) | **Open** — temporary; no new alias consumers |
| `design/reference.html` regenerate | **Optional** — file deleted; recreate only if a Soft stack exemplar is needed |
| `design/theme-direction.html` delete | **Done** |
| Font-load scoping | **Open** |
| GoogleMapsAttribution `#5E5E5E` | **Done** — keep raw hex + Roboto (Google attribution); do not tokenize |
| **Dom live Soft stack + LAND-01 visual checkpoint** | **Partially closed** — Guests, Budget, website editor + public site, and public RSVP are **verified**; Notes / AskAssistantPrompt / Vendor detail / Calendar / GST-12 / SEAT-13 / DASH-03 / CAL-03 shipped-but-unwalked unless closed; **add branding + accent picker, lock screen (locked group), couple local trial → Monthly/Lifetime, invited-couple Calendar, Agreements, template clone, demo purge/throttle UX, Team, venue upgrade + own-shell + venue copy + setup nudge, vendor cards, stale-lead pills, View in Gmail, three-option welcome, `/for-planners` + `/for-venues`, accent picker, inquiry form + embed snippet + branded embed + intake card + reply drawer, vendor-confirm page, Pending drafts, lead Edit modal, booked-card arrival/scope, `/automations` templates + builder** to the walk |
| Tier 1 date locale policy | **Open** |
| Run sheet legacy classnames | **Accepted for now** |
| Budget dashboard overhaul (richer headline / rollup) | **Open** — mockup-first before any slice |

**Do NOT start a new "Modern romantic polish pass."** Layout language is Soft stack.

---

## 11. How to build new features (the workflow)

One vertical slice per prompt. Migration first (you apply it by hand), then the UI prompt.

```
## [ID] — [Feature]
Context · Builds on · Prerequisites
0. Verify before changing anything (report findings): confirm next migration number, locate
   patterns/resolvers/columns to reuse, confirm scoping, confirm single-source-of-truth lists.
   If any finding contradicts this prompt, STOP and say so.
1. Schema: new migration NNNN_name.sql (or NONE), correct scope, RLS by the right function,
   CHECK-constrain enums, read existing migrations, don't invent columns.
2. Data access: server reads scoped; 'use server' actions writing by id + revalidatePath. RLS only.
3. UI: routes/components using Soft stack primitives + `.cursor/design.mdc`.
Behavior · Constraints (don't drift) · Checkpoint (concrete, testable)
```

**The checkpoint is a LIVE run, not a typecheck. Cursor cannot authenticate — Dom runs every live
checkpoint.** Cursor's "code-level ✅" is narration, not verification. **For a grain change, a Step 0
recon pass that changes nothing is worth a whole slot** — author the migration from real column/row
facts.

**Design the checkpoint to fail.** Ask: *what would this checkpoint look like if the fix silently
didn't work?* If the answer is "the same," it's decoration.

**Cursor-freeform work still needs the gate.** Product work includes freeform Cursor batches.
The promotion bar is still a live pass — and any migration still needs the §5 landed-confirmation.
**0060–0099 pastes remain unconfirmed** unless Dom closed them; **0068–0069 claimed LIVE VERIFIED**;
**0071 LIVE VERIFIED**. 0059 DDL is reconstructed.

**This file is the canonical Project Bible.** A new chat must be able to work from **this document
alone**. Cursor may draft from a code scan; prefer: Claude authors from session reasoning; a code
scan is a **findings list** for factual drift only (migration numbers, columns, paths, gating).

**Verification lessons (carried forward):**
1. Confirm the migration landed before believing any checkpoint (`to_regclass` / `to_regprocedure` /
   `pg_policies` first). A file on disk is NOT an applied migration.
2. Absence-shaped assertions pass trivially when the feature doesn't exist.
3. Reproduce the defect BEFORE applying the fix.
4. Scoped Step 0 questions return scoped answers — ask for EVERY writer/read site, require a count.
5. Cursor answering a Step 0 question is not Cursor acting on it.
6. A control the spec author cannot find on the page has not shipped.
7. An insert-only writer looks broken after a clear-and-rebuild unless you separate stale from fresh.
8. A guard that silently no-ops and a broken guard that doubles rows look identical in the UI — count.
9. Raw Postgres/PostgREST error objects rendered in the UI mean the write is FAILING, not succeeding.
10. **A "next-free" migration number from Cursor — or from THIS bible — is a claim to verify, not a
    fact.** 0053 surfaced during GST-04 Step 0; later numbers were taken while a stale next-free
    claim in this document was still circulating (0059 seating, 0060–0062, 0063–0064, 0065–0069,
    0070–0079, 0080–0083, 0084–0091, 0092–0096, 0097–0099). Grep `supabase/migrations/` before trusting a number. **Next-free today is 0100.**
11. **A checkpoint only tests what Step 0 thought to ask.** TRIAL-GUARD-01's bug (a null-status stub
    soft-locking trial eligibility) existed since PRICE-01/PRICE-07 shipped but surfaced only once
    VENUE-05 added a second call site and real Checkout-abandonment testing happened. Absence of a
    prior bug report is not absence of the bug.
12. **A drafted slice prompt is not a verified implementation.** CHECKOUT-RECONCILE-01 was confirmed
    working by a live end-to-end test, but its Cursor Step 0/implementation report was never pasted
    back and reviewed line-by-line. This bible write-up confirmed the mechanics against disk; still
    re-read `reconcileCheckoutReturn` / `applyCheckoutSession` before the next slice builds on
    Checkout return handling — same discipline already applied to migration numbers.
13. **A person confirming "it works" is not the same as a walked checkpoint list.** The v38
    product slices were confirmed working in conversation but not walked item-by-item against
    their original prompts' checkpoint bullets. Record the gap explicitly rather than letting a
    verbal confirmation silently upgrade to "fully verified."
14. **An RLS policy is not a table GRANT.** 0070 added `"members update own account"`; member
    UPDATE still failed with "permission denied for table accounts" until 0091 GRANTed UPDATE
    to `authenticated`. If a write "should pass RLS" and the error is permission-denied-for-table
    (not a policy violation), check `role_table_grants` before rewriting policies or introducing
    a service-role workaround. `ensureInquirySlug`'s service-role write is that workaround —
    retire it after 0091 is live rather than treating it as the intended writer.
15. **A next-free number in this document can be taken the same day.** 0092 was listed as
    next-free until DEMO-ANON-01 took it; WHITE-03 therefore landed as 0093. Always grep
    `supabase/migrations/` at Step 0.

**Documentation discipline:** factual drift (numbers, paths, existence, gating) may be corrected from
a code scan. Prefer section-level diffs.

**Drift watchlist:**
- Treating a `subscriptions` row's mere existence as a real subscription — only `status IS NOT
  NULL` counts (TRIAL-GUARD-01). A `status=null` + `stripe_customer_id` row is Checkout-initiation
  debris.
- Adding `trial_period_days` to any Checkout Session — local trial stays Stripe-independent.
- Demoting venue back to a tertiary welcome link — VENUE-06 is three equal-weight options.
- Adding `accounts.kind='venue'` — venue is business-kind + request-only `venueIntent` + paid
  `plan='venue'`.
- A second Checkout-return writer that does not call `applyCheckoutSession`.
- Skipping the return-page check that `session.metadata.account_id` matches the authenticated
  account.
- **Trusting an outdated "next-free"** — **0084–0099 are taken**; next-free is **0100**.
- Treating couple billing as **$7 week + day-7 $92** — live path is PRICE-07 local trial +
  PRICE-08 Monthly $10 / Lifetime $99. Do not reschedule `charge-trial-balance` as the couple path.
- Reusing `project_invitations` for Team seats. Do not parse `/invite/account/` as a project token.
- White-labeling **ordinary** planner chrome or public websites — WHITE-01 is CoupleShell /
  invited viewers; VENUE-01 own-shell is **venue + white_label_enabled only**.
- Persisting a brand **preset id** — WHITE-02 stores a free-text hex only.
- Blocking branding save on the contrast warning — warning is client-side only.
- Reading `account_members` without filtering `user_id` after TEAM-01 fellow-member SELECT.
- Introducing `account_members.role` as authorization — it is vestigial.
- Treating PRICE-06 Portal as planner-only — couple monthly Subscriptions use it too.
- Re-inlining task overdue — **OVERDUE-01**; `isTaskPastDue` is the helper. Budget/schedule
  `due_on < today` is a different predicate.
- Putting the lock screen back under `(app)/layout` pathname branching — ENT-01a moved it to
  `(locked)`.
- Treating **WRITE-01 as still open** — write gates shipped as **0071**; `viewer` invite remains a
  product deferral only.
- Treating Calendar as strictly personal-only — **CAL-04 / CAL-06** shows it to invited `couple`
  and `collaborator` members.
- Omitting the couple **Agreements** tab from the personal tab list.
- Assuming planner bootstrap still creates a placeholder project — **ONB-06** does not.
- Treating RSVP throttle as soft-only — **0072** is the source of truth inside `submit_rsvp`.
- Treating Registry as a workspace tab — it is **not**; links live under Website.
- Assuming assistant guest-add writes GST-12 fields — it does **not** yet (§9).
- Dropping the DASH-03a blurb decision — it's a deliberate deferral (needs `projects.description` +
  an editor), not an omission (§13 / §14).
- Nesting a raised `EmptyState` / card inside another raised card — keep recessed-prompt pattern.
- Reordering website sections with **@dnd-kit** (up/down buttons are sanctioned; §15).
- A **new collapse affordance** for the website section editor instead of the shared one.
- Server/Supabase or `lib/partner-sides.ts` imports into `components/website/` via the sticky preview.
- A future `submit_rsvp` replace that drops gated-only / song-gate / badge auto-populate / **0072
  throttle** while "just" touching the form.
- Dropping `guests.meal_choice` / `guests.party_size` / `rsvp_access_mode` / `budget_items.due_date` /
  `wedding_profile.traditions` before their planned supersession migration (**0100+**). Claiming
  `party_size` is fully inert — it still drives create-form slots. Do not resurrect a `traditions`
  write path.
- Adding a second sweetheart without demoting (0064 + action enforce uniqueness).
- Encoding table kind in a status colour (sweetheart uses form/text + accent stroke only).
- Treating ASSIST-UI-01 as Phase 5 proactive assistant (it is discovery-only).
- Writing AGENT-01/02/03 or AUTO-03 slices from this bible alone — read `AGENTIC_AUTOMATION_v1.md`
  for autonomy tiers and reuse discipline; this bible records what shipped. CRM workflows
  (WORKFLOW-00…05) are documented **in this bible**, not in that companion — do not look there
  for `automation_workflows`.
- Folding agentic runs into the AUTO-01/02 cron dispatcher — separate route; different cost/failure
  profile (LLM vs. plain SQL).
- Treating AUTO-01/02 as agentic (they are rule-based, no LLM), or treating AGENT-01/02 send-to-self /
  in-app autonomy as precedent for third-party auto-send (AGENT-03 / AUTO-03 always propose-then-approve).
- Forking a second assistant tool-definition set for automated vs. chat runs.
- Adding a DB-level event trigger (`pg_net`, Database Webhooks) for v1 agentic automation — scan-based
  until a real lag complaint.
- Letting `create_agent_draft` (or AUTO-03b cron) call a send path — only the human Approve action sends.
- Skipping the `agent_run_log` write on a failed or capped run.
- Letting a re-run create a second `pending` draft for the same target — check first; the partial
  unique index is the backstop, not the happy path.
- Using service-role as the request JWT for unattended agent writes — impersonate a member (AGENT-01a).
- Treating `ensureInquirySlug`'s service-role write as the intended long-term path — 0091 is the GRANT
  fix; retire the workaround after paste.
- Client-supplying `account_id` to `submit_inquiry` — slug resolution is server-side only.
- Adding anon SELECT on `leads` / `agent_drafts` / `project_vendors` / `payment_reminder_log` /
  `agent_run_log` / `inquiry_form_attempts`.
- Persisting a second pending inquiry draft when one already exists (scan skip + unique index).
- Surfacing `estimated_guest_count` as if LEAD-EDIT-01 already edits it — the column exists; the
  modal does not include it yet.
- Forking a second Modal primitive (use `components/ui/modal.tsx`).
- Auto-sending countdown confirms to vendors with no `arrival_time`.
- Hashing `confirm_token` like an invitation — it is a standing `rsvp_token`-style secret.
- Inventing title-string heuristics to filter already-booked checklist tasks (architecturally ruled
  out — §3 / ONB-05).
- Emitting `{{amount}}` from CON-04's generator (excluded by product decision).
- Copying template `rsvp_token`s or published website slugs when cloning demo accounts.
- Extending CAL-04 / CAL-06's Calendar role exception to other `coupleOnly` tabs without a
  deliberate decision.
- Mirroring RSVP or demo throttle thresholds in app code (RPC/Edge constants are sole source).
- Starting venue Checkout from public `/pricing` (cosmetic only; real path is post-login
  `/account/venue-upgrade`).
- Storing a `leads.stale` column — LEAD-STALE-01 is derived at read.
- Auto-firing ONBOARD-NUDGE-01 keys as page tours — they are storage-only `user_tours` rows.
- Hardcoding "Leads" / "New wedding" / "Weddings" in PlannerShell instead of `getCopy`.
- Restoring an **open/anonymous RSVP path**.
- Fuzzy-matching RSVP attendee **names** to `guest_members`.
- Treating `guest_members.attending` as the shown RSVP status — the household badge is.
- Wiring the relationship picklist to `VENDOR_CATEGORIES` or adding a DB CHECK on
  `guest_members.relationship`.
- Storing the partner-side **display name** instead of the `partner_1` / `partner_2` token.
  **No Bride/Groom.**
- Persisting a client song when `song_requests_enabled` is off (server-gate).
- Reintroducing a review/apply RSVP inbox.
- Deriving Paid from `actual_amount` instead of the `budget_payments` ledger.
- Storing a per-installment paid/unpaid status (coverage is derived at read via the waterfall).
- Letting a budget per-card filter rewrite the global "paid so far" headline / Needs-attention panel.

---

## 12. Compliance & security notes

- **Stripe:** webhook verifies raw-body signature; service-role only in webhook (+ billing/admin +
  Edge Function paths + local-trial inserts); entitlement read only from the `subscriptions` row
  (demo bypass in `getSubscriptionForAccount`). **Stripe Tax NOT set up.** Couple: local trial then
  Monthly Subscription or Lifetime one-time (`charge_stage=couple_lifetime`). Venue price ids flip
  `accounts.plan`. Residual PRICE-04 `charge-trial-balance` is not the live couple path.
  **CHECKOUT-RECONCILE-01** verifies the retrieved Checkout Session's `metadata.account_id` matches
  the currently-authenticated account (and, if the existing row already has a
  `stripe_customer_id`, that it matches the session customer) before writing anything — same
  "don't trust client-supplied state" posture governing every other write boundary in this
  document. Do not skip this check when extending reconciliation to a new Checkout flow.
- **Live-key incident:** a live `STRIPE_SECRET_KEY` was briefly active in local dev, producing
  one real live venue subscription — cancelled directly in Stripe. Rotate the key if exposure
  beyond this machine is possible. Local Stripe webhook testing requires an active forwarder
  (`stripe listen`) matched to the same mode (test/live) as the active secret key — a mode or
  forwarder mismatch is a silent failure with no error surfaced anywhere in-app.
- **Public website / registry / meal-options / song-toggle read:** anon `SELECT` gated to a published
  site (the song toggle + section-order/layout options are riders on the existing published read /
  `content` jsonb — no new surface).
- **Public RSVP write:** `submit_rsvp` RPC only; **gated-only (0054)** — every submission
  household-token-bound; `project_id` server-derived; honeypot + **real velocity throttle (0072)**;
  **auto-populates `guests.rsvp_status` in-transaction (0058)** via the definer function. **RSVP-02
  changed only the client form**; **RSVP-THROTTLE-01** replaces the RPC in place. **Collects guest
  PII** (names, songs, dietary; email now optional) → privacy policy.
- **Public inquiry write:** `submit_inquiry` RPC only (0089 / AUTO-03a; 0090 persists
  `estimated_guest_count`); `account_id` server-derived
  from `inquiry_slug`; honeypot + hashed-IP throttle (3 / account / 1 minute). Collects inquirer
  PII (name, email, optional date/count, message). The Resend inbound webhook is signature-verified
  service-role, **not** an anon surface. AUTO-03b drafts and extraction writes use an impersonated
  RLS session, never service-role.
- **Anon grant sharp edge:** the table GRANT on `guests` includes UPDATE to anon, but RLS blocks any
  direct anon write — the definer RPC is the only anon-reachable badge writer. WRITE-01 did not change
  this belt-and-suspenders item.
- **Public registry claim:** anon INSERT gated to published sites; honeypot + throttle.
- **Invitations:** raw tokens 32 random bytes base64url, stored only as sha256 hex; acceptance bound to
  `auth.email()`; expiry 14 days; revocation immediate. **Two cookies:** `pending_invite_token`
  (project) and `pending_account_invite_token` (TEAM-01) — both httpOnly, `sameSite: lax`, secure in
  prod, 30-min, consumed once, set in middleware. Match `/invite/account/` **before** `/invite/`.
- **Guest gated-lookup token:** `guests.rsvp_token` (16 random bytes hex); `lookup_rsvp_household`
  definer/anon-execute surfaces a household's members by token; `submit_rsvp` re-resolves server-side.
- **Vendor confirm token (AUTO-02):** `project_vendors.confirm_token` — same generation as
  `rsvp_token` (16 random bytes hex, standing, unique). **Not** the sha256 invitation scheme.
  Public page `/vendor-confirm/[token]` executes `confirm_project_vendor` via the anon client.
  Invalid token raises with no payload. Re-confirm is idempotent. No anon SELECT on the table.
- **Unattended agent JWT:** `SUPABASE_JWT_SECRET` signs a 30s user JWT (AGENT-01a). Protect like a
  service-role key. Never log it. Never use service-role as the request JWT for agent writes.
- **Cron:** `CRON_SECRET` bearer is the sole gate on `/api/cron/*`. Vercel Cron injects it;
  manual curl must too. Do not expose these routes without the secret.
- **Accounts UPDATE GRANT (0091):** authenticated members may UPDATE `accounts` rows that pass
  `"members update own account"` RLS. That is branding + `inquiry_slug`, not a general admin
  write. Do not add a project-member SELECT/UPDATE policy on `accounts`.
- **Seating / Notes / Budget ledger / most project-scoped writers:** after WRITE-01 (0071),
  authenticated **writes** gate on **`can_edit_project`**; **SELECT** stays **`can_access_project`**
  (split policies). Tab Calendar visibility is separate (CAL-04).
- **`guest_members` (0040, not rewritten in 0071):** SELECT `can_access_project`; INSERT/UPDATE/DELETE
  `can_edit_project` since day one. Live-confirmed. Not an open WRITE-01 hole.
- **`rsvp_attendees` (0039, not rewritten in 0071):** SELECT `can_access_project`; UPDATE/DELETE
  `can_edit_project`; **no INSERT** (`submit_rsvp` only). Live-confirmed. Not an open WRITE-01 hole.
- **`calendar_events` (FOR-ALL exception):** one combined policy — project branch is
  `can_edit_project` on **both** `using` and `with check` after 0071, so project-linked **reads and
  writes** share that gate. Account members still pass via `is_account_member`. Live-confirmed.
  Do **not** claim "SELECT remains `can_access_project`" for this table.
- **Branding:** `brand-media` public SELECT (storage carve-out); `get_project_branding` authenticated
  + `can_access_project` — **not** anon. Own-shell `getOwnAccountBranding` is a member read of
  `accounts` (venue + white-label gate in app code).
- **Team:** `account_invitations` authenticated member-only; accept RPC email-bound + business-kind
  check; last-member remove refused. No anon policy.
- **Demo:** IP hashes only in `demo_start_attempts`; purge via service_role Edge Function; no raw IPs.
- **Archive / contract templates / Contracts downloads / Vendor-media:** as recorded — account- or
  project-scoped, authenticated, no anon policy (except published website-media / brand-media
  carve-outs), signed URLs (60s) for private-bucket downloads (**incl. `vendor-media`**).
- **Gmail OAuth:** `gmail.send` sensitive scope → needs verification. Testing mode caps apply.
  **v33 reconnect hardening:** require `refresh_token`; `noStore` on credential reads; reconnect
  messaging; advance `to_contact` → `contacted` on successful send.
- **Signup:** `auth.signUp` only; no tenant created at signup.
- **Production infra:** prod belongs in a **separate Supabase org on Pro**. Fresh prod project,
  migrations **0001–0099** applied by hand once each in order (NEVER `db push`; deploy-batches OK for
  greenfield **then paste 0080–0099** — batches do not yet include them), storage buckets
  (`project-files` + `website-media` + **`vendor-media`** + **`brand-media`**) + policies recreated,
  Edge Function `purge-demo` deployed + scheduled, **Vercel Cron env** (`CRON_SECRET`, Resend,
  `SUPABASE_JWT_SECRET`, `INQUIRY_INBOUND_DOMAIN`, `RESEND_INBOUND_WEBHOOK_SECRET`), real SMTP,
  prod domain in auth redirect URLs.
  See the Launch Prep Runbook.
- Set Anthropic + Google Cloud + Stripe + Supabase billing/spend alerts.

---

## 13. Known caveats / things to verify

**Shipped (full product — residual paste / ops confirmation where noted).** Detail for each slice
is in §7 of this file. Schema numbers in §5.

- Foundation through website/RSVP/seating/budget/guests/invites/Soft stack — migrations **0001–0058**.
- **SEAT-12/13, NOTES-01, ASSIST-UI-01, CAL-02/03/04, VND-11/12, DASH-02/03, DEMO/TOUR, ONB-02…06,
  CON-04, AGR-01, WHITE-01/02, WRITE-01, RSVP-THROTTLE, DEMO-04/04b, TMPL-01, ENT-01/01a,
  PRICE-01/02/06/07/08, HYG-01/01a, WEB-REVAL, ASSIST-BUD, GMAIL-THREAD, TEAM-01, VENUE-01…07,
  LEAD-STALE, OVERDUE-01, CHECKOUT-RECONCILE-01, TRIAL-GUARD-01, MKT-01/02/03, ONBOARD-NUDGE-01,
  AUTO-01/02, AGENT-00/01/01a/02/03, AUTO-03a/03b, ACCT-GRANT-01,
  LEAD-EDIT-01, INQUIRY-EMBED-01, DEMO-ANON-01, WHITE-03, WORKFLOW-00…05,
  AUTH-GOOGLE-01, CONTACT-ROUTE-01, TASK-ASSIGN-01, TMPL-02, VND-13/13b, VND-LIB-01,
  CON-ARCHIVE-01, VND-16, VENUE-08, CAL-05, INV-06, TEAM-EMAIL-01, EMAIL-BRAND-01,
  VND-OUTREACH-MOBILE-01.**
- **PRICE-03/04/05 product path is superseded** (0076–0078 schema residual — do not schedule
  `charge-trial-balance` as the couple path).
- **WRITE-01 / 0071** closed the former "viewer can write" schema gap for listed tables; Access
  still does not offer `viewer`.
- **VENUE-06** replaced the tertiary welcome link with three equal-weight options; bootstrap
  mechanics (VENUE-04) unchanged.

**Open — v38 verification gap:** MKT-01/02/03, VENUE-06, WHITE-02, VENUE-07, and
ONBOARD-NUDGE-01 are code-shipped and were reported working, but the itemized live checkpoints
from each slice's original build prompt (equal visual weight across all three venue entry
points; a genuinely low-contrast color actually triggering the WHITE-02 warning; VENUE-07 copy
flipping correctly on a live plan-change test, not just on a venue-plan account; all four
ONBOARD-NUDGE-01 checkpoint bullets — both rows showing, each independent dismiss, persistence
across visits, no-backfill-needed on a pre-existing venue account) have not been individually
run and reported back. Do not treat these six as fully verified until that walk happens — same
posture already applied elsewhere in this document to CHECKOUT-RECONCILE-01.

**Open — v39 verification gap:** AUTO-01/02, AGENT-00/01/01a/02/03, AUTO-03a/03b, ACCT-GRANT-01,
and LEAD-EDIT-01 are code-shipped. Confirm: 0084–0091 pastes; a real AUTO-01 digest on an
uncovered installment; AUTO-02 email + `/vendor-confirm/[token]` idempotent re-click; AGENT-01
digest to the owner inbox; AGENT-02 note-or-silence; AGENT-03 Pending draft that does **not**
send until Approve; public `/inquire/[slug]` + inbound (if DNS live) landing as a lead; clay
reply-ready → Approve via Gmail; 0091 GRANT unblocking branding / inquiry-slug member writes;
lead Edit modal save + `friendlyLeadError` hiding raw PostgREST. Cron env is an ops gate.

**Open — v40 verification gap:** INQUIRY-EMBED-01, DEMO-ANON-01, WHITE-03, WORKFLOW-00…05,
AUTH-GOOGLE-01, and CONTACT-ROUTE-01 are code-shipped. Confirm: 0092–0096 pastes; a business
demo clone named Lumen Planning with `/inquire/demo-studio`; iframe snippet copies the prod
origin; white-labeled inquire page shows logo/accent + "Powered by First Look"; unknown slug is
invalid **before** submit; flipping `booking_confirmation` on drafts a `workflow_email` on Booked
(does **not** send until Approve); 3-day proposal template actually waits (dispatcher resume);
lost-lead template writes `leads.notes`; builder create/reorder/disable; delete blocked when run
history exists; Google Continue on login/signup; admin@ inbound lands on `CONTACT_NOTIFY_EMAIL`.
Cron `automation-dispatch` is an ops gate.

**Open — v41 verification gap:** TASK-ASSIGN-01, TMPL-02, VND-13/13b, VND-LIB-01,
CON-ARCHIVE-01, VND-16, VENUE-08, CAL-05, INV-06 / TEAM-EMAIL-01, EMAIL-BRAND-01, and
VND-OUTREACH-MOBILE-01 are code-shipped. Confirm: 0097–0099 pastes; assign a teammate and
filter the checklist; New Booking template yields `$0` planned; Search/Outreach/Booked tabs +
Still to book Ignore/Un-ignore; library delete blocked when linked; archive Delete + Edit-in-
project; Copy confirm link matches AUTO-02 URL; venue Billing cadence card; calendar chip opens
detail modal; project + Team invite emails arrive (or fallback link UI); AGENT-01 digest is
branded HTML with summary/highlights.

**Open — deferrals + gaps (current):**
- **CHECKOUT-RECONCILE-01 remaining gap:** no periodic reconciliation job exists for an account that
  abandons Checkout and never even returns to the success page (closed tab mid-flow) — the fallback
  only fires on the return leg. Lower-urgency. Re-read `reconcileCheckoutReturn` /
  `applyCheckoutSession` before extending. All three audiences received the `{CHECKOUT_SESSION_ID}`
  success-URL fix.
- **Rotate `STRIPE_SECRET_KEY`** if it was ever live-mode outside this dev machine (resolved but
  key hygiene is separate). Confirm `.env.local` holds `sk_test_...` before further Checkout testing.
- **0060–0070 / 0072–0099 hand-paste** still need confirmation where not already live-checked;
  **0071 LIVE VERIFIED**. Demo seeds + `purge-demo` deploy/schedule are separate applies.
  **0079–0083 are committed**. **0084–0099 on disk**. Vercel Cron +
  Resend inbound + `SUPABASE_JWT_SECRET` are ops gates, not schema.
- **DASH-03a (deferred) — wedding-card blurb.** Needs `projects.description` (**0100+**) AND an edit
  affordance. Deferred deliberately to avoid a dead write path.
- **PRICE-03/04/05 residual** — `stripe_payment_method_id`, claim/cancel RPCs, `charge-trial-balance`
  Edge Function. Product path gone; drop unscheduled. Do not wire a new $7 Checkout.
- **`rsvp_access_mode` read-dead (0054), not dropped** — drop candidate **0100+**.
- **`guests.meal_choice` inert; `guests.party_size` still written for create slots** — both drop in
  **MEAL-03a / 0100+**. (`rsvp_submissions.party_size` is a DIFFERENT column — still live/RPC-derived.)
- **`wedding_profile.traditions` write-dead** — drop unscheduled. Do not resurrect a write path.
- **`guests.email` UI-deprecated, kept** — email may still matter for invites.
- **Per-member RSVP status (model B) deferred.** GST-09 is household-badge only; DASH-03 confirmed-
  guest count is the same household-badge grain.
- **GST-12 association not editable after create** — deliberate for now.
- **Song `style=none` dead-toggle.** Leave for now.
- **Anon UPDATE grant on `guests`** — RLS-blocked; optional belt-and-suspenders revoke later.
- **Partner-side derive heuristic** — trailing-year strip + `&`/`and` split, backstopped by generic
  Partner 1/2.
- **Assistant guest-add path not updated** (§9) — predates GST-07/GST-12. **Write tools after
  ASSIST-BUD-01:** `create_agent_draft` (AGENT-03). Inquiry-reply is AUTO-03b cron, not a chat
  tool. Workflow email is WORKFLOW-03 dispatcher, not a chat tool.
- **`leads.estimated_guest_count` is written by extract + `submit_inquiry` (0090) but not shown or
  edited on the kanban / LEAD-EDIT-01 modal.** UI gap, not a missing column.
- **0091 GRANT must be pasted** or member `accounts` UPDATE (branding, inquiry slug) keeps failing
  before RLS. `ensureInquirySlug` currently uses service-role as a workaround.
- **AUTO-01/02 / AGENT-* / AUTO-03 / WORKFLOW-02 crons need `CRON_SECRET` + Resend (+
  `SUPABASE_JWT_SECRET` for unattended writes + inbound webhook secret/domain for AUTO-03a).** A
  file on disk is not a scheduled job.
- **Public form / inbound email do not fire `lead_created` workflows.** Only `createLead` does.
  `project_created` is schema-legal and unwired. Do not assume a template runs on inquiry capture.
- **Builder UI does not offer `lead_created`, `project_created`, or `create_task`.** Schema +
  executor may still accept them (except `project_created`, which has no dispatcher).
- **`clone_demo_account` does not clone automation tables.** Demo planners start with zero
  workflows.
- **Inquiry embed iframe `src` is production-origin hardcoded.** Local/staging form *links* use
  `window.location.origin`; pasted embeds always hit `www.usefirstlook.app`.
- **`guest_members.relationship` free-text + the relationship picklist** — deliberate.
- **0053 `files_vendor_link` + 0050 `registry_teardown` rationale uncaptured** — reconstruct before
  relying on internals.
- **Vendor-priority / formality influence is prompt-directive only.**
- **Checklist already-booked suppression has no structural backstop.**
- **Demo → real account conversion** — not shipped.
- **`viewer` invite** — product still deferred (WRITE-01 done). Update `lib/invitations/constants.ts`
  comment when offering.
- **Project and Team invites send best-effort Resend email** (INV-06 / TEAM-EMAIL-01); one-time link copy remains the fallback when send fails.
- **Venue Checkout is not a public marketing Checkout** — post-login `/account/venue-upgrade` only.
  `/for-venues` and `/pricing` are discoverability, not Checkout.
- **`getAccountContext` still takes the first membership by `created_at`** — a user on both a
  personal and a business account (possible after TEAM-01 accept while already a couple) is a
  sharp edge; not solved.
- **`budget_items.due_date` write-dead** (drop **0100+** after parity); reconciled payment schedule
  (model b) deferred; budget dashboard overhaul deferred (mockup-first); `budget_items.category`
  free-text + quick-add list deliberate. (Ledger writers now `can_edit_project`.)
- **CON-03 deferred**; CAL-01a deferred; contract category axis vendor-only; `{{amount}}` no project
  source (CON-04 generator deliberately excludes it).
- **`projects` has NO DELETE policy** (silent-no-op shape, unreached).
- **`assistant_messages` out of WRITE-01 scope** by design. **`outreach_messages` dual-gated in
  0090** (vendor = `can_access_project_vendor`; lead = `is_account_member`).
- **`guest_members.attending` default true, inert as shown status** — the badge is authoritative.
- **`website-media` / `brand-media` public SELECT have no published gate** — intentional.
  **`vendor-media` has no anon SELECT** — intentional.
- **`project_invitations.invited_by` / `accepted_by` have no FK to `auth.users`** — cosmetic.
- **`tasks.phase` free-text; `budget_items.category` / `timeline_events.owner`/`section` free-text** —
  deliberate; do not enum.

**Open — Soft stack / design:** Dom live Soft stack + LAND-01/01a walk — prior verified surfaces plus
**branding + accent picker / lock screen (locked group) / couple local trial → Monthly/Lifetime /
CAL-04 / Agreements / TMPL-01 / demo throttle UX / Team / venue upgrade + own-shell + venue copy +
setup nudge / vendor cards / stale-lead pills / View in Gmail / three-option welcome /
`/for-planners` + `/for-venues` / inquiry form + intake card + reply drawer / vendor-confirm /
Pending drafts / lead Edit modal / booked-card arrival+scope / Vendors three-tab + Still to
book / task assignees / calendar detail / Google login / invite email / branded digests**; Tier 1
date locale policy; optional Soft stack `reference.html` regenerate; legacy CSS aliases;
font-load scoping.

**Dev DB state (baseline — re-introspect before relying on rows):**
- `dominicciccaglione@gmail.com` — **personal**, "Dom & Jordyn 2027", wedding 2027-02-13. 12 guest
  households, every household ≥1 member (22 after the 0055 backfill). Song toggle state per §15 note.
  Seating at member grain (0059). Confirm **0060–0099** if using Calendar / vendor media / notes /
  association / sweetheart / demo / tours / onboarding / branding / write gates / throttles / billing /
  template clone / team seats / venue plan / Gmail threads / payment reminders / vendor confirm /
  agent drafts / inquiry slug.
- `d.ciccaglione1@gmail.com` — **business**, "Events by Jordyn". Projects include Mila & Griffin
  (planner-created, no `wedding_profile`, 2027-02-15, $40,000, 0 members — must remain), Matt & Courtney
  (2027-06-13), Bryce & Emma (no date set — budget/guest test project). Confirm `accounts.plan`
  after venue Checkout tests (should return to `planner` if canceled).
- `d.ciccaglione@icloud.com` — **orphaned auth user, 0 memberships** (invited-couple fixture).
> Confirm song-request toggles are OFF on both test projects post-verification if not already.
> Confirm at least one `is_demo_template` personal + business account before demo QA.
> Confirm Stripe test Price/Checkout env for couple monthly + lifetime, planner Monthly/Annual,
> and venue Monthly/Annual (four Price ids).

---

## 14. Roadmap

**Done (v1–v30):** unified shell + routing; timeline; couple onboarding → AI plan; AI assistant;
Contracts; lead pipeline; proposals → printable contract; Stripe billing foundation; website builder +
5-template gallery; public RSVP; **seating through SEAT-11**; Soft stack chrome; landing overhaul;
planner invites (INV-01…08); vendor category/status/removal + booked slots + packages; dance floor;
gift registry; meals + per-household gated RSVP; photo-led website; archive; planner workspace
expansion (DASH-01, VND-08/08a, CAL-01, CON-01/01a/02); the full budget money-tracking arc; **the
Guests-page rework (GST-03…09 / 0054–0058).** Migrations **0001–0058**.

**Done (v31 — Website-tab polish + per-member seating):**
- **WEB-EDITOR-02** — No schema. Section reorder (up/down) + collapsible editors + sticky preview.
- **WEB-STYLE-01** — No schema. Image border-shape options; timeline layout + centering.
- **RSVP-02** — No schema. Public RSVP form: email optional; self-report headcount removed (UI-only).
- **FIX-02** — No schema. Meal dropdown contrast fix.
- **SEAT-12** — **0059.** Per-member seating (member grain), applied live + visually verified.

**Done (v32 — Notes + assistant discovery + catch-up):**
- **NOTES-01** — **0062** (on disk). Notes action lifecycle + preview/modal board.
- **ASSIST-UI-01** — No schema. In-page `AskAssistantPrompt` on Overview + empty tabs.
- **CAL-02** — **0060** (on disk, catch-up). Calendar project-member RLS.
- **VND-11** — **0061** (on disk, catch-up). `vendors.instagram` + private `vendor-media` bucket.
- **DASH-02** — No schema (catch-up). Shared `ProjectOverview`.

**Done (v33 — Guest association + sweetheart + polish):**
- **GST-12** — **0063**. Plus-one / child association on `guest_members`.
- **SEAT-13** — **0064**. One sweetheart table per project.
- **CAL-03** — No schema. Calendar hues / chips / legend.
- **DASH-03** — No schema. Planner wedding cards (blurb → DASH-03a).
- **BUD polish** — No schema. Paid/actual category bars.
- **Gmail reconnect** — No schema. Refresh-token / reconnect hardening.

**Done (v34 — Demo + tours + onboarding polish + contract draft):**
- **DEMO-01/02/03** — **0065** + no-schema UI. Ephemeral demo accounts, marketing CTA, banner, billing
  bypass. Seeds separate.
- **TOUR-01** — **0066**. Page-tour dismissal + auto-fire / `?` replay (8 keys).
- **ONB-02** — **0067**. Category CHECKs + `include_*` + atomic `commit_wedding_plan`.
- **ONB-03** — No schema. Plan-scope UI + preview/Approve gating.
- **POLISH-01** — No schema. Soft-stack kind toggle; traditions write-dead; Decide Later.
- **ONB-04** — **0068**. Formality + priority vendor categories (prompt directives).
- **ONB-05** — **0069**. Already-booked categories + row-level vendor_targets commit filter.
- **CON-04** — No schema. Assistant-drafted contract templates (generate → preview → save).
- **AGR-01** — No schema (shipped with DEMO/TOUR; body-recorded in v35). Couple Agreements tab.

**Done (v35 — Branding + write gates + throttles + billing + CAL-04 + TMPL-01):**
- **WHITE-01** — **0070**. Planner white-label for CoupleShell.
- **WRITE-01** — **0071**. `can_edit_project` write policies.
- **RSVP-THROTTLE-01** — **0072**. Real RSVP velocity cap.
- **DEMO-04 / DEMO-04b** — **0073 / 0074** + `purge-demo` Edge Function.
- **ONB-06** — **0075**. Planner bootstrap without placeholder project.
- **CAL-04** — No schema. Invited-couple Calendar tab.
- **TMPL-01** — **0079**. Project structure clone.
- **ENT-01 + PRICE-01/02/06** — lock screen / planner trial / paid Checkout / Portal.
  **PRICE-03/04/05 product superseded in v36.**
- **HYG-01 / HYG-01a** — No schema. Stale design HTML deleted; Google attribution hex documented.
- **WEB-REVAL-01** — No schema. Public revalidation.
- **ASSIST-BUD-01** — No schema. Assistant budget/payment tool coverage; retires stale `getBudget`.

**Done (v36 — Team + venue + couple monthly/lifetime + vendor cards + staleness):**
- **PRICE-07** — No schema. Couple local 7-day trial (no Stripe objects).
- **PRICE-08** — No schema. Couple Monthly $10 / Lifetime $99 Checkout; Portal extended.
- **GMAIL-THREAD-01** — **0080**. Outreach `gmail_thread_id` + View in Gmail.
- **TEAM-01** — **0081 + 0082**. Business account seats; Team page; account-invite cookie path.
- **VENUE-01** — **0083**. `accounts.plan`; own-shell branding for venue + white-label.
- **VENUE-02 / 02b / 03** — No schema. Venue Checkout + webhook plan flip + discoverability.
- **VND-12** — No schema. Vendor library card grid (`VendorLibraryRow` deleted).
- **LEAD-STALE-01** — No schema. 14-day derived stale-lead pills.
- **ENT-01a** — No schema. Lock screen in `app/(locked)/`.
- **OVERDUE-01** — No schema. `isTaskPastDue` single-sourced for tasks.

**Done (v37 — Venue signup shortcut + trial parity + reconciliation):**
- **VENUE-04** — No schema. Venue-intent bootstrap (`venueIntent` request-only) routes to
  `/account/venue-upgrade`. UI later replaced by VENUE-06; mechanics unchanged.
- **VENUE-05** — No schema. Local trial option on venue-upgrade, reuses `startPlannerTrial`.
- **CHECKOUT-RECONCILE-01** — No schema. Synchronous Checkout-return fallback
  reconciliation via `applyCheckoutSession`.
- **TRIAL-GUARD-01** — No schema. Trial guards no longer block on a null-status
  Checkout-abandonment stub.

**Done (v38 — Marketing landings + venue first-class entry + branding picker + venue copy + nudge):**
- **MKT-01** — No schema. Homepage planner/venue-first reposition; hero preview Leads/Vendors/Contracts.
- **MKT-02** — No schema. `/for-planners` dedicated landing.
- **MKT-03** — No schema. `/for-venues` dedicated landing; nav wired.
- **VENUE-06** — No schema. Three equal-weight welcome options; lock-screen venue CTA; billing
  Upgrade-to-Venue card.
- **WHITE-02** — No schema. Accent presets + picker + client-side contrast warning.
- **VENUE-07** — No schema. Display-only venue vocabulary via `getCopy` / `accounts.plan`.
- **ONBOARD-NUDGE-01** — No schema. Post-venue-Checkout branding + Team nudge on
  `/account/venue-upgrade` via `user_tours` storage keys.

**Done (v39 — Rule-based + agentic automation + inquiry CRM + accounts GRANT + lead edit):**
- **AUTO-01** — **0084**. Payment Schedule Watch (daily cron, waterfall, Resend digest).
- **AUTO-02** — **0085**. Booked-vendor T-30/T-7/T-2 countdown + `/vendor-confirm/[token]`.
- **AGENT-00** — **0086**. `agent_run_log` + `agent_drafts` plumbing.
- **AGENT-01** — No schema. Weekly synthesis, read-only, send-to-self digest.
- **AGENT-01a** — **0087**. Unattended write impersonation + smoke route.
- **AGENT-02** — No schema. Daily implication `add_note` (`needs_action`) or silence.
- **AGENT-03** — **0088**. Weekly vendor-outreach drafts; Pending approve/reject; never auto-send.
- **AUTO-03a** — **0089**. Inquiry capture: `inquiry_slug`, `/inquire/[slug]`, Resend inbound.
- **AUTO-03b** — **0090**. Extract / compose / approve; `estimated_guest_count`; outreach XOR.
- **ACCT-GRANT-01** — **0091**. `GRANT UPDATE` on `accounts` to `authenticated`.
- **LEAD-EDIT-01** — No schema. Shared `Modal` + lead Edit modal.

**Done (v40 — Inquiry embed + demo anonymize + CRM workflow engine + Google auth + admin relay):**
- **INQUIRY-EMBED-01** — No schema. Iframe snippet on the intake card; inbound-DNS copy removed.
- **DEMO-ANON-01** — **0092**. Demo clones named Lumen Planning; `demo-studio` inquiry slugs.
- **WHITE-03** — **0093**. Anon `get_inquiry_branding`; branded `/inquire/[slug]` embed.
- **WORKFLOW-00** — **0094**. `automation_workflows` / steps / runs / run_log.
- **WORKFLOW-01** — No schema. Lead event dispatch + impersonated step executor.
- **WORKFLOW-02** — No schema. Delay halt + daily `/api/cron/automation-dispatch`.
- **WORKFLOW-03** — **0095**. `send_email` → pending `workflow_email`; Approve via Gmail.
- **WORKFLOW-04** — No schema. `/automations` builder UI.
- **WORKFLOW-05** — **0096**. One-click templates (`template_key`).
- **AUTH-GOOGLE-01** — No schema. Continue with Google on login/signup.
- **CONTACT-ROUTE-01** — No schema. Admin inbound → `CONTACT_NOTIFY_EMAIL` on the same webhook.

**Done (v41 — Task assignment + Vendors tabs + invites email + calendar detail + library manage):**
- **TASK-ASSIGN-01** — **0097**. `tasks.assigned_to` + `list_project_assignees` + board filter.
- **TMPL-02** — **0098**. Template clone `planned_amount = 0`.
- **VND-13 / VND-13b** — **0099**. Search/Outreach/Booked tabs + budget Still to book + ignore list.
- **VND-LIB-01** — No schema. Library delete when unused; unlink from booking.
- **CON-ARCHIVE-01** — No schema. Archive delete + Edit-in-project.
- **VND-16** — No schema. Copy confirm link on booked card.
- **VENUE-08** — No schema. Venue Billing cadence card.
- **CAL-05** — No schema. Calendar event detail modal + hue retune.
- **INV-06 / TEAM-EMAIL-01** — No schema. Best-effort Resend on project + Team invites.
- **EMAIL-BRAND-01** — No schema. Branded AGENT-01 digest + JSON summary/highlights.
- **VND-OUTREACH-MOBILE-01** — No schema. Outreach mobile single-line chrome.

Current through **0099** (on disk); next-free **0100** (MEAL-03a incl. `party_size`,
`budget_items.due_date` drop, `rsvp_access_mode` drop, optional `traditions` drop, DASH-03a
`projects.description`, optional PRICE-03/04/05 residual drop — all **0100+**).

**In progress:** confirm **0060–0099 hand-pastes** (+ demo seeds + `purge-demo` + Vercel Cron env +
Google Auth provider + admin inbound env); the **broad** Dom Soft stack + LAND-01 live visual
checkpoint (prior unwalked surfaces + **Team / venue / vendor cards / Vendors tabs / Still to book /
task assignees / stale leads / lock group / couple Monthly-Lifetime / View in Gmail / three-option
welcome / venue-upgrade trial + setup nudge / accent picker / `/for-planners` + `/for-venues` /
inquiry form + embed + branded inquire / reply drawer / vendor-confirm / Pending drafts / lead Edit /
`/automations` templates + builder / Google login / invite email / calendar detail / branded
digests**).
CHECKOUT-RECONCILE-01 remaining gap: abandoned Checkout with no return-page hit (no periodic job).

**Remaining couple side:** moodboard; **MEAL-03a (0100+, drops `guests.meal_choice` + `guests.party_size`)**;
**`budget_items.due_date` drop (0100+, after parity)**; **`rsvp_access_mode` drop (0100+)**; optional
**`wedding_profile.traditions` drop**; **DASH-03a (wedding-card blurb — `projects.description` 0100+ +
editor)**; optional website-media orphan GC; budget dashboard overhaul (mockup-first); optional
reconciled payment schedule (model b); **optional per-member RSVP status (guest model B)**; optional
assistant write for note `action_status`; optional post-create edit for GST-12 association; demo →
real account conversion.

**Remaining planner side:** invoicing accepted proposals; deeper CRM;
`viewer` invite (**WRITE-01 done — product decision remains**); CAL-01a (task-due calendar overlay);
CON-03 (real PDF); account-role hierarchy (explicitly not TEAM-01); AUTO-01 reminder-sent UI /
digest-frequency controls (deferred); surface `estimated_guest_count` on the lead Edit modal;
retire `ensureInquirySlug` service-role write after 0091 is live; wire `lead_created` /
`project_created` in the builder (schema-legal); a time-based "quiet lead" template (cron-scan
family, not WORKFLOW event hooks); venue-copy wrap for the Automations sidebar label. PRICE-02 /
VENUE-02 paid Checkout are **shipped**. AUTO-01/02 / AGENT-00…03 / AUTO-03 / WORKFLOW-00…05 / TASK-ASSIGN-01 / TMPL-02 / VND-13 are
**shipped on disk** (paste + Cron env remain).

**Remaining seating:** SEAT-07 assistant mock-up; optional per-seat UI depth.

**Phase 4 — bridge:** lead→project conversion. **Re-audit every write policy when this ships.**

**Phase 5 — automation (shipped on disk — paste + Cron env remain):** three tracks. **Rule-based
cron** (AUTO-01 payment-schedule watch, AUTO-02 countdown confirmations) — date math in, template
email out, no LLM. **Agentic** (AGENT-01/02/03, AUTO-03) — same assistant tool loop (AUTO-03b is
CON-04 JSON, not the project loop); cron/webhook entry points. **CRM workflows** (WORKFLOW-00…05)
— account-scoped event + delay engine; no LLM; `send_email` is propose-then-approve.
ASSIST-UI-01 is discovery only — not Phase 5. Architecture companion remains
`AGENTIC_AUTOMATION_v1.md` for autonomy tiers and deferred v2 (cross-project prioritization,
real-time DB triggers, third-party auto-send). Do not fold LLM cron into the AUTO-01/02 route.
Do not fold CRM workflows into either.

**Decided (current — code-verified):**
- **Venue is a first-class welcome option** (VENUE-06) but still **not** a third `accounts.kind`.
  `venueIntent` is request-only; `plan='venue'` flips only on a confirmed paid subscription.
- **Venue display copy is call-site-resolved** from `accounts.plan` (`getCopy`) — do not fork
  routes or stage vocabularies.
- **Brand accent is one free-text hex.** Presets/picker are UI sugar; contrast warning does not
  block save; do not persist a preset id.
- **ONBOARD-NUDGE-01 keys are storage-only** — reuse `dismissTour` / `user_tours`; do not auto-fire
  as page tours.
- **Marketing is planner/venue-first** (MKT-01…03). In-app couple product is unchanged. Public
  `/pricing` still does not start venue Checkout.
- **Local trial is uniform across planner lock screen and venue-upgrade** (`startPlannerTrial`);
  trial never sets `plan='venue'`.
- **A `subscriptions` row with `status = null` is not a subscription** (TRIAL-GUARD-01).
- **Checkout-return reconciliation must reuse `applyCheckoutSession`** — webhook stays primary
  for every non-return event.
- **Do not add `trial_period_days` to any Checkout Session.**
- **Couple paid path is local trial then Monthly $10 or Lifetime $99** — not $7+$92.
- **Team seats are business-only, flat, and parallel to project invitations** (two tables, two
  cookies). `account_members.role` is unused.
- **Venue own-shell white-label requires `plan = 'venue' AND white_label_enabled`.** Ordinary
  planner chrome stays First Look. CoupleShell invited-viewer branding is unchanged.
- **Venue Checkout is post-login** (`/account/venue-upgrade`).
- **Webhook flips `accounts.plan` from venue price ids only**; fail-closed to `planner`; does not
  touch brand columns.
- **LEAD-STALE-01 is derived at read** (14 days, non-terminal); no stale column.
- **ENT-01 lock screen lives in `(locked)`** — do not pathname-branch `(app)/layout`.
- **`isTaskPastDue` is the single task-overdue helper** (OVERDUE-01).
- **WRITE-01 write policies use `can_edit_project`; offering `viewer` is still a product deferral.**
- **CAL-04 / CAL-06 is the only role-aware tab exception** (invited couple + collaborator → Calendar).
- **Planner and couple trial is local (no Stripe objects) until paid Checkout.**
- **Demo throttle thresholds live only in RPCs**; purge is Edge Function, not pg_cron.
- **ONB-06: business accounts start with zero projects.**
- **TMPL-01 clones structure only** (no dates/status/actuals/links).
- **RSVP velocity throttle is real and RPC-owned** (0072).
- **RSVP is gated-only** — no open/anonymous path; no fuzzy attendee-name match; household badge
  is the shown status.
- **Paid is ledger-only**; installment coverage is derived at read; budget filters never rewrite
  the global headline.
- **Partner-side stores a token** (`partner_1`/`partner_2`), never Bride/Groom or a name string.
- **Relationship picklist is free-text / writer-guarded**, not a vendor-category vocabulary.
- **No PDF library** — printable surfaces are HTML + `@media print`.
- **Marketing copy never leads with "AI."**
- **AUTO-01/02 are rule-based** (no LLM). AGENT-01/02/03 reuse the chat tool loop. AUTO-03b is
  CON-04 JSON, not the project loop. WORKFLOW-00…05 is an event + delay CRM engine (no LLM).
  Third-party sends are propose-then-approve. Unattended writes impersonate a member (never
  service-role as the request JWT). Every agentic run writes `agent_run_log`, including
  failures. Every workflow step writes `automation_run_log`.
- **Inquiry capture is slug-resolved server-side.** Form + inbound email become a `leads` row.
  `inquiry_slug` is business-only and lazy-generated. Authenticated `accounts` UPDATE requires
  0091's GRANT. Demo clones always get `demo-studio`. White-label brands the public form
  (WHITE-03) via `get_inquiry_branding` — never anon SELECT on `accounts`.
- **`create_agent_draft` never sends.** Chat tool is vendor_outreach only. Inquiry replies are
  AUTO-03b cron + human Approve via Gmail. Workflow emails are WORKFLOW-03 dispatcher + the
  same Approve path.
- **Shared `Modal` is the overlay primitive** for new chrome dialogs (LEAD-EDIT-01).
- **CRM workflow failure never fails the lead mutation.** `change_lead_stage` in the executor
  does not re-dispatch. Public inquiry capture does not fire `lead_created`.
- **Templates are `automation_workflows` rows** with `template_key` set. Off = disable, not
  delete. At most one row per `(account, template)`.
- **Business demo clones are named Lumen Planning.** Do not slugify a live studio into a public
  demo inquiry URL.
- **Checklist assignees are optional** (`tasks.assigned_to`); clones never copy them.
- **Template budget clone never copies dollar amounts** (TMPL-02 — always `planned_amount = 0`).
- **Still to book is budget-mapped + ignore list**, not `vendor_targets` status (VND-13).
- **Project and Team invites send best-effort Resend email**; link copy is the fallback.
- **Google sign-in is first-class on login/signup**; Gmail OAuth remains outreach-only.
- **AGENT-01 digests are branded HTML** from JSON summary/highlights (EMAIL-BRAND-01).

---

## 15. Start here next (pick-up point)

The couple product is feature-complete, shareable, and payable. The planner/venue product has a CRM
+ collaborator invites + **account Team seats** (+ invite email) + wedding archive + Vendor library
**(card grid + detail/portfolio + delete/unlink)** + **CoupleShell white-label + venue own-shell +
accent picker** + authorable Calendar **(+ event detail)** + **wedding cards** + **template clone
(amounts start at $0)** + cross-project Contracts archive with templates **(+ assistant-drafted
templates + archive manage)** + **venue first-class signup / copy / setup nudge / Billing cadence**
+ **inquiry intake (public form + embed snippet + white-label) + reply drafts** + **lead Edit modal**
+ **payment-schedule watch** + **vendor countdown confirm** + **weekly branded synthesis /
implication notes / outreach drafts** + **CRM workflow templates + builder** + **checklist task
assignment** + **Vendors Search/Outreach/Booked + budget Still to book** + **Google sign-in**.
Marketing is **planner/venue-first** (`/` + `/for-planners` + `/for-venues` + `/pricing`). Schema
pastes for **0060–0099** still need confirmation unless Dom closed them. Plan is **couples-first
launch** with B2B marketing. Bible at **v41**. Schema through **0099**; next-free **0100**. This
document is self-contained.

**Do not** resume a Modern romantic / VND-01 layout pass; **do not** reorder website sections with
@dnd-kit or pull @dnd-kit into the website editor; **do not** fork a second collapse affordance for the
section editor; **do not** import Supabase or `lib/partner-sides.ts` into `components/website/` (incl.
via the sticky preview); **do not** treat Calendar as strictly personal-only (CAL-04 / CAL-06 invited
couples and collaborators see it); **do not** casually extend that role exception to other tabs; **do
not** treat Registry as a workspace tab; **do not** re-inline task overdue (OVERDUE-01 —
`isTaskPastDue` is the helper); **do not** drop the DASH-03a blurb deferral; **do not** trust
"next-free 0084" (0084–0099 taken — next-free is **0100**); **do not** treat WRITE-01 as unfinished
schema work (shipped; `viewer` invite is product-deferred); **do not** assume planner bootstrap
creates a placeholder project (ONB-06); **do not** drop `guests.meal_choice` / `guests.party_size`
until MEAL-03a, or `budget_items.due_date` / `rsvp_access_mode` / `traditions` until parity
(**0100+**); **do not** claim `party_size` is fully inert; **do not** resurrect a `traditions` write
path; **do not** restore an open/anonymous RSVP path or a guest-facing self-report headcount as the
count source; **do not** auto-match RSVP attendee names to `guest_members`; **do not** treat
`guest_members.attending` as the shown RSVP status (the badge is); **do not** persist a client song
when the toggle is off; **do not** drop the 0072 RSVP throttle when replacing `submit_rsvp`; **do not**
add anon SELECT on `registry_claims` / `rsvp_attendees` / `guest_members` / `guests` /
`rsvp_submissions` / `budget_payments` / `payment_schedule` / `notes` / `user_tours` /
`demo_start_attempts` / `inquiry_form_attempts` / `payment_reminder_log` / `agent_run_log` /
`automation_run_log` / `agent_drafts` / `account_invitations` / `automation_workflows` /
`automation_steps` / `automation_runs` / the seating tables / **`vendor-media`**; **do not**
add a published gate to `website-media` / `brand-media` SELECT; **do not** white-label ordinary
planner chrome or public websites (venue own-shell is the only PlannerShell exception); **do not**
reuse `project_invitations` for Team seats or parse `/invite/account/` as a project token; **do not**
read `account_members` without filtering `user_id`; **do not** treat `account_members.role` as
authorization; **do not** revive the $7+$92 couple trial or schedule `charge-trial-balance` as the
live path; **do not** start venue Checkout from public `/pricing`; **do not** store a `leads.stale`
column; **do not** pathname-branch `(app)/layout` for the lock screen; **do not** lead marketing copy
with "AI"; **do not** write `archived_at` except via `set_project_archived`; **do not** harden
`budget_items.category` / `timeline_events.owner`/`section` / `guest_members.relationship` to enums;
**do not** set either pending-invite cookie from a page render (middleware only); **do not**
reintroduce a review/apply RSVP inbox; **do not** treat ASSIST-UI-01 as proactive automation
(Phase 5); **do not** encode sweetheart (or any table kind) in a status colour; **do not** invent
title-string heuristics to filter already-booked checklist tasks; **do not** emit `{{amount}}` from
CON-04's generator; **do not** copy template `rsvp_token`s or published website slugs in demo clones;
**do not** mirror throttle constants in app code; **do not** add `trial_period_days` to any Checkout
Session (venue, planner, or couple) — the local-trial mechanism stays uniform and Stripe-independent
across every audience; **do not** treat a `subscriptions` row's mere existence as evidence of a real
subscription in any new guard — check `status IS NOT NULL`, reusing TRIAL-GUARD-01's definition;
**do not** let Checkout-return reconciliation write without verifying the session's
customer/metadata against the authenticated account; **do not** demote venue back to a tertiary
welcome link — it is a first-class equal-weight option; **do not** add `kind='venue'`; **do not**
auto-fire `venue_branding_nudge` / `venue_team_nudge` as page tours; **do not** persist a brand
preset id; **do not** hardcode PlannerShell "Leads"/"New wedding"/"Weddings" instead of `getCopy`;
**do not** treat MKT-01/02/03, VENUE-06, WHITE-02/03, VENUE-07, ONBOARD-NUDGE-01, AUTO-01/02,
AGENT-00…03, AUTO-03, ACCT-GRANT-01, LEAD-EDIT-01, INQUIRY-EMBED-01, DEMO-ANON-01, WORKFLOW-00…05, AUTH-GOOGLE-01, CONTACT-ROUTE-01, TASK-ASSIGN-01, TMPL-02, VND-13,
VND-LIB-01, CAL-05, INV-06, TEAM-EMAIL-01, or EMAIL-BRAND-01 as live-checkpoint-verified — they are
code-shipped only until the itemized checkpoints are run; **do not** auto-send vendor outreach,
inquiry replies, or workflow emails from cron; **do not** use service-role as the request JWT for agent writes;
**do not** skip `agent_run_log` / `automation_run_log` on a failed run; **do not** client-supply `account_id` to
`submit_inquiry`; **do not** white-label `/w/[slug]`; **do not** slugify a live business name into a
demo inquiry URL; **do not** route workflow `change_lead_stage` through `updateLeadStage` (cascade);
**do not** let a failed workflow fail a lead mutation; **do not** pull @dnd-kit into `/automations`;
**do not** CHECK-constrain `template_key` (keys live in `lib/automations/templates.ts`).

**A. Confirm hand-paste of 0060 → … → 0099** (in order) + apply demo seeds + deploy/schedule
`purge-demo` (do **not** treat `charge-trial-balance` as required couple ops). Checkpoint: prior
0060–0079 items plus `outreach_messages.gmail_thread_id`; `account_invitations` + fellow-member
SELECT + business-only INSERT/accept; `accounts.plan` + CHECKs; Team invite round trip;
venue Checkout flips `plan`; couple local trial → Monthly/Lifetime; `payment_reminder_log`;
`confirm_project_vendor` + unique `confirm_token`; `agent_run_log` + `agent_drafts` policies;
`accounts.inquiry_slug` + `submit_inquiry`; outreach XOR + `estimated_guest_count`;
`GRANT UPDATE` on `accounts` to authenticated; demo clones named Lumen Planning with
`demo-studio` slug; `get_inquiry_branding`; four automation tables + `send_email` /
`workflow_email` / `template_key`; `tasks.assigned_to` + `list_project_assignees`; template clone `$0` planned; `ignored_vendor_categories`.

**A′. `isTaskPastDue` single-source is done on disk (OVERDUE-01).** Spot-check that Overview,
assistant `getChecklist`, wedding cards, planner urgent, and calendar **task** overlays import
`lib/task-overdue.ts`. Do not collapse budget/schedule `due_on < today` into it.

**B. Close the broad Soft stack + LAND-01/01a visual checkpoint** — still unwalked or newly shipped:
Notes / AskAssistantPrompt / Vendor detail **+ card grid** / Calendar (**CAL-03 + CAL-04**), GST-12 /
SEAT-13 / DASH-03, demo CTA + banner + throttle UX, page tours, 6-step onboarding, CON-04,
**Agreements**, **Branding + accent picker**, **lock screen (`(locked)` group)**, **couple local trial →
Monthly/Lifetime**, **planner trial → paid**, **venue upgrade + own-shell + venue copy + setup nudge**,
**Team**, **stale-lead pills**, **View in Gmail**, **TMPL-01 New wedding clone**, **three-option
welcome**, **venue-upgrade trial**, **`/for-planners` + `/for-venues`**, **`/inquire/[slug]` (incl.
embed branding + invalid-slug)**,
**`/vendor-confirm/[token]`**, **InquiryIntakeCard (form link + iframe) + reply drawer + lead Edit
modal**, **Pending drafts**, **booked-card arrival/scope**, **`/automations` templates + builder**, **Vendors Search/Outreach/Booked + Still to book**,
**task assignees**, **calendar detail**, **Google login**, **invite email**, **branded digests**,
planner dashboard/leads/billing/Access, `/vendors`,
`/calendar`, `/contracts`, landing, `/pricing`, login, `/invite/[token]`, `/invite/account/[token]`,
`/w/[slug]` date hydration. Confirm no hydration mismatch. Fix only real regressions.

**C. Invite Jordyn for real** (prefer an INV-07 collaborator invite; confirm
`project_members.role = 'collaborator'` in SQL after accept). Confirm the invited **collaborator**
**does** see the Calendar tab (CAL-06) and can create/edit/delete project-linked events; confirm an
invited **couple** still does (CAL-04). Confirm Agreements stays hidden for both. Optionally smoke
a **TEAM-01** invite to a second planner email (same business book, not a project member).

**D. Apply + checkpoint any un-pasted migrations through 0099 + demo seeds + `purge-demo` +
Vercel Cron env (`CRON_SECRET`, Resend, `SUPABASE_JWT_SECRET`, inbound domain/webhook secret,
`ADMIN_INBOUND_ADDRESS`, `CONTACT_NOTIFY_EMAIL`) + Google OAuth provider in Supabase Auth.**
A file on disk is not applied, and a `vercel.json` cron is not a live schedule until deployed.

**E. MEAL-03a — drop `guests.meal_choice` AND `guests.party_size`. Migration 0100+** (after confirming
create-form no longer needs `party_size`; the `rsvp_submissions.party_size` column stays).

**F. Drop `budget_items.due_date`, `rsvp_access_mode`, and optionally `wedding_profile.traditions`.
Migration 0100+** — only after confirming parity. Optional: drop PRICE-03/04/05 residual
(`stripe_payment_method_id` if unused, claim/cancel RPCs, undeploy `charge-trial-balance`).

**G. `viewer` invite (optional, post-WRITE-01).** Product decision only — write gates are done. If
offering, update Access allowlist + constants comment and smoke a read-only invite round trip.

**H. Budget dashboard overhaul (mockup-first).** Aesthetic; data model complete.

**I. Launch (after paste confirmation + visual QA).** Separate prod Supabase org on Pro + migrations
**0001–0099** (+ 0100 if MEAL-03a / drops shipped) by hand — never `db push` — + storage buckets
(`project-files` + `website-media` + **`vendor-media`** + **`brand-media`**) + `purge-demo` + SMTP +
**demo template seeds**; Vercel + domain + env (**incl. `CRON_SECRET`, Resend, `SUPABASE_JWT_SECRET`,
`INQUIRY_INBOUND_DOMAIN`, `RESEND_INBOUND_WEBHOOK_SECRET`**); Stripe live + webhook + Portal + Tax +
**couple monthly + lifetime + planner + venue Prices**; prod Places key; Gmail testing mode; privacy
+ ToS; monitoring; **full prod smoke** — real signup (couple + planner-with-zero-projects), deliberate
double-click, a couple + collaborator + **invited-couple Calendar** round trip, **Team invite
round trip**, planner New-wedding create **with/without template clone**, archive/unarchive, vendor
library **cards** + portfolio, calendar round trip, budget payment + schedule + paid/actual bar,
per-member seating + sweetheart, guest association add, gated RSVP + throttle, website publish
revalidation, AskAssistantPrompt, notes needs-action → done, CON-04 generate, **branding on
CoupleShell**, **venue own-shell if piloting**, **lock screen → local trial → Monthly/Lifetime**,
**demo CTA + purge path**, page tour, 6-step onboarding Approve, **View in Gmail** after outreach
send, **stale-lead pill** on an untouched lead, **inquiry form round trip + branded embed + reply
approve**, **workflow template on + Approve send**, **vendor-confirm link**, **Pending outreach
draft approve**.

**J. Planner depth / revenue (post-launch).** Invoicing; optional `viewer`
invite; CAL-01a; CON-03; reconciled payment schedule (model b); **guest model B**; lead→project
conversion (Phase 4 — re-audit write policies); demo → real account conversion; optional
account-role hierarchy (not implied by TEAM-01).

**K. Seating — remaining (OPTIONAL).** SEAT-07 assistant mock-up; per-seat UI depth.

**L (other rounding-out):** moodboard; assistant tools for leads/proposals/RSVP/seating/invitations/
calendar/templates/team (re-run the §9 write-tool audit when any ship); **update/retire the assistant guest-add path for GST-07/GST-12 fields**;
optional post-create GST-12 association edit; **DASH-03a wedding-card blurb**; `projects` DELETE policy
decision; website caching; website-media orphan GC; currency-helper consolidation;
**reconstruct 0050 `registry_teardown` + 0053 `files_vendor_link` rationale**; optional
Soft stack `reference.html`; retire CSS aliases; font-load scoping; countdown + calendar +
budget/guest-date hydration harden; optional Calendar/Access/Timeline/
Contracts/Team tours; append 0080–0099 into `supabase/deploy-batches/` when convenient;
surface `estimated_guest_count` on lead Edit; retire `ensureInquirySlug` service-role write after
0091 is live; wire builder UI for `lead_created` / `project_created`; time-based quiet-lead
template (cron-scan family).

**M. Automation ops.** Three tracks, all **on disk**. AUTO-01/02 (rule-based cron). AGENT-00/01/01a/02/03
+ AUTO-03 (assistant loop / CON-04 JSON). WORKFLOW-00…05 (CRM event + delay). Remaining work is
paste + Cron env + live checkpoints, not a greenfield build. Agentic spec companion is
`AGENTIC_AUTOMATION_v1.md`. Do not fold LLM cron into AUTO-01/02. Do not fold CRM workflows into
either. Do not auto-send to third parties. Do not route workflow stage changes through
`updateLeadStage`.

**Recommended path:** **paste + checkpoint 0060–0099 + demo seeds + `purge-demo` + Cron/Resend/JWT
env (A/D)** → **close the broad visual checkpoint + invite Jordyn (+ optional Team invite) (B/C)**
→ **MEAL-03a + due_date/rsvp_access_mode/traditions drops (E/F)** → **budget dashboard mockup (H)**
→ **Launch (I)** → optional `viewer` (G) → invoicing → CAL-01a / CON-03 / reconciled
schedule / guest model B → conversion (J) → remaining L. Re-read `reconcileCheckoutReturn` /
`applyCheckoutSession` before extending Checkout return handling. When extending **agentic**
automation, read **M** / `AGENTIC_AUTOMATION_v1.md`. When extending **CRM workflows**, read §4 /
§7 WORKFLOW-00…05 in **this** file — do not treat AGENT-01/02 autonomy as precedent for
auto-send, and do not invent a second tool-definition set.
