# Wedding Planning SaaS — Project Bible (v35)

Canonical state document. **Supersedes v34.** Drop this into the Project's instructions/knowledge so
any new chat picks up cold. Lives in-repo at `PROJECT_BIBLE_v35.md`. The repo's `.cursor/design.mdc`,
`app/globals.css`, and `supabase/migrations/` remain the live source of truth; this summarizes them
and the decisions behind them. Current through migration **0079** (on disk). **Git:** **0070–0078
are committed** (across `3d50a3d` / `97c234a` / `4d5bbcd` / `9a0e267`); **only 0079 is untracked** —
not a whole-batch untracked set. **next-free migration is 0080**. Fresh-install SQL bundles live under
`supabase/deploy-batches/` (batch1–4) — convenience only; hand-paste of numbered migrations remains
canonical for incremental applies.

**v35 records everything shipped since v34** (branding, WRITE-01 write gates, RSVP/demo throttles +
purge, planner bootstrap without a placeholder project, invited-couple Calendar, couple trial billing
+ entitlement lockouts, project-template clone, design hygiene) and corrects body drift found vs disk.
Everything in v34 that isn't touched below carries forward.

| Slice | What | Schema |
|---|---|---|
| **WHITE-01** | Planner white-label: `accounts.white_label_enabled` / `brand_name` / `brand_logo_url` / `brand_accent_color` (business-only CHECK); public `brand-media` bucket; `get_project_branding` RPC (authenticated); CoupleShell logo/name/accent override for invited project viewers. Planner chrome stays First Look. | **0070** |
| **WRITE-01** | Project-scoped **write** policies → `can_edit_project` (SELECT stays `can_access_project` on split-policy tables). Covers budget/files/guests/notes/schedule/project_vendors/tasks/timeline/vendor_targets/profile/websites, seating INSERT/UPDATE/DELETE, rsvp_submissions UPDATE/DELETE, and the calendar `FOR ALL` project branch. **Skipped (already correct):** `guest_members` — SELECT `can_access_project` + INSERT/UPDATE/DELETE `can_edit_project` since **0040**; `rsvp_attendees` — SELECT `can_access_project` + UPDATE/DELETE `can_edit_project` since **0039**, no INSERT (RPC-only). Out of scope: `assistant_messages`, `outreach_messages`. | **0071** |
| **RSVP-THROTTLE-01** | Real velocity cap inside `submit_rsvp`: ≤3 submissions / household / 1 minute (constants only in RPC). Gated token + honeypot + 0058 badge auto-populate unchanged. | **0072** |
| **DEMO-04** | Demo purge + IP throttle log: `demo_start_attempts`, `try_record_demo_start`, `purge_demo_accounts` / `purge_demo_auth_users` (service_role). Edge Function `purge-demo` (manual deploy; pg_cron not enabled). | **0073** |
| **DEMO-04b** | IP throttle folded into `clone_demo_account` via PostgREST `request.headers` XFF → hashed `try_record_demo_start` on every call (incl. idempotent return). Server-brokered `startDemoAction`. | **0074** |
| **ONB-06** | Business bootstrap creates account + `account_members` only — **no placeholder project**. Personal path unchanged. `bootstrap_account_and_project` returns `null` for business. | **0075** |
| **PRICE-03** | Couple $7 trial-week Checkout (`mode=payment`); saves card via `setup_future_usage`; `subscriptions.stripe_payment_method_id`. | **0076** |
| **PRICE-04** | Day-7 $92 off-session charge: `claim_couple_trial_charges` / `mark_couple_trial_charge_failed` (service_role); Edge Function `charge-trial-balance`; transitional status `charging`. | **0077** (+ **0078** claim exclude) |
| **PRICE-05** | Couple cancel/resume before day-7 charge: `set_couple_trial_cancellation`; claim skips `cancel_at_period_end`. | **0078** |
| **ENT-01** | Entitlement lock screen `/account/locked`; `checkEntitlement` / `getPostLoginPath` gate; demo still bypasses. | **NONE** |
| **PRICE-01** | Planner local free trial (`startPlannerTrial`) — `status=trialing`, both Stripe ids null; expiry via `current_period_end`. No Stripe objects. | **NONE** |
| **PRICE-02** | Planner paid Monthly/Annual Checkout (real Stripe Subscription). No `trial_period_days` — PRICE-01 covers the free window. | **NONE** |
| **PRICE-06** | Stripe Customer Portal for planners with a real `stripe_subscription_id` (not local trial / seeded active). | **NONE** |
| **CAL-04** | Invited **`couple`** members see the project Calendar tab (role exception when `kind === null`). Collaborators still do not. First deliberate tab gate that reads `project_members.role`. | **NONE** |
| **TMPL-01** | `clone_project_template(source, target)` — same-account structure clone (tasks / budget labels+estimates / vendor_targets categories only). Wired into planner New wedding form. | **0079** |
| **ASSIST-BUD-01** | Assistant budget/payment tool coverage: `get_budget` fixed (dropped booked-vendor quote double-count into `allocated`), reuses `computeBudgetAggregates()` / `deriveScheduleWaterfall()` from `lib/budget-aggregates.ts`. New `get_budget_payments` (ledger reads) + `get_payment_schedule` (uncovered installments, overdue-first). Live-verified against the Budget tab. | **NONE** |
| **AGR-01** (catch-up) | Couple **Contracts** tab at `/projects/[id]/agreements` (`coupleOnly`; personal only). Shipped with DEMO/TOUR; missing from v34 body. | **NONE** |
| **HYG-01** | Delete stale `design/reference.html` + `design/theme-direction.html`; collapse duplicate type class (`couple-name` / related). Hazard removal — rejected Modern romantic exemplar must not cold-paste as design context. | **NONE** |
| **HYG-01a** | Close dangling `design.mdc` pointers to deleted files; document GoogleMapsAttribution `#5E5E5E` as keep-raw (Google attribution + Roboto) — do not tokenize. | **NONE** |
| **WEB-REVAL-01** | Website publish/slug mutations `revalidatePath` public `/w/[slug]` (+ RSVP). | **NONE** |

> **PROVENANCE.** v34 body + post-v34 commits `3d50a3d` / `97c234a` / `4d5bbcd` / `9a0e267` (+
> on-disk **0079** still untracked). Slice IDs above match migration headers / code comments.
> **Git status (migrations):** 0070–0078 committed; **0079 alone untracked** — do not treat 0070–0079
> as one untracked batch. Live paste: **0071 confirmed live** via `pg_policies` on
> `calendar_events` / `guest_members` / `rsvp_attendees` (v35 review); remaining **0070 / 0072–0079**
> (and any still-open **0060–0069**) UNCONFIRMED unless Dom closed them. Edge Functions
> (`purge-demo`, `charge-trial-balance`) are **manual Dashboard deploys**, not migrations. Demo
> template seeds remain a separate hand-apply.

**Also closed / corrected in v35 (discrepancies found vs v34 body):**
- **Next-free is 0080**, not 0070. Disk has **0070–0079**.
- **WRITE-01 is SHIPPED as 0071** — write policies use `can_edit_project`. Offering `viewer` from
  Access is still a **product deferral** (allowlist remains `{couple, collaborator}`), not a schema
  blocker. Update any "until WRITE-01" language accordingly.
- **v34 wrongly listed `guest_members` (and treated `rsvp_attendees`) as still on
  `can_access_project` writes.** Live + DDL: both already use `can_edit_project` for authenticated
  mutate since **0040** / **0039**; 0071 correctly skipped them.
- **Calendar tab is NOT strictly personal-only.** **CAL-04** shows Calendar to invited `couple`
  members; collaborators and other kind-null roles still lose it. Couple **Agreements** tab is
  personal-only (no CAL-04-style exception).
- **Couple Agreements tab** (`agreements` segment) was shipped in the DEMO/TOUR commit and omitted
  from the v34 tab list.
- **HYG-01 / HYG-01a** deleted design HTML + closed dangling pointers + Google attribution hex
  decision — not to be folded into WEB-REVAL-01.
- Deferred destructive drops shift to **0080+**: MEAL-03a (`guests.meal_choice` + `guests.party_size`),
  `budget_items.due_date`, `rsvp_access_mode`, optional `wedding_profile.traditions`, DASH-03a
  `projects.description`.
- **`isTaskPastDue` is still NOT single-sourced** — `lib/dashboard-aggregates.ts` imports
  `lib/task-overdue.ts`; Overview (`buildOverviewData` / `buildAttention`) and assistant
  `getChecklist` still inline equivalent strict local-date logic.
- Planner bootstrap **no longer creates a placeholder project** (ONB-06) — v34/onboarding copy that
  assumed a first project on business signup is stale.
- Public RSVP throttle is **real** (0072), not soft-only.
- Service-role rarity expands to **Stripe webhook + billing/admin + Edge Function service paths**
  (demo purge, trial charge) — still never in RSC/actions with the anon/user client.

> **Numbering note:** **0070–0079 are taken.** Next-free is **0080.** Do not `db push`. **`viewer`
> invite remains deferred by product choice** (WRITE-01 write gates are done). **CON-03** (real PDF
> bytes) remains **DEFERRED by choice**. **Marketing copy policy:** do not promote or lead with
> "AI"; frame as the app / "automatically" / "the assistant." CON-04's UI label "Generate with the
> assistant" is the sanctioned framing for that surface.

**Verification status (READ THIS):**
- **0031–0059** remain as recorded (0059 applied live + visually verified).
- **0060–0069** — ON DISK; paste status as in v34 (0068–0069 claimed LIVE VERIFIED in older
  appendices — re-confirm if unsure).
- **0070–0078** — ON DISK **and committed in git**. Confirm remaining hand-pastes + Edge Function
  deploys + schedules. **0071 LIVE VERIFIED** (`pg_policies`, v35 review).
- **0079** — ON DISK; **untracked in git** — confirm paste + `git add` with the slice (alone among
  0070–0079).
- **WHITE-01 / WRITE-01 / CAL-04 / ONB-06 / ENT-01 / PRICE-01…06 / TMPL-01 / AGR-01 / HYG-01/01a /
  WEB-REVAL / DEMO-04/04b / RSVP-THROTTLE** — code shipped; residual pastes + Edge Function ops are
  the human gate.
- **Still open (human gate):** confirm remaining **0060–0070 / 0072–0079** pastes (+ demo seeds);
  deploy/schedule `purge-demo` + `charge-trial-balance`; broad Soft stack visual checkpoint including
  **branding**, **lock screen**, **couple trial Checkout**, **invited-couple Calendar**, **template
  clone**, **Agreements tab**. See §10 / §15.

Sections changed from v34: header, **§1**, **§2** (Next + Edge Functions), **§3** (WRITE-01 closed;
service-role), **§4** (branding + write gates + CAL-04 note), **§5** (0070–0079), **§6** (tabs /
branding / entitlement / planner Branding nav), **§7** (v35 batch), **§8** (ONB-06), **§9**
(assistant no-coverage list), **§10** (design hygiene closed), **§11**, **§12**, **§13**, **§14**,
**§15**.

**Companion doc:** a separate **Launch Prep Runbook** exists (ops checklist for going to production).
This bible covers product/architecture state; the runbook covers deployment. Keep both.

---

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
**Not** account-level seats / `account_invitations`. See §4.

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
invited couples via CAL-04) with wedding/kind hue polish**, **a couple Agreements tab for
signed/vendor contract files**), a planner CRM (contracts, lead pipeline, proposals → accepted
agreement → printable contract, project access + couple/collaborator invitations, archive finished
weddings, **dashboard wedding cards**, **New wedding optional structure clone (TMPL-01)**, an
account-level Vendor library **with detail/portfolio + Instagram + private media**, **white-label
branding for invited CoupleShell viewers (WHITE-01)**, an authorable Calendar, and a cross-project
Contracts archive with reusable contract templates **+ assistant-drafted templates (CON-04)**), Stripe
billing (**couple $7→$99 trial week + planner local trial / paid plans + entitlement lock screen**),
marketing `/` + `/pricing` **with live demo CTAs (DEMO-02/03 + DEMO-04 purge/throttle)**, and a
**public, shareable wedding website** with a 5-template photo-led gallery, **an editor that reorders
and collapses sections with a sticky live preview, image border-shape and timeline-layout options**,
**adaptive meal- and song-aware gated RSVP intake** (household lookup → per-attendee meal + optional
song; **no self-report headcount, email optional**; **real household velocity throttle**), and a
registry sub-page (under Website / public `/w/[slug]/registry` — **not** a project workspace tab).

---

## 2. Stack

- Next.js (App Router, TypeScript, React Server Components)
- Supabase (Postgres **17.6**, Auth, Row Level Security, Storage)
- Tailwind CSS (v4 `@theme inline` — Soft stack tokens mapped in `app/globals.css`)
- Anthropic Claude — model centralized in `lib/anthropic-model.ts` as `ANTHROPIC_MODEL`
  (`claude-sonnet-4-6`, env-overridable). Plan generation, outreach drafts, vendor enrichment,
  the assistant.
- Google Places API (New) — vendor discovery
- Gmail OAuth (scope `gmail.send`) — sending outreach from the couple's own mailbox.
  **NOT used for invitations.**
- Stripe — billing for couples and planners (test mode). **Couple:** $7 trial-week Checkout
  (`mode=payment`) then day-7 $92 off-session PaymentIntent (Edge Function). **Planner:** local
  7-day free trial (no Stripe objects) then Monthly/Annual Subscription Checkout + Customer Portal.
- Supabase Edge Functions (manual deploy) — `purge-demo`, `charge-trial-balance` (service-role
  bearer; Dashboard schedules; pg_cron not enabled)
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

> **Supabase CLI is linked** (`supabase db query --linked` works and is the sanctioned way to
> introspect). **NEVER run `supabase db push`.** Migrations here are hand-pasted; there is no
> `schema_migrations` tracker, so `db push` sees an empty history and tries to apply all files from
> 0001. Reads yes, push never. See §5.

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
  (subscriptions), and the account workspaces (contract templates, the vendor library) are
  ACCOUNT-scoped** via `is_account_member(account_id)`. **`calendar_events` is account-scoped at
  root but DUAL-GATED since CAL-02 (0060)** — `is_account_member(account_id)` OR a project-linked row
  the caller can edit (`project_id is not null AND can_edit_project(project_id)` after WRITE-01 /
  0071; SELECT-equivalent access still via `can_access_project` elsewhere); see §4. (RSVP submissions,
  seating, invitations, the budget ledger `budget_payments`, the `payment_schedule`,
  **guests / guest_members / rsvp_attendees** are project-scoped.)
- **`vendors` is ACCOUNT-scoped; `project_vendors` is the project-scoped LINK.** One vendor row can
  serve many projects in the same account. Every vendor UI action that says "remove" means **remove
  the link**, never the vendor. The account Vendor library (VND-08 / VND-11) is the one surface that
  adds a `vendors` row with NO `project_vendors` link, and the one place a `vendors` row may be deleted
  — and only when it has zero links.
- **Resolve the BUSINESS account explicitly** (`accounts.kind = 'business'` inner join), never naive
  first-membership. Couples resolve the `personal` account. Helpers in `lib/billing/resolve-account.ts`
  (`resolveBusinessAccountId`).
- **CHECK-constrain status enums.** EXCEPTION: Stripe-owned vocabularies aren't constrained.
  Constrained: `project_vendors.status` (0030/0031), `calendar_events.event_kind` (0045),
  `guests.rsvp_status` (`pending|attending|declined`), **`guest_members.relationship_side`
  (`partner_1|partner_2`, 0056)**, **`guest_members.member_type` (`adult|child`, 0063)**,
  **`notes.action_status` (`needs_action|done` or null, 0062)**, **`wedding_profile.formality`
  (`casual|semi-formal|formal|black-tie` or null, 0068)**, **`user_tours.status`
  (`completed|skipped`, 0066)**. **ONB-02 / 0067 closed the four vendor/file/template category
  CHECKs** (`vendor_targets.category`, `vendors.category`, `files.category`,
  `contract_templates.category` — null or one of the 13 canonical ids). `budget_items.category` and
  `guest_members.relationship` stay free-text by design.
- **Billing source of truth = the webhook-updated `subscriptions` row.**
- **Self-contained snapshot for public surfaces.** Public-rendered content stores its displayed data
  on its own row — never joins live into private tables. **Website section order + per-section layout /
  image-shape options live in the site's own `content` jsonb** (WEB-EDITOR-02 / WEB-STYLE-01), not in
  a separate table.
- **Service-role key is server-only and rare.** Stripe webhook + billing/admin path + Edge Function
  service paths (`purge-demo`, `charge-trial-balance`). Never in RSC/actions with the user/anon client.
- **Anon READ = one published-only RLS policy + the anon key.** New columns on an anon-readable row
  (e.g. `wedding_websites.song_requests_enabled`, 0057) are auto-readable **riders** — NOT new anon
  surfaces, no policy change.
- **Anon WRITE = tightly-scoped INSERT-only RLS (or a definer RPC) + server-derived scope.** Public
  writes are RSVP (`submit_rsvp` RPC) and registry claims (INSERT). **There are exactly SIX anon
  surfaces** (three reads + one INSERT + two RPC executes) — see §4. **v31–v35 add NO new anon table
  surfaces** (RSVP-02 form-only; RSVP-THROTTLE-01 replaces `submit_rsvp` in place; `vendor-media`
  private; `brand-media` is a **public storage carve-out** like `website-media`, not a counted table
  surface; `get_project_branding` is authenticated-only). **Demo uses Supabase anonymous auth +
  authenticated RPC** — not a new anon RLS surface.
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
  already-booked filter inside `commit_wedding_plan`**.
  **Seating occupancy stays action-enforced** (writers check seat_count vs seated count) — 0059 did
  not add a structural occupancy constraint.
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
  `assistant_messages`, `outreach_messages`. **`calendar_events` exception:** one `FOR ALL` policy
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
  read-dead after gated-only (0054, drop candidate 0080+); `guests.meal_choice` inert after the
  flatten (drop in MEAL-03a / 0080+); `guests.party_size` still written by `addGuest` for create-form
  slots but unused for person-grain headcount (also drop in MEAL-03a / 0080+);
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

Tables: `accounts` (kind: personal | business), `account_members`, `projects`, `project_members`,
`project_invitations` (0028).

### The three user classes (invited members share one class, two roles)

| Class | `accounts` | `account_members` | `project_members` | Sees |
|---|---|---|---|---|
| Self-serve couple | personal | 1 row | none | their one project |
| Planner | business | 1 row | none | all their projects |
| **Invited member** | **none** | **none** | **1 row per project** (`couple` **or** `collaborator`) | **only invited projects** |

**A planner opening their own project has NO `project_members` row.** An invited member has NO
account kind. `plannerOnly` tab filtering resolves from ACCOUNT kind and must never be switched to
`project_members.role`. **CAL-04 is the sole deliberate exception:** when `kind === null` and
`projectMemberRole === "couple"`, the Calendar tab is shown — still not a general role-based tab
system. **`viewer` exists on the enum but is not issued by Access (INV-07 allowlist remains
`{couple, collaborator}`).** WRITE-01 write gates are done; offering `viewer` is still a product
deferral.

### `project_invitations` (0028; INV-07 uses existing `role`)

- `project_id`, `email`, **`role project_role NOT NULL DEFAULT 'couple'`**, `token_hash` (sha256 hex),
  `invited_by`, `expires_at`, `accepted_at` / `accepted_by`, `revoked_at`, `created_at`
- Partial unique: one live invite per `(project_id, lower(email))`
- Policies: all four gated by `can_manage_project_access`
- **`accept_project_invitation` inserts `project_members.role` from `v_inv.role`** (never hardcodes).
- **Sole app writer:** `createProjectInvitation(projectId, email, role)` — allowlist
  `{couple, collaborator}`; rejects `viewer`.

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
  **`clone_project_template` (0079)**, couple-trial helpers (**0077/0078**).

### Guest / RSVP tables (project-scoped) — the two-tier model (preserved, not flattened away)

The Guests page is a **flat one-line-per-person display** (GST-06), but the **data model stays two
tiers**. Household is the intake, token, mailing-address, and RSVP-grouping unit; the person is the
display line and the home for per-person fields.

- **`guests` (0006 + 0056)** — the **household**. `id`, `project_id`, `full_name` (NOT NULL —
  household/postal identity), `email` (nullable — **UI-deprecated by GST-07, column kept**; no
  add/edit field on Guests), `phone` (nullable — surfaced in place of email), **`address` (nullable,
  0056 — household mailing address)**, `household` (nullable label), `party_size` int default 1
  (**still written by `addGuest` and drives additional create-form slots; person-grain display/
  summary does not use it for headcount — drop in MEAL-03a / 0080+**), `rsvp_status` text NOT NULL
  default `pending` CHECK `pending|attending|declined` (**the badge — the authoritative shown status;
  written by `updateRsvp` AND `submit_rsvp`**), `meal_choice` (nullable, **inert — drop in MEAL-03a /
  0080+**), `notes`, `created_at`, `rsvp_token` NOT NULL default `encode(gen_random_bytes(16),'hex')`
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

### The six public (anon) surfaces (UNCHANGED count in v35)

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

`rsvp_attendees` / `guest_members` / `guests` / `rsvp_submissions` / `project_invitations` /
`calendar_events` / `contract_templates` / `budget_payments` / `payment_schedule` / `notes` /
`user_tours` / `demo_start_attempts` / the seating tables have NO anon policy. Storage carve-outs:
**0042 `website-media` public SELECT** (recorded, not counted); **0070 `brand-media` public SELECT**
(same posture; recorded, not counted); **0061 `vendor-media` private bucket** — authenticated
account-member policies only, **NO anon SELECT**, reads via signed URLs (same posture as
`project-files`). **Demo visitors authenticate anonymously then call authenticated RPCs** — still not
an anon RLS surface.

### Demo account flags (DEMO-01 / 0065) + purge/throttle (DEMO-04 / 0073–0074) — ON DISK

`accounts` gains `is_demo boolean NOT NULL DEFAULT false`, `is_demo_template boolean NOT NULL DEFAULT
false`, `demo_created_at timestamptz`, plus CHECK `not (is_demo and is_demo_template)`. Template rows
are curated seed data; visitor clones are `is_demo = true`. **0073:** `demo_start_attempts` (hashed
IPs only; no policies for anon/authenticated); `try_record_demo_start` / `purge_demo_accounts` /
`purge_demo_auth_users` (service_role). **0074:** `clone_demo_account` calls the throttle on every
invocation. Edge Function `purge-demo` schedules hourly after manual deploy. See §5 / §7.

### Account branding (WHITE-01 / 0070) — ON DISK

Business accounts may enable white-label: `white_label_enabled`, `brand_name`, `brand_logo_url`,
`brand_accent_color` + CHECK `white_label_enabled = false OR kind = 'business'`. Members may UPDATE
their own `accounts` row (branding writes). Public `brand-media` bucket (5MB; png/jpeg/webp; no SVG).
`get_project_branding(project_id)` returns brand fields when the caller `can_access_project`, the
owner is business, and white-label is on — **authenticated only, not anon**. CoupleShell applies
logo/name and optional `--accent` override for invited project viewers; **planner chrome stays First
Look**. Settings at `/account/branding`.

### `user_tours` (TOUR-01 / 0066) — ON DISK (confirm paste)

User-scoped (not project-scoped): PK `(user_id, tour_key)`; `status` `completed|skipped`;
`dismissed_at`. RLS: authenticated own rows only. **No CHECK on `tour_key`** — keys live in
`lib/tours/tour-config.ts`. See §7.

### Notes (NOTES-01 / 0062) — ON DISK, paste-unconfirmed

`notes` gains optional **`action_status` text** — `null` (ordinary), `needs_action` (pinned, rosewood
dot), or `done` (sage pill). CHECK: `action_status is null or action_status in ('needs_action','done')`.
UI: preview-card grid → modal editor; list sort pins `needs_action` first, then `updated_at` desc.
Deliberately a **tri-state annotation, not a second task system**. Assistant **`get_notes` / `get_note`
return `action_status`** (pin-sort + needs-action count in summary). Assistant `add_note` does **not**
set `action_status` (still title/body only — no note-status write tool).

### Calendar events RLS (CAL-02 / 0060 + WRITE-01 / 0071) — ON DISK; **0071 LIVE VERIFIED**

**One combined `FOR ALL` policy** (not split SELECT/write): **"calendar events managed by account or
project members"** — `is_account_member(account_id)` **OR** (`project_id is not null` AND
**`can_edit_project(project_id)`** after 0071; was `can_access_project` in 0060) on **both** `using`
and `with check`. Consequence: tightening the project branch also tightens project-linked **reads**
for non-account members (a future `viewer` would fail SELECT on project-linked rows too — low risk
today; Access does not issue `viewer`). Account members still pass via `is_account_member`.
**Live check (v35):** `pg_policies` shows `can_edit_project` on that single policy.
**Tab visibility (CAL-04):** personal owners always; invited members with
`project_members.role = 'couple'` also see Calendar; collaborators / other kind-null roles do not.
See §6.

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

---

## 5. Migrations (source of truth: `supabase/migrations/`)

Applied in order. **You are the source of truth on the next number — next free is 0080.**

> **How migrations are applied here (READ THIS BEFORE SUGGESTING ANY CLI COMMAND):** by hand-pasting
> each file into the Supabase SQL editor and running it once, in order. There is NO CLI
> migration-history tracker. **`supabase db push` is FORBIDDEN.** `supabase db query --linked` for
> READS is sanctioned. Fresh installs may use `supabase/deploy-batches/batch1.sql`…`batch4.sql` as a
> convenience concat — still never `db push`.

> **A migration paste must return clean. Any error means NOTHING applied.** After every migration,
> confirm with `to_regclass` / `to_regprocedure` / `pg_policies` / `pg_indexes` before running any
> checkpoint. A file on disk is NOT an applied migration. **0060–0079 live paste is UNCONFIRMED
> unless Dom closed them; 0068–0069 claimed LIVE VERIFIED in older appendices — re-confirm before
> relying.** Demo template seeds are a separate hand-apply (`supabase/seeds/demo_templates*.sql`),
> not part of the migration sequence. Edge Functions are separate Dashboard deploys.

> **Write migrations to be re-runnable.** `create or replace` for functions; `drop … if exists`
> before every `create policy` / `create trigger`; `create … if not exists` for indexes;
> `drop constraint if exists` before `add constraint`; guard backfills so a re-paste is a no-op.

- 0001–0047 as recorded in v28/v29 (core tenancy → contract_templates).
- 0048 budget_label_optional · 0049 budget_alert_dismissals · 0050 registry_teardown
- 0051 budget_payments (BUD-03) · 0052 payment_schedule (BUD-SCHED-01)
- 0053 files_vendor_link (drift-discovered — see v30 note) · 0054 rsvp_gated_only (GST-04)
- 0055 guest_members_backfill (GST-06) · 0056 guest_member_relationship (GST-07)
- 0057 song_requests (GST-08) · 0058 rsvp_autopopulate (GST-09)
- **0059 seating_member_grain (SEAT-12)** — applied live + visually verified; DDL reconstructed (v33)
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
- **0071 write_edit_gates (WRITE-01)** — ON DISK; **LIVE VERIFIED** (`pg_policies`, v35)
- **0072 rsvp_throttle (RSVP-THROTTLE-01)** — ON DISK
- **0073 demo_cleanup (DEMO-04)** — ON DISK
- **0074 clone_demo_throttle (DEMO-04b)** — ON DISK
- **0075 onboarding_business_no_project (ONB-06)** — ON DISK
- **0076 couple_trial_payment_method (PRICE-03)** — ON DISK
- **0077 couple_trial_final_charge (PRICE-04)** — ON DISK
- **0078 couple_trial_cancellation (PRICE-05)** — ON DISK
- **0079 project_template_clone (TMPL-01)** — ON DISK; **untracked in git at bible time**

(For DDL/introspection notes on 0026–0058, see v27/v28/v29/v30. 0059–0069 as in v34 below; 0070–0079 after.)

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

### 0079 project_template_clone (TMPL-01) — ON DISK; **untracked in git** (0070–0078 committed)

`clone_project_template(source, target)` — same-account, member-gated; rejects if target already has
tasks/budget_items/vendor_targets. Copies task title/phase/position; budget category/label/
planned_amount; vendor_targets category only. No dates/status/actuals/vendor links.
- **Checkpoint:** New wedding with template source seeds empty project; re-clone raises already-has-data.
- **Git:** only this file among 0070–0079 is `??` — add/commit with the slice.

**Verified (code scan + live policy check, v35):** WHITE-01 / WRITE-01 / RSVP-THROTTLE / DEMO-04/04b /
ONB-06 / PRICE-01…06 / ENT-01 / CAL-04 / TMPL-01 / AGR-01 / HYG-01/01a / WEB-REVAL; 0070–0079 DDL on
disk (**0070–0078 committed; 0079 untracked**); **0071 live** on calendar / guest_members /
rsvp_attendees; `isTaskPastDue` still multi-homed.
**Confirm live:** remaining pastes of 0060–0070 / 0072–0079; Edge Function deploys; demo seeds;
Stripe test Checkout + day-7 charge path.

### Column reference (v35 note; earlier entries unchanged)

**`guest_members.member_type` / `related_to_member_id`** (0063). **`notes.action_status`** nullable
text + CHECK (0062). **`vendors.instagram`** nullable text (0061). **`wedding_websites.content`**
jsonb carries section order + layout / image-shape. **Seating:** member-grain assignments (0059) +
one-sweetheart-per-project index (0064). **`accounts` demo flags** (0065) + **branding columns**
(0070). **`user_tours`** (0066). **`wedding_profile.include_*`** (0067); **`formality` /
`priority_vendor_category_ids`** (0068); **`already_booked_vendor_category_ids`** (0069).
**`wedding_profile.traditions` write-dead** (POLISH-01 — column retained).
**`subscriptions.stripe_payment_method_id`** (0076). **`demo_start_attempts`** (0073).

**No-migration slices to date (append v35):** DASH-01; DASH-02; **DASH-03**; CON-01; **CON-04**;
budget row polish; **BUD paid/actual ramp polish**; BUD-FILTER-01; BUD-QUICKADD-01/02; BUD-NOTES-01;
GST-03; WEB-EDITOR-02; WEB-STYLE-01; RSVP-02; FIX-02; ASSIST-UI-01; **CAL-03**; **CAL-04**;
**Gmail reconnect hardening**; **ONB-03**; **POLISH-01**; **DEMO-02 / DEMO-03**; tour UI; **AGR-01**;
**ENT-01**; **PRICE-01**; **PRICE-02**; **PRICE-06**; **HYG-01**; **HYG-01a**; **WEB-REVAL-01**;
**ASSIST-BUD-01**. (Earlier list carries forward.)

---

## 6. Shell & routing

One login. `lib/post-login-path.ts` routes by account kind **after entitlement**:
- Unentitled account → `/account/locked` (ENT-01) — lock screen is Tier 2 full-bleed (no couple/
  planner chrome).
- **Planner (business):** `/dashboard`, `PlannerShell` + `PlannerProjectSidebar`.
- **Couple (personal):** into their project workspace (`CoupleShell`), gated by onboarding.
- **Invited member (no account):** into the invited project via `/projects` (no entitlement gate —
  no account).

**Demo (DEMO-03 / DEMO-04):** when `account.isDemo`, app layout mounts a single non-dismissible
`DemoBanner` (`bg-accent-wash` — not an accent flood). Demo visitors arrive via marketing CTA →
server-brokered `startDemoAction` → `/projects`. Demo accounts are entitled (`status: "demo"`).

**Tours (TOUR-01):** project layout loads dismissed `tour_key`s and wraps children in `TourProvider`;
`TourHelpButton` (`?`) on covered tabs for manual replay.

**Branding (WHITE-01):** project layout resolves `getBrandingForProject`; CoupleShell shows planner
logo/name and may override `--accent` for invited viewers. Planner shell never white-labels.


### Planner sidebar nav

**Dashboard / Calendar / Leads / Vendors / Contracts / Branding / Billing** — all business-account-kind
gated, never `project_members.role`.

### The signup → workspace path

```
signup (auth.signUp only — NO bootstrap here)
  → email confirm → /auth/callback → exchangeCodeForSession
  → consumePendingInvite  ← INV-05
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

> **`plannerOnly` resolves from ACCOUNT KIND, never from `project_members.role`.** CAL-04 is the
> only role-aware tab exception (Calendar for invited couples).

### Invitation acceptance path (INV-05 + INV-08)

Unchanged. `/invite/[token]` middleware sets `pending_invite_token` cookie [httpOnly, 30 min];
authenticated → `acceptProjectInvitation(token)`. Token MUST NOT resolve before authentication.
INV-08 closed the Next 16 cookie-write crash — do not move the write back into `InvitePage`.

### Dashboard — Urgent + wedding cards (DASH-01 + DASH-03)

**DASH-01** Urgent grouped by wedding — collapsible per-wedding cards, `activeProjectIds`-scoped —
unchanged. **DASH-03** adds planner **wedding cards** (`components/dashboard/wedding-cards.tsx` via
`buildWeddingCardModels` in `lib/dashboard-aggregates.ts`): initials, date/countdown, confirmed-guest
count (`guests.rsvp_status = attending`), sage/rosewood task progress via `lib/task-overdue.ts`
(`isTaskPastDue`), Archive + Enter. Active cards / archived list toggle in
`dashboard-wedding-list.tsx`. Planner-only surface (personal accounts still redirect away from
`/dashboard`). **TMPL-01:** New wedding form may clone checklist/budget/vendor-target structure from
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
`projectMemberRole` for the CAL-04 Calendar exception.

**Exact membership + order** (`lib/project-tabs.ts`):
- **personal:** Overview · **Calendar** · Checklist · Budget · Vendors · Guests · Website · Seating ·
  Day-of timeline · **Contracts (`agreements`)** · Notes & files
- **business:** Overview · Checklist · Budget · Vendors · Guests · Website · Seating · Day-of timeline
  · Contracts · Notes & files · Access
- **null + role `couple` (invited couple):** personal set **minus** couple Contracts (`agreements`);
  **Calendar included via CAL-04**
- **null (invited collaborator / other):** personal set **minus Calendar** and **minus** couple
  Contracts

**Registry is NOT a workspace tab.** Public registry + claims remain anon surfaces; outbound registry
links live under Website / `external_registry_links`.

> **Calendar tab gating — CAL-04 (v35).** Base flag remains `coupleOnly` (personal owners). **Invited
> `couple` members also see Calendar** when `kind === null` and `projectMemberRole === "couple"`.
> Collaborators and other kind-null roles do not. This is the **first** tab gate that reads
> `project_members.role` — do not casually extend the pattern to other tabs. Couple Agreements stays
> personal-only (no role exception). CAL-02/WRITE-01 RLS: project-linked events writable by
> `can_edit_project` editors (account members + couple/collaborator project members).

#### Overview (DASH-02 + ASSIST-UI-01)

Shared `ProjectOverview` (`components/dashboard/project-overview.tsx`) powers couple + planner project
dashboards. **ASSIST-UI-01:** a raised card with a **recessed** `AskAssistantPrompt` ("What should I
tackle next?") sits under the stat row; the vendor-empty state also invites the assistant (no nested
raised `EmptyState`). Suggested-path steps omit Overview + Calendar (personal work-step launcher).

#### Guests tab (GST-03…09 + GST-12)

Flat one-line-per-person display (`GuestPersonList` / `GuestRow`) over the preserved household tier;
per-person relationship + derived partner-side; **Adult/Child + optional "Guest of" association
(GST-12)** on create — associated path inserts into an existing household (no new `guests` row);
association sublabel (`{Primary}'s child` / `{Primary}'s Guest`); **no post-create edit** of
`member_type` / `related_to`. Household address + phone (email UI-deprecated); RSVP dropdown
(`updateRsvp`) with household badge as authoritative shown status; no Headcount; single Add Guest;
event-level song requests; gated submit auto-populates the badge; responses panel is a record, not an
inbox. **RsvpAccessCard removed** (no replacement card). Meal column when `meal_service_style ===
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

`/leads`, `/account/billing`, **`/account/branding` (WHITE-01)**, `/vendors` (VND-08/08a + **VND-11
detail/portfolio**), `/calendar` (CAL-01 + **CAL-03 hues/chips/legend**), `/contracts` (CON-01/01a/02
+ **CON-04 generate**). Couple project Calendar is under the project workspace
(`/projects/[id]/calendar`, CAL-02/WRITE-01 RLS; **tab = personal + invited couple**, §6). Shared
calendar chrome: `CalendarEventChip`, `CalendarLegend`, `lib/calendar-hues.ts` (`--cal-w-1…5`
categorical wedding/kind tints — not status colours).

### Public surfaces (no auth, outside `(app)`)

`app/w/[slug]`, `/w/[slug]/rsvp`, `/w/[slug]/registry`, `/invite/[token]`. Marketing `/` + `/pricing`.
Marketing copy must not lead with "AI." Entitlement lock: `/account/locked` (authenticated).

---

## 7. Features built

Pattern: a folder under the relevant scope with `page.tsx` (server read) + `actions.ts` (`'use server'`
writes by id + `revalidatePath`); RLS authorizes.

**The full per-slice build narratives for v1–v31 are preserved in the prior bibles and carry forward
unchanged** (unified shell, onboarding→plan, assistant, contracts, leads, proposals, billing, website
builder + 5-template gallery, RSVP, seating through SEAT-12, Soft stack, landing, invites, vendors,
registry, meals, the full budget arc, the Guests-page rework GST-03…09, Website-tab polish, etc.). The
v32/v33 additions are below.

### v31 — Website-tab polish + per-member seating (carries forward — see v31 §7)

WEB-EDITOR-02 / WEB-STYLE-01 / RSVP-02 / FIX-02 (no schema) + SEAT-12 / **0059**. Visually verified;
0059 DDL now reconstructed (§5).

### v32 — Notes action status + in-page assistant + migration catch-up

> **Provenance (repeat of the header note):** the v32 slices were built in **Cursor outside a Claude
> session**; the entries were **reconstructed from code/migration files, not authored from
> working-session reasoning**. Facts (DDL, file existence) are reliable; "why"/"Decided" notes are
> reconstructed and adopted-for-now. **Confirm 0060–0062 hand-pastes** before treating schema as live.

#### NOTES-01 — Notes action lifecycle. Migration **0062** (on disk).

`notes.action_status` optional (`null` | `needs_action` | `done`). Preview grid + modal editor; pin-sort
needs-action; rosewood / sage chrome. Assistant `add_note` still title/body only; `get_notes`/`get_note`
surface `action_status` (v33 confirm). Reconstructed intent: an optional annotation, **not** a second
task system.

#### ASSIST-UI-01 — In-page assistant prompts. NO SCHEMA.

`AskAssistantPrompt` (recessed well + sparkle chip + primary CTA + prefill) on Overview and empty
Checklist / Budget / Timeline / Guests / Notes / Vendors. `EmptyState` gains an optional `action` slot.
Nav chip + tab-suggestion tooltip (`AssistantNavEntry`) unchanged. **Not** Phase 5 proactive
assistant — still reactive; **discovery only** (opens the panel with a prefill; does not auto-send).

#### CAL-02 — Calendar project-member RLS. Migration **0060** (on disk, catch-up).

Couple project Calendar tab + collaborators can manage project-linked `calendar_events`. RLS is fact;
tab gating later gained CAL-04 (invited couples) — §6.

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
invited project viewers only; planner chrome stays First Look. Business-only CHECK.

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
casually. Closes the v34 "invited real couple loses Calendar" edge.

#### AGR-01 — Couple Agreements tab. NO SCHEMA (catch-up).

Personal-only `/projects/[id]/agreements` for contract files.

#### TMPL-01 — Project structure clone. Migration **0079**.

Same-account checklist/budget/vendor-target structure clone from New wedding form.

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

`startPlannerTrial` inserts `status=trialing` with both Stripe ids null; expiry enforced by
`current_period_end` in `getSubscriptionForAccount`. No Stripe objects.

#### PRICE-02 — Planner paid Checkout. NO SCHEMA.

Monthly/Annual Stripe Subscription Checkout after (or instead of lingering on) the local trial. No
`trial_period_days` on the Checkout Session — PRICE-01 owns the free window.

#### PRICE-03 — Couple $7 trial-week Checkout. Migration **0076**.

`mode=payment` + `setup_future_usage`; stores `subscriptions.stripe_payment_method_id`.

#### PRICE-04 — Day-7 $92 off-session charge. Migration **0077** (+ **0078** claim exclude).

`claim_couple_trial_charges` / `mark_couple_trial_charge_failed` (service_role); Edge Function
`charge-trial-balance`; transitional status `charging`.

#### PRICE-05 — Couple cancel/resume before day-7 charge. Migration **0078**.

`set_couple_trial_cancellation`; claim skips `cancel_at_period_end = true`.

#### PRICE-06 — Planner Customer Portal. NO SCHEMA.

Portal session only when a real `stripe_subscription_id` is present (not local trial / seeded active).

#### HYG-01 — Delete stale design artifacts. NO SCHEMA.

Deletes `design/reference.html` + `design/theme-direction.html` (rejected Modern romantic hazard) and
collapses the duplicate type class (`couple-name` / related). `.cursor/design.mdc` + `app/globals.css`
remain the design sources of truth.

#### HYG-01a — Close dangling pointers + Google attribution hex. NO SCHEMA.

Removes stale `design.mdc` references to the deleted files; documents GoogleMapsAttribution
`#5E5E5E` as keep-raw (Google attribution styling + Roboto) — do not tokenize.

#### WEB-REVAL-01 — Public website revalidation. NO SCHEMA.

Publish/slug mutations `revalidatePath` public `/w/[slug]` (+ RSVP). Distinct from HYG-01/01a.

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
> trial). Couples still get exactly one project at bootstrap.

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
> **branding, billing/entitlement, and the guest-rework RSVP / website-editor / GST-12 association
> surfaces (no new tools in v32–v35 beyond ASSIST-BUD-01; CON-04 is account-scoped, not a chat tool).**
> **The budget ledger / payment schedule gap closed in ASSIST-BUD-01** — see below. Website has a
> narrow write (`set_website_travel`). The assistant has no vendor-removal tool and should not get one.
> - **`get_notes` / `get_note` return `action_status`** (pin-sort needs-action; summary count) —
>   confirmed in `lib/assistant/read-tools.ts` (v33). **`add_note` still does NOT set `action_status`**
>   (no note-status write tool).
> - **ASSIST-BUD-01 (v35, NO SCHEMA)** — `get_budget` fixed (booked-vendor quote double-count into
>   `allocated` removed; now reuses `computeBudgetAggregates()` / `deriveScheduleWaterfall()` from
>   `lib/budget-aggregates.ts`, same helpers the live Budget UI uses). New `get_budget_payments` +
>   `get_payment_schedule` read tools. Live-verified against the Budget tab (Dom).

> **Assistant write-tool canonical audit.** Enforced-canonical: `add_task`, `update_task_status`,
> `update_guest_rsvp`, `add_vendor_target`, `set_website_travel`. Free-text-by-design (correct, not a
> gap): `add_budget_item` category, `add_timeline_event(s)` owner/section, note/guest text, website
> schedule text.
> - `update_guest_rsvp` shares `guests.rsvp_status` with `submit_rsvp` (0058) — one column, two writers,
>   latest-wins (§3). Legitimate manual writer; no change needed.
> - **⚠️ VERIFY: the assistant's guest-add path predates the guest rework** and still writes the OLD
>   shape (email; no `address`, `relationship_side`, `relationship`, **`member_type` /
>   `related_to_member_id`**). Not broken (new columns nullable / default adult), but out of sync with
>   the couple-side form — update/retire before relying on assistant-created guests carrying the new
>   fields.
> **Re-run this audit when any new write tool ships** (none shipped in v33–v35 — discovery/UI + CON-04 /
> branding / billing are not chat write tools).

---

## 10. Design system — Soft stack (C1)

> **This section is a POINTER.** Token VALUES live in `app/globals.css`. RULES live in
> `.cursor/design.mdc`. If they disagree with this file, those two win. Stale
> `design/reference.html` / `design/theme-direction.html` were **deleted** (v35) — regenerate
> reference only if you need a rendered Soft stack exemplar again; do not resurrect theme-direction.

**Direction:** Soft stack (C1) — calm tool organized by **depth**. Mauve-tinted canvas; raised white
cards; recessed wells for rows/tracks. Hierarchy = raised-contains-recessed.

### Three-tier surface taxonomy

| Tier | Where | What it gets |
|---|---|---|
| **1 — App chrome** | `app/(app)/`, most of `components/`, planner, forms, **seating canvas**, assistant + **in-page `AskAssistantPrompt` wells**, settings, Access, Branding, `/vendors` / `/calendar` / `/contracts`, the Budget page, the Guests page, **the Notes board**, **the website editor incl. the sticky preview**, **the dashboard wedding cards**, **demo banner**, **page-tour overlay**, **CoupleShell white-label chrome** | Soft stack palette + Figtree; two depth levels; three radii; **no** accent flood; **no** Cormorant/Great Vibes |
| **2 — Emotional** | Landing, onboarding hero/welcome, empty-state heroes, `/invite/[token]`, **`/account/locked`** | Same palette + Figtree; larger display scale; **exactly one** deep field `--deep` per surface |
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

**White-label (WHITE-01 — Tier 1):** CouplesShell may override `--accent` from a planner brand hex for
invited project viewers; do not treat that as a Tier 1 accent flood. Logo is a brand mark, not
photographic ornament.

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
| `design/theme-direction.html` delete | **Done** (v35) |
| Font-load scoping | **Open** |
| GoogleMapsAttribution `#5E5E5E` | **Done** — keep raw hex + Roboto (Google attribution); do not tokenize |
| **Dom live Soft stack + LAND-01 visual checkpoint** | **Partially closed** — Guests, Budget, website editor + public site, and public RSVP are **verified (v31)**; Notes / AskAssistantPrompt / Vendor detail / Calendar / GST-12 / SEAT-13 / DASH-03 / CAL-03 shipped-but-unwalked unless closed; **add branding, lock screen, couple trial Checkout, invited-couple Calendar, Agreements, template clone, demo purge/throttle UX** to the walk |
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

**Cursor-freeform work still needs the gate.** v31–v35 product work includes freeform Cursor batches.
The promotion bar is still a live pass — and any migration still needs the §5 landed-confirmation.
**0060–0079 pastes remain unconfirmed** unless Dom closed them; **0068–0069 claimed LIVE VERIFIED**.
0059 DDL is reconstructed (v33).

**Cursor must not author the bible.** v32–v35 are successive exceptions under the same rule: Cursor
may draft from a code scan / folded appendices, and each version still needs a Dom/Claude review pass
to keep reconstructed rationale marked as such. Prefer: Claude authors from session reasoning; a code
scan is a **findings list** for factual drift only (migration numbers, columns, paths, gating).
v35 specifically records WHITE-01 / WRITE-01 / throttles / ONB-06 / CAL-04 / billing / TMPL-01 and
corrects Calendar / Agreements / WRITE-01 / design-file drift from v34.

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
    fact.** 0053 surfaced during GST-04 Step 0; **0059 was taken by seating while v30 claimed
    next-free 0059**; **0060–0062 shipped while v31 claimed next-free 0060**; **0063–0064 shipped
    while v32 claimed next-free 0063**; **0065–0069 shipped while v33 claimed next-free 0065**;
    **0070–0079 shipped while v34 claimed next-free 0070**. Grep `supabase/migrations/` before
    trusting a number.

**Documentation discipline:** factual drift (numbers, paths, existence, gating) may be corrected from
a code scan. Prefer section-level diffs.

**Drift watchlist (append v35):**
- **Trusting "next-free 0070"** — **0070–0079 are taken**; next-free is **0080**.
- Treating **WRITE-01 as still open** — write gates shipped as **0071**; `viewer` invite remains a
  product deferral only.
- Treating Calendar as strictly personal-only — **CAL-04** shows it to invited `couple` members.
- Omitting the couple **Agreements** tab from the personal tab list.
- Assuming planner bootstrap still creates a placeholder project — **ONB-06** does not.
- Treating RSVP throttle as soft-only — **0072** is the source of truth inside `submit_rsvp`.
- Treating Registry as a workspace tab — it is **not**; links live under Website.
- Assuming assistant guest-add writes GST-12 fields — it does **not** yet (§9).
- Assuming Overview / assistant already import `isTaskPastDue` — still multi-homed; verify/collapse
  (§13).
- Dropping the DASH-03a blurb decision — it's a deliberate deferral (needs `projects.description` +
  an editor), not an omission (§13 / §14).
- Nesting a raised `EmptyState` / card inside another raised card — keep recessed-prompt pattern.
- Reordering website sections with **@dnd-kit** (up/down buttons are sanctioned; §15).
- A **new collapse affordance** for the website section editor instead of the shared one.
- Server/Supabase or `lib/partner-sides.ts` imports into `components/website/` via the sticky preview.
- A future `submit_rsvp` replace that drops gated-only / song-gate / badge auto-populate / **0072
  throttle** while "just" touching the form.
- Dropping `guests.meal_choice` / `guests.party_size` / `rsvp_access_mode` / `budget_items.due_date` /
  `wedding_profile.traditions` before their planned supersession migration (**0080+**). Claiming
  `party_size` is fully inert — it still drives create-form slots. Do not resurrect a `traditions`
  write path.
- Adding a second sweetheart without demoting (0064 + action enforce uniqueness).
- Encoding table kind in a status colour (sweetheart uses form/text + accent stroke only).
- Treating ASSIST-UI-01 as Phase 5 proactive assistant (it is discovery-only).
- Inventing title-string heuristics to filter already-booked checklist tasks (architecturally ruled
  out — §3 / ONB-05).
- Emitting `{{amount}}` from CON-04's generator (excluded by product decision).
- Copying template `rsvp_token`s or published website slugs when cloning demo accounts.
- Extending CAL-04's role exception to other `coupleOnly` tabs without a deliberate decision.
- White-labeling planner chrome or public websites (WHITE-01 is CoupleShell / invited viewers only).
- Mirroring RSVP or demo throttle thresholds in app code (RPC/Edge constants are sole source).
- (All prior watchlist items from v34/v33/v32/v31/v30/v29/v28 carry forward — no open RSVP path; no
  fuzzy attendee-name match; badge is the shown status; relationship picklist stays free-text/unwired;
  store the partner-side token not the name; no Bride/Groom; server-gate songs when off; no
  review/apply inbox; Paid=ledger-only; no per-installment stored status; budget filter never rewrites
  the headline; etc.)

---

## 12. Compliance & security notes

- **Stripe:** webhook verifies raw-body signature; service-role only in webhook (+ billing/admin +
  Edge Function charge path); entitlement read only from the `subscriptions` row (demo bypass in
  `getSubscriptionForAccount`). **Stripe Tax NOT set up.** Couple trial: $7 Checkout saves PM;
  day-7 $92 off-session PI via `charge-trial-balance`.
- **Public website / registry / meal-options / song-toggle read:** anon `SELECT` gated to a published
  site (the song toggle + section-order/layout options are riders on the existing published read /
  `content` jsonb — no new surface).
- **Public RSVP write:** `submit_rsvp` RPC only; **gated-only (0054)** — every submission
  household-token-bound; `project_id` server-derived; honeypot + **real velocity throttle (0072)**;
  **auto-populates `guests.rsvp_status` in-transaction (0058)** via the definer function. **RSVP-02
  changed only the client form**; **RSVP-THROTTLE-01** replaces the RPC in place. **Collects guest
  PII** (names, songs, dietary; email now optional) → privacy policy.
- **Anon grant sharp edge:** the table GRANT on `guests` includes UPDATE to anon, but RLS blocks any
  direct anon write — the definer RPC is the only anon-reachable badge writer. WRITE-01 did not change
  this belt-and-suspenders item.
- **Public registry claim:** anon INSERT gated to published sites; honeypot + throttle.
- **Invitations:** raw tokens 32 random bytes base64url, stored only as sha256 hex; acceptance bound to
  `auth.email()`; expiry 14 days; revocation immediate. Pending-invite cookie httpOnly, `sameSite: lax`,
  secure in prod, 30-min, consumed once, set in middleware (INV-08).
- **Guest gated-lookup token:** `guests.rsvp_token` (16 random bytes hex); `lookup_rsvp_household`
  definer/anon-execute surfaces a household's members by token; `submit_rsvp` re-resolves server-side.
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
  + `can_access_project` — **not** anon.
- **Demo:** IP hashes only in `demo_start_attempts`; purge via service_role Edge Function; no raw IPs.
- **Archive / contract templates / Contracts downloads / Vendor-media:** as recorded — account- or
  project-scoped, authenticated, no anon policy (except published website-media / brand-media
  carve-outs), signed URLs (60s) for private-bucket downloads (**incl. `vendor-media`**).
- **Gmail OAuth:** `gmail.send` sensitive scope → needs verification. Testing mode caps apply.
  **v33 reconnect hardening:** require `refresh_token`; `noStore` on credential reads; reconnect
  messaging; advance `to_contact` → `contacted` on successful send.
- **Signup:** `auth.signUp` only; no tenant created at signup.
- **Production infra:** prod belongs in a **separate Supabase org on Pro**. Fresh prod project,
  migrations **0001–0079** applied by hand once each in order (NEVER `db push`; deploy-batches OK for
  greenfield), storage buckets (`project-files` + `website-media` + **`vendor-media`** +
  **`brand-media`**) + policies recreated, Edge Functions deployed + scheduled, real SMTP, prod domain
  in auth redirect URLs. See the Launch Prep Runbook.
- Set Anthropic + Google Cloud + Stripe + Supabase billing/spend alerts.

---

## 13. Known caveats / things to verify

**Closed by earlier versions (v10–v34):** the full budget arc; invitations; vendors; registry; meals +
gated RSVP; website photos + sections; collaborator invites; Soft stack; Guests rework; Website-tab
polish + SEAT-12/13; NOTES-01 / ASSIST-UI-01 / CAL-02 / VND-11 / DASH-02/03; DEMO/TOUR/ONB-02…05 /
CON-04. Full detail in v27–v34.

**Shipped and recorded (v35) — residual paste / ops confirmation where noted:**
- **WHITE-01** — **0070**. Branding columns + brand-media + RPC + CoupleShell.
- **WRITE-01** — **0071**. Project write policies → `can_edit_project`. **Closes the former "viewer
  can write" schema gap** for listed tables; Access still does not offer `viewer`.
- **RSVP-THROTTLE-01** — **0072**. Real household velocity cap in `submit_rsvp`.
- **DEMO-04 / DEMO-04b** — **0073 / 0074** + Edge Function `purge-demo`.
- **ONB-06** — **0075**. Business bootstrap without placeholder project.
- **CAL-04** — no schema. Invited couples see Calendar.
- **AGR-01** — no schema (catch-up). Couple Agreements tab.
- **TMPL-01** — **0079**. Structure clone RPC + New wedding UI.
- **ENT-01 + PRICE-01…06** — **0076–0078** + no-schema UI / Edge Function `charge-trial-balance`.
- **HYG-01 / HYG-01a** — no schema. Design HTML deleted; dangling pointers closed; Google hex keep-raw.
- **WEB-REVAL-01** — public path revalidation (distinct from HYG).

**Open — v35 (deferrals + gaps):**
- **0060–0070 / 0072–0079 hand-paste** still need confirmation where not already live-checked;
  **0071 LIVE VERIFIED**. Demo seeds + Edge Function deploys/schedules are separate applies.
  **0079 alone is git-untracked** (0070–0078 committed).
- **DASH-03a (deferred) — wedding-card blurb.** Needs `projects.description` (**0080+**) AND an edit
  affordance. Deferred deliberately to avoid a dead write path.
- **Past-due predicate still multi-homed.** `lib/task-overdue.ts` (`isTaskPastDue`) is canonical, but
  Overview (`buildOverviewData` / `buildAttention`) and assistant (`getChecklist` / `isOverdue`) still
  inline. Collapse to one helper.
- **`rsvp_access_mode` read-dead (0054), not dropped** — drop candidate **0080+**.
- **`guests.meal_choice` inert; `guests.party_size` still written for create slots** — both drop in
  **MEAL-03a / 0080+**. (`rsvp_submissions.party_size` is a DIFFERENT column — still live/RPC-derived.)
- **`wedding_profile.traditions` write-dead** — drop unscheduled. Do not resurrect a write path.
- **`guests.email` UI-deprecated, kept** — email may still matter for invites.
- **Per-member RSVP status (model B) deferred.** GST-09 is household-badge only; DASH-03 confirmed-
  guest count is the same household-badge grain.
- **GST-12 association not editable after create** — deliberate for now.
- **Song `style=none` dead-toggle.** Leave for now.
- **Anon UPDATE grant on `guests`** — RLS-blocked; optional belt-and-suspenders revoke later.
- **Partner-side derive heuristic** — trailing-year strip + `&`/`and` split, backstopped by generic
  Partner 1/2.
- **Assistant guest-add path not updated** (§9) — predates GST-07/GST-12. **No new assistant write
  tools in v35.**
- **`guest_members.relationship` free-text + the relationship picklist** — deliberate.
- **0053 `files_vendor_link` + 0050 `registry_teardown` rationale uncaptured** — reconstruct before
  relying on internals.
- **Vendor-priority / formality influence is prompt-directive only.**
- **Checklist already-booked suppression has no structural backstop.**
- **Demo → real account conversion** — not shipped.
- **`viewer` invite** — product still deferred (WRITE-01 done). Update `lib/invitations/constants.ts`
  comment when offering.
- **0079 git-untracked** — add/commit with the slice (0070–0078 already committed).

**Open — v29 budget (carried forward):** `budget_items.due_date` write-dead (drop **0080+** after parity);
reconciled payment schedule (model b) deferred; budget dashboard overhaul deferred (mockup-first);
`budget_items.category` free-text + quick-add list deliberate. (Ledger writers now `can_edit_project`.)

**Open — v28 (carried forward):** CON-03 deferred; CAL-01a deferred; contract category axis vendor-only;
`{{amount}}` no project source (and CON-04 generator deliberately excludes it); `files.category`
inherits the **`can_edit_project` write gate** (0071; was `can_access_project` when this line was
first written).

**Open — security / schema (carried forward + v35):**
- **WRITE-01 closed the `can_access_project` write gap** for the listed tables. Residual: optional
  revoke of anon UPDATE GRANT on `guests`; `assistant_messages` / `outreach_messages` out of WRITE-01
  scope by design; **`guest_members` / `rsvp_attendees` were already `can_edit_project` on mutate
  (0040 / 0039) — not residual holes**; **`calendar_events` is the FOR-ALL exception** (project-linked
  SELECT also `can_edit_project`); **`projects` has NO DELETE policy** (silent-no-op shape, unreached).
- **Four vendor/file/template category columns HAVE CHECKs (0067)** — closed.
- **`guest_members.attending` default true, inert as shown status** — the badge is authoritative.
- **`website-media` / `brand-media` public SELECT have no published gate** — intentional.
  **`vendor-media` has no anon SELECT** — intentional.
- **`project_invitations.invited_by` / `accepted_by` have no FK to `auth.users`** — cosmetic.
- **`tasks.phase` free-text; `budget_items.category` / `timeline_events.owner`/`section` free-text** —
  deliberate; do not enum.

**Open — Soft stack / design:** Dom live Soft stack + LAND-01/01a walk — prior verified surfaces plus
**branding / lock screen / couple trial / CAL-04 / Agreements / TMPL-01 / demo throttle UX**; Tier 1
date locale policy; optional Soft stack `reference.html` regenerate; legacy CSS aliases; font-load
scoping.

**Dev DB state (baseline — re-introspect before relying on rows):**
- `dominicciccaglione@gmail.com` — **personal**, "Dom & Jordyn 2027", wedding 2027-02-13. 12 guest
  households, every household ≥1 member (22 after the 0055 backfill). Song toggle state per §15 note.
  Seating at member grain (0059). Confirm **0060–0079** if using Calendar / vendor media / notes /
  association / sweetheart / demo / tours / onboarding / branding / write gates / throttles / billing /
  template clone.
- `d.ciccaglione1@gmail.com` — **business**, "Events by Jordyn". Projects include Mila & Griffin
  (planner-created, no `wedding_profile`, 2027-02-15, $40,000, 0 members — must remain), Matt & Courtney
  (2027-06-13), Bryce & Emma (no date set — budget/guest test project).
- `d.ciccaglione@icloud.com` — **orphaned auth user, 0 memberships** (invited-couple fixture).
> Confirm song-request toggles are OFF on both test projects post-verification if not already.
> Confirm at least one `is_demo_template` personal + business account before demo QA.
> Confirm Stripe test Price/Checkout env for couple trial + planner paid plans.

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
- **ENT-01 + PRICE-01…06** — **0076–0078** + lock screen / Checkout / Portal / day-7 charge.
- **HYG-01 / HYG-01a** — No schema. Stale design HTML deleted; Google attribution hex documented.
- **WEB-REVAL-01** — No schema. Public revalidation.
- **ASSIST-BUD-01** — No schema. Assistant budget/payment tool coverage; retires stale `getBudget`.

Current through **0079** (on disk); next-free **0080** (MEAL-03a incl. `party_size`,
`budget_items.due_date` drop, `rsvp_access_mode` drop, optional `traditions` drop, DASH-03a
`projects.description` — all **0080+**).

**In progress:** confirm **0060–0079 hand-pastes** (+ demo seeds + Edge Functions); the **broad** Dom
Soft stack + LAND-01 live visual checkpoint (prior unwalked surfaces + **branding / lock / trial /
CAL-04 / Agreements / TMPL-01**).

**Remaining couple side:** moodboard; **MEAL-03a (0080+, drops `guests.meal_choice` + `guests.party_size`)**;
**`budget_items.due_date` drop (0080+, after parity)**; **`rsvp_access_mode` drop (0080+)**; optional
**`wedding_profile.traditions` drop**; **DASH-03a (wedding-card blurb — `projects.description` 0080+ +
editor)**; optional website-media orphan GC; budget dashboard overhaul (mockup-first); optional
reconciled payment schedule (model b); **optional per-member RSVP status (guest model B)**; optional
assistant write for note `action_status`; optional post-create edit for GST-12 association; demo →
real account conversion.

**Remaining planner side:** invoicing accepted proposals; deeper CRM; INV-06 (email delivery); `viewer`
invite (**WRITE-01 done — product decision remains**); CAL-01a (task-due calendar overlay); CON-03
(real PDF). PRICE-02 paid planner Checkout is **shipped** (was "remaining" in v34).

**Remaining seating:** SEAT-07 assistant mock-up; optional per-seat UI depth.

**Phase 4 — bridge:** lead→project conversion. **Re-audit every write policy when this ships.**

**Phase 5 — automation:** PROACTIVE assistant. (ASSIST-UI-01 is discovery only — not Phase 5.)

**Decided (append v35 — code-verified where noted):**
- **WRITE-01 write policies use `can_edit_project`; offering `viewer` is still a product deferral.**
- **CAL-04 is the only role-aware tab exception** (invited couple → Calendar).
- **WHITE-01 white-label is CoupleShell / invited viewers only** — not planner chrome, not public sites.
- **Couple trial is $7 week + day-7 $92 off-session**; cancel_at_period_end skips the claim.
- **Planner trial is local (no Stripe objects) until paid Checkout.**
- **Demo throttle thresholds live only in RPCs**; purge is Edge Function, not pg_cron.
- **ONB-06: business accounts start with zero projects.**
- **TMPL-01 clones structure only** (no dates/status/actuals/links).
- **RSVP velocity throttle is real and RPC-owned** (0072).
- (All prior "Decided" items from v34/v33/v32/v31/v30/v29/v28 carry forward.)

---

## 15. Start here next (pick-up point)

The couple product is feature-complete, shareable, and payable — Budget (v29), Guests (v30 + **GST-12**),
Website + per-member seating (v31 + **SEAT-13**), Notes + in-page assistant + Calendar (v32 + **CAL-03**
+ **CAL-04**), planner wedding cards / budget polish / Gmail reconnect (v33), demo + tours + 6-step
onboarding + CON-04 + **Agreements (v34)**, and **branding + WRITE-01 + throttles + couple/planner
billing + TMPL-01 + ONB-06 (v35)**. Schema pastes for **0060–0079** still need confirmation unless Dom
closed them. The planner product has a CRM + collaborator invites + wedding archive + Vendor library
**(detail/portfolio)** + **white-label branding** + authorable Calendar + **wedding cards** + **template
clone** + cross-project Contracts archive with templates **(+ assistant-drafted templates)**. Plan is
**couples-first launch**. Bible at **v35**. Schema through **0079** (on disk); next-free **0080**.

**Do not** resume a Modern romantic / VND-01 layout pass; **do not** reorder website sections with
@dnd-kit or pull @dnd-kit into the website editor; **do not** fork a second collapse affordance for the
section editor; **do not** import Supabase or `lib/partner-sides.ts` into `components/website/` (incl.
via the sticky preview); **do not** treat Calendar as strictly personal-only (CAL-04 invited couples
see it; collaborators do not); **do not** casually extend CAL-04's role exception to other tabs; **do
not** treat Registry as a workspace tab; **do not** assume Overview / assistant already import
`isTaskPastDue` (still multi-homed — verify/collapse); **do not** drop the DASH-03a blurb deferral;
**do not** trust "next-free 0070" (0070–0079 taken — next-free is **0080**); **do not** treat WRITE-01
as unfinished schema work (shipped; `viewer` invite is product-deferred); **do not** assume planner
bootstrap creates a placeholder project (ONB-06); **do not** drop `guests.meal_choice` /
`guests.party_size` until MEAL-03a, or `budget_items.due_date` / `rsvp_access_mode` / `traditions`
until parity (**0080+**); **do not** claim `party_size` is fully inert; **do not** resurrect a
`traditions` write path; **do not** restore an open/anonymous RSVP path or a guest-facing self-report
headcount as the count source; **do not** auto-match RSVP attendee names to `guest_members`; **do not**
treat `guest_members.attending` as the shown RSVP status (the badge is); **do not** persist a client
song when the toggle is off; **do not** drop the 0072 RSVP throttle when replacing `submit_rsvp`;
**do not** add anon SELECT on `registry_claims` / `rsvp_attendees` / `guest_members` / `guests` /
`rsvp_submissions` / `budget_payments` / `payment_schedule` / `notes` / `user_tours` /
`demo_start_attempts` / the seating tables / **`vendor-media`**; **do not** add a published gate to
`website-media` / `brand-media` SELECT; **do not** white-label planner chrome or public websites;
**do not** fork a second invitation mechanism; **do not** lead marketing copy with "AI"; **do not**
write `archived_at` except via `set_project_archived`; **do not** harden `budget_items.category` /
`timeline_events.owner`/`section` / `guest_members.relationship` to enums; **do not** set the
pending-invite cookie from InvitePage render (middleware only); **do not** reintroduce a review/apply
RSVP inbox; **do not** treat ASSIST-UI-01 as proactive automation (Phase 5); **do not** encode
sweetheart (or any table kind) in a status colour; **do not** invent title-string heuristics to filter
already-booked checklist tasks; **do not** emit `{{amount}}` from CON-04's generator; **do not** copy
template `rsvp_token`s or published website slugs in demo clones; **do not** mirror throttle constants
in app code.

**A. Confirm hand-paste of 0060 → … → 0079** (in order) + apply demo seeds + deploy/schedule
`purge-demo` + `charge-trial-balance`. Checkpoint: prior 0060–0069 items plus branding columns /
`brand-media` / `get_project_branding`; write policies on `can_edit_project`; `submit_rsvp` throttle;
demo purge helpers + clone throttle; business bootstrap returns null; payment method column + claim /
cancel RPCs; `clone_project_template`.

**A′. Confirm `isTaskPastDue` is single-sourced.** Grep for the past-due rule: confirm `buildOverviewData`
and the assistant `getChecklist` import `lib/task-overdue.ts` rather than re-inlining. If they still
inline, collapse to the one helper.

**B. Close the broad Soft stack + LAND-01/01a visual checkpoint** — still unwalked or newly shipped:
Notes / AskAssistantPrompt / Vendor detail / Calendar (**CAL-03 + CAL-04**), GST-12 / SEAT-13 /
DASH-03, demo CTA + banner + throttle UX, page tours, 6-step onboarding, CON-04, **Agreements**,
**Branding**, **lock screen**, **couple $7 Checkout + cancel**, **planner trial → paid**, **TMPL-01
New wedding clone**, planner dashboard/leads/billing/Access, `/vendors`, `/calendar`, `/contracts`,
landing, `/pricing`, login, `/invite/[token]`, `/w/[slug]` date hydration. Confirm no hydration
mismatch. Fix only real regressions.

**C. Invite Jordyn for real** (prefer an INV-07 collaborator invite; confirm
`project_members.role = 'collaborator'` in SQL after accept). Confirm the invited **collaborator**
does **not** see the Calendar tab; confirm an invited **couple** **does** (CAL-04).

**D. Apply + checkpoint any un-pasted migrations through 0079 + demo seeds + Edge Functions.** A file
on disk is not applied.

**E. MEAL-03a — drop `guests.meal_choice` AND `guests.party_size`. Migration 0080+** (after confirming
create-form no longer needs `party_size`; the `rsvp_submissions.party_size` column stays).

**F. Drop `budget_items.due_date`, `rsvp_access_mode`, and optionally `wedding_profile.traditions`.
Migration 0080+** — only after confirming parity.

**G. `viewer` invite (optional, post-WRITE-01).** Product decision only — write gates are done. If
offering, update Access allowlist + constants comment and smoke a read-only invite round trip.

**H. Budget dashboard overhaul (mockup-first).** Aesthetic; data model complete.

**I. Launch (after paste confirmation + visual QA).** Separate prod Supabase org on Pro + migrations
**0001–0079** (+ 0080 if MEAL-03a / drops shipped) by hand — never `db push` — + storage buckets
(`project-files` + `website-media` + **`vendor-media`** + **`brand-media`**) + Edge Functions + SMTP +
**demo template seeds**; Vercel + domain + env; Stripe live + webhook + Portal + Tax + couple trial
Price; prod Places key; Gmail testing mode; privacy + ToS; monitoring; **full prod smoke** — real
signup (couple + planner-with-zero-projects), deliberate double-click, a couple + collaborator +
**invited-couple Calendar** round trip, planner New-wedding create **with/without template clone**,
archive/unarchive, vendor library portfolio, calendar round trip, budget payment + schedule +
paid/actual bar, per-member seating + sweetheart, guest association add, gated RSVP + throttle,
website publish revalidation, AskAssistantPrompt, notes needs-action → done, CON-04 generate,
**branding on CoupleShell**, **lock screen → trial/Checkout**, **demo CTA + purge path**, page tour,
6-step onboarding Approve.

**J. Planner depth / revenue (post-launch).** Invoicing; INV-06 email; optional `viewer` invite;
CAL-01a; CON-03; reconciled payment schedule (model b); **guest model B**; lead→project conversion
(Phase 4 — re-audit write policies); demo → real account conversion.

**K. Seating — remaining (OPTIONAL).** SEAT-07 assistant mock-up; per-seat UI depth.

**L (other rounding-out):** moodboard; assistant tools for leads/proposals/RSVP/seating/invitations/
calendar/templates (re-run the §9 write-tool audit when any ship); optional note
`action_status` write tool; **update/retire the assistant guest-add path for GST-07/GST-12 fields**;
optional post-create GST-12 association edit; **DASH-03a wedding-card blurb**; `projects` DELETE policy
decision; website caching; website-media orphan GC; currency-helper consolidation;
**reconstruct 0050 `registry_teardown` + 0053 `files_vendor_link` rationale**; optional
Soft stack `reference.html`; retire CSS aliases; font-load scoping; countdown + calendar +
budget/guest-date hydration harden; Phase 5 proactive assistant; optional Calendar/Access/Timeline/
Contracts tours.

**Recommended path:** **paste + checkpoint 0060–0079 + demo seeds + Edge Functions + confirm
`isTaskPastDue` single-source (A/A′/D)** → **close the broad visual checkpoint + invite Jordyn
(B/C)** → **MEAL-03a + due_date/rsvp_access_mode/traditions drops (E/F)** → **budget dashboard mockup
(H)** → **Launch (I)** → optional `viewer` (G) → invoicing → INV-06 / CAL-01a / CON-03 / reconciled
schedule / guest model B → conversion (J) → remaining L.
