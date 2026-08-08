# Wedding Planning SaaS — Project Bible (v33)

Canonical state document. **Supersedes v32.** Drop this into the Project's instructions/knowledge so
any new chat picks up cold. Lives in-repo at `PROJECT_BIBLE_v33.md`. The repo's `.cursor/design.mdc`,
`app/globals.css`, `design/reference.html` (stale — see §10), and `supabase/migrations/` remain the
live source of truth; this summarizes them and the decisions behind them. Current through migration
**0064** (on disk); **next-free migration is 0065**.

**v33 records product slices atop v32** (which itself recorded NOTES-01 / ASSIST-UI-01 + CAL-02 /
VND-11 / DASH-02 catch-up).

| Slice | What | Schema |
|---|---|---|
| **GST-12** | Guest **plus-one / child association**: `member_type` (`adult`\|`child`) + `related_to_member_id` self-FK; "Guest of" create path; person-list association sublabels. Chain prevention is **writer-enforced** (no trigger). | **0063** |
| **SEAT-13** | **One sweetheart table per project** (partial unique index) + action demote of any prior sweetheart + empty sweetheart defaults to 2 seats. | **0064** |
| **CAL-03** | Calendar **hue polish**: `--cal-w-1…5` categorical wedding/kind tints; shared chips + legend; couple vs planner audience rules. | **NONE** |
| **DASH-03** | Planner dashboard **wedding cards** (`WeddingCardModel` / confirmed guests + task bar via `isTaskPastDue`). | **NONE** |
| **BUD polish** | Category / item bars = **paid ÷ actual** ramp (not actual-vs-planned); collapsed face shows Actual / Total paid / Next due. | **NONE** |
| **Gmail reconnect** | Require `refresh_token`; `noStore` on credential reads; reconnect messaging; advance `to_contact` → `contacted` on successful send. | **NONE** |

> **PROVENANCE — READ BEFORE TRUSTING v33 RATIONALE.** GST-12, SEAT-13, CAL-03, DASH-03 (partial —
> see below), BUD polish, and the Gmail hardening were built in **Cursor freeform, outside a Claude
> session** (no Step 0, no designed-to-fail checkpoint, no session reasoning captured), and this bible
> draft was **authored by Cursor** — against the standing rule that Cursor catches factual drift but
> does not author the bible. This version is that draft **reviewed and corrected by Claude**, same
> posture as v32. Consequences:
> - **Code-scan facts** (migration DDL, column/file existence, tab gating, which policy is on a table)
>   are reliable and recorded as such — 0063–0064 are on disk, live paste UNCONFIRMED.
> - **"Decided"/rationale for the freeform slices is reconstructed, adopted-for-now** — NOT a prior
>   in-session decision. Re-derive the *why* with Dom before any future work leans on it. This
>   includes GST-12 chain-prevention-not-a-trigger, SEAT-13 one-sweetheart, CAL-03 categorical hues,
>   and the BUD paid/actual reframe.
> - **DASH-03 is the exception:** its data model, the blurb deferral (→ DASH-03a), and the
>   `isTaskPastDue` extraction were reasoned in a Claude session (this cycle) and are session-authored,
>   not reconstructed — see the DASH-03 entry (§6/§7) and the DASH-03a deferral (§13/§14).

**Also closed / corrected in v33 (discrepancies found vs v32):**
- **Couple Calendar tab gating VERIFIED** — `coupleOnly` ⇒ `account.kind === "personal"` only.
  Business and invited members (`kind = null`) do **not** see the tab. RLS still dual-gates
  project-linked events (CAL-02); tab visibility is intentionally narrower than RLS.
- **Registry is NOT a workspace tab** — outbound registry links live under **Website** /
  `external_registry_links`. v32 incorrectly restored "Registry" as a tab. (Spot-check on the visual
  walk: v32-Cursor got this wrong in the *other* direction, so "Cursor says X now" after "Cursor said
  not-X before" earns one eyeball.)
- **Assistant `get_notes` / `get_note` DO surface `action_status`** (pin-sort + summary count) —
  confirmed in `lib/assistant/read-tools.ts`. `add_note` still does not set it.
- **0059 seating DDL reconstructed** — `seating_assignments.guest_member_id` + composite FK + unique;
  `guest_id` nullable/write-dead; occupancy remains **action-enforced**.
- **`guests.party_size` is not fully inert** — still written by `addGuest` and drives additional
  create slots; person-grain display/summary does not use it for headcount. Drop still deferred
  (MEAL-03a / **0065+**).
- **RsvpAccessCard removed** from Guests — no replacement card; `regenerateGuestRsvpToken` remains.

Everything in v32 that isn't touched by the above carries forward: NOTES-01 / ASSIST-UI-01, CAL-02 /
VND-11 / DASH-02, Website-tab polish, SEAT-12 / 0059, Guests GST-03…09, the budget arc, etc.

> **Numbering note:** **0063–0064 are taken** (`guest_member_association`, `seating_sweetheart_unique`).
> The v32 bible's "next-free 0063" claim is **stale**. **Next-free is 0065.** The deferred trio —
> **MEAL-03a** (drop `guests.meal_choice` AND `guests.party_size`), **ONB-02**, and the
> **`budget_items.due_date` drop** — plus the **`rsvp_access_mode` drop** candidate all take
> **0065+**. Do not `db push`. **Do not offer `viewer` from Access** until WRITE-01. **CON-03** (real
> PDF bytes) remains **DEFERRED by choice**. **Marketing copy policy:** do not promote or lead with
> "AI"; frame as the app / "automatically" / "the assistant."

**Verification status (READ THIS):**
- **0031–0059** remain as recorded (0059 applied live + visually verified; **DDL now reconstructed in
  §5**).
- **0060–0062** — ON DISK, DDL reconstructed; **live paste still UNCONFIRMED** unless Dom closed them.
- **0063 `guest_member_association` (GST-12)** — ON DISK, DDL reconstructed. **Confirm hand-paste**
  (`guest_members.member_type` / `related_to_member_id` + CHECKs + FK) before treating as live.
- **0064 `seating_sweetheart_unique` (SEAT-13)** — ON DISK. **Confirm hand-paste** (partial unique
  index `seating_tables_one_sweetheart_per_project`) before treating as live.
- **CAL-03 / DASH-03 / BUD polish / Gmail reconnect** — no schema; code shipped.
- **Couple Calendar tab gating CLOSED** — personal-only (`coupleOnly`); see §6.
- **Assistant notes-read shape CLOSED** — `action_status` returned; see §9.
- **Still open (human gate):** confirm **0060–0064** pastes; the **broad** Soft stack + LAND-01/01a
  visual checkpoint (now also Guests association + sweetheart + wedding cards + calendar hues). See
  §10 / §15.

Sections changed from v32: header, **§1**, **§3**, **§4** (guest association + seating DDL + notes /
calendar flags), **§5** (0063–0064 + 0059 reconstruct), **§6** (tabs / Calendar gate / Guests /
Dashboard / Seating / Calendar polish), **§7** (v33 batch), **§9**, **§10**, **§11**, **§12**,
**§13**, **§14**, **§15**.

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

The app spans: the couple planning product (onboarding → AI plan, checklist, vendors, **guests as a
flat one-line-per-person list over a preserved household tier — per-person relationship + partner-side,
plus-one/child association (GST-12), per-person meal members, gated-only RSVP that auto-populates the
household badge, event-level song requests, household mailing address**, budget with a per-item
Estimate/Actual/Difference/Paid model + payment ledger + dated payment schedule + filterable cards
(**paid/actual category bars**), **notes with an optional action lifecycle (needs-action pin / done) +
files**, day-of timeline, gift registry with public share + guest claims, **in-app AI assistant with
in-page prompts on Overview and empty tabs**, **a seating builder at the per-member grain with at most
one sweetheart table**, **a couple-only project Calendar tab with wedding/kind hue polish**), a planner
CRM (contracts, lead pipeline, proposals → accepted agreement → printable contract, project access +
couple/collaborator invitations, archive finished weddings, **dashboard wedding cards**, an
account-level Vendor library **with detail/portfolio + Instagram + private media**, an authorable
Calendar, and a cross-project Contracts archive with reusable contract templates), Stripe billing for
both audiences, marketing `/` + `/pricing`, and a **public, shareable wedding website** with a
5-template photo-led gallery, **an editor that reorders and collapses sections with a sticky live
preview, image border-shape and timeline-layout options**, **adaptive meal- and song-aware gated RSVP
intake** (household lookup → per-attendee meal + optional song; **no self-report headcount, email
optional**), and a registry sub-page (under Website / public `/w/[slug]/registry` — **not** a project
workspace tab).

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
- Stripe — subscription billing for couples and planners (flat monthly, test mode)
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
  the caller can access (`project_id is not null AND can_access_project(project_id)`); see §4. (RSVP
  submissions, seating, invitations, the budget ledger `budget_payments`, the `payment_schedule`,
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
  **`notes.action_status` (`needs_action|done` or null, 0062)**. Remaining gap: the four
  vendor/file/template category columns — §13.
- **Billing source of truth = the webhook-updated `subscriptions` row.**
- **Self-contained snapshot for public surfaces.** Public-rendered content stores its displayed data
  on its own row — never joins live into private tables. **Website section order + per-section layout /
  image-shape options live in the site's own `content` jsonb** (WEB-EDITOR-02 / WEB-STYLE-01), not in
  a separate table.
- **Service-role key is server-only and rare.** ONLY the Stripe webhook + billing/admin path.
- **Anon READ = one published-only RLS policy + the anon key.** New columns on an anon-readable row
  (e.g. `wedding_websites.song_requests_enabled`, 0057) are auto-readable **riders** — NOT new anon
  surfaces, no policy change.
- **Anon WRITE = tightly-scoped INSERT-only RLS (or a definer RPC) + server-derived scope.** Public
  writes are RSVP (`submit_rsvp` RPC) and registry claims (INSERT). **There are exactly SIX anon
  surfaces** (three reads + one INSERT + two RPC executes) — see §4. **v31–v33 add NO anon surfaces**
  (RSVP-02's email-optional / no-headcount are client-form changes; `submit_rsvp` is untouched;
  `vendor-media` is a private authenticated-only bucket; GST-12 / SEAT-13 are authenticated-only).
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
  unique on `seating_assignments`**; **0064's one-sweetheart-per-project partial unique index**.
  **Seating occupancy stays action-enforced** (writers check seat_count vs seated count) — 0059 did
  not add a structural occupancy constraint.
- **Structural enforcement can only act on a SHARED KEY. Say so out loud when it can't.**
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
  **This audit (WRITE-01) is still outstanding for every project-scoped (and project-accessible) table
  other than `projects` — including `guests`, `guest_members`, `rsvp_attendees`, `budget_payments`,
  `payment_schedule`, `notes`, project-linked `calendar_events`, and the seating tables** — see §13 and
  the WRITE-01 note in §15.
- **One concept must have ONE stored vocabulary, enforced at the write path.** Corollary: the
  **relationship picklist (`lib/guest-relationships.ts`)** is a STANDALONE UI+writer constant —
  deliberately NOT imported from / wired to `VENDOR_CATEGORIES`, carries NO DB CHECK, and is enforced
  by the guest writers (`isGuestRelationship`). A convenience picklist is not a vocabulary and must
  never be "unified" with the vendor-category ids. (Same posture as `budget-quick-categories.ts`.)
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
  read-dead after gated-only (0054, drop candidate 0065+); `guests.meal_choice` inert after the
  flatten (drop in MEAL-03a / 0065+); `guests.party_size` still written by `addGuest` for create-form
  slots but unused for person-grain headcount (also drop in MEAL-03a / 0065+).**
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
`project_members.role`. **`viewer` exists on the enum but is not issued by Access (INV-07 allowlist);
do not offer it until WRITE-01.**

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
  READ gate on every project-scoped surface, and the WRITE gate on most project-scoped tables,
  including `project_vendors`, `files`, `budget_items`, `budget_payments`, `payment_schedule`,
  `guests` / `guest_members` / `rsvp_attendees`, `notes`, project-linked `calendar_events` (via
  CAL-02), **and the seating tables** — see §13.
- **`is_account_member(account_id)`** — account-scoped features + project INSERT.
- **`can_manage_project_access(project_id)` (0028)** — gates `project_invitations`, the
  `project_members` DELETE, and `set_project_archived`.
- **`can_edit_project(project_id)` (0029)** — `is_account_member` OR a `project_members` row with
  `role in ('couple','collaborator')`. Gates the `projects` UPDATE policy and the WRITE-01 exemplars.
  **`viewer` deliberately excluded.**
- `can_read_vendor(vendor_id)`, `bootstrap_account_and_project(...)`,
  `resolveBusinessAccountId(supabase)`.

### Guest / RSVP tables (project-scoped) — the two-tier model (preserved, not flattened away)

The Guests page is a **flat one-line-per-person display** (GST-06), but the **data model stays two
tiers**. Household is the intake, token, mailing-address, and RSVP-grouping unit; the person is the
display line and the home for per-person fields.

- **`guests` (0006 + 0056)** — the **household**. `id`, `project_id`, `full_name` (NOT NULL —
  household/postal identity), `email` (nullable — **UI-deprecated by GST-07, column kept**; no
  add/edit field on Guests), `phone` (nullable — surfaced in place of email), **`address` (nullable,
  0056 — household mailing address)**, `household` (nullable label), `party_size` int default 1
  (**still written by `addGuest` and drives additional create-form slots; person-grain display/
  summary does not use it for headcount — drop in MEAL-03a / 0065+**), `rsvp_status` text NOT NULL
  default `pending` CHECK `pending|attending|declined` (**the badge — the authoritative shown status;
  written by `updateRsvp` AND `submit_rsvp`**), `meal_choice` (nullable, **inert — drop in MEAL-03a /
  0065+**), `notes`, `created_at`, `rsvp_token` NOT NULL default `encode(gen_random_bytes(16),'hex')`
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

### The six public (anon) surfaces (UNCHANGED count in v33)

1. **Read:** `wedding_websites` anon `SELECT using (published = true)` (0022). Riders:
   `external_registry_links` (0035), `meal_service_style` (0038), `rsvp_access_mode` (0041 —
   **read-dead**), `song_requests_enabled` (0057). **WEB-EDITOR-02 / WEB-STYLE-01 add no columns to the
   anon row — section order + layout/image-shape options live inside the existing `content` jsonb, an
   already-readable rider.**
2. **Write (RPC):** `submit_rsvp(...)` — definer, anon execute (0039; extended 0041; gated-only 0054;
   song handling 0057; auto-populates `guests.rsvp_status` in-transaction 0058). **UNCHANGED by
   RSVP-02** (email-optional / no-headcount are client-form changes; the RPC body is still 0058, the
   server still derives `party_size`).
3. **Read:** `registry_items` anon `SELECT` gated to a published site (0035).
4. **Write:** `registry_claims` anon `INSERT` gated to published sites (0036).
5. **Read:** `meal_options` anon `SELECT` gated to a published site (0038).
6. **Read (RPC):** `lookup_rsvp_household(...)` — definer, anon execute (0041; full-name in 0043).

`rsvp_attendees` / `guest_members` / `guests` / `rsvp_submissions` / `project_invitations` /
`calendar_events` / `contract_templates` / `budget_payments` / `payment_schedule` / `notes` / the
seating tables have NO anon policy. Storage carve-outs: **0042 `website-media` public SELECT**
(recorded, not counted); **0061 `vendor-media` private bucket** — authenticated account-member policies
only, **NO anon SELECT**, reads via signed URLs (same posture as `project-files`).

### Notes (NOTES-01 / 0062) — ON DISK, paste-unconfirmed

`notes` gains optional **`action_status` text** — `null` (ordinary), `needs_action` (pinned, rosewood
dot), or `done` (sage pill). CHECK: `action_status is null or action_status in ('needs_action','done')`.
UI: preview-card grid → modal editor; list sort pins `needs_action` first, then `updated_at` desc.
Deliberately a **tri-state annotation, not a second task system**. Assistant **`get_notes` / `get_note`
return `action_status`** (pin-sort + needs-action count in summary). Assistant `add_note` does **not**
set `action_status` (still title/body only — no note-status write tool).

### Calendar events RLS (CAL-02 / 0060) — ON DISK, paste-unconfirmed

Policy **"calendar events managed by account or project members"** replaces the account-members-only
policy: `is_account_member(account_id)` **OR** (`project_id is not null` AND `can_access_project(project_id)`),
both `using` and `with check`. Enables project-linked event writes for anyone who can access the
project (including invited collaborators). **Tab visibility is narrower:** the project Calendar tab is
**`coupleOnly`** (`kind === "personal"` only) — see §6. A `viewer` would still pass RLS here; fold
project-linked `calendar_events` into WRITE-01.

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

Applied in order. **You are the source of truth on the next number — next free is 0065.**

> **How migrations are applied here (READ THIS BEFORE SUGGESTING ANY CLI COMMAND):** by hand-pasting
> each file into the Supabase SQL editor and running it once, in order. There is NO CLI
> migration-history tracker. **`supabase db push` is FORBIDDEN.** `supabase db query --linked` for
> READS is sanctioned.

> **A migration paste must return clean. Any error means NOTHING applied.** After every migration,
> confirm with `to_regclass` / `to_regprocedure` / `pg_policies` / `pg_indexes` before running any
> checkpoint. A file on disk is NOT an applied migration. **0060–0064 are on disk with reconstructed
> DDL; live paste of 0060–0064 is UNCONFIRMED this cycle unless Dom already closed them — confirm
> before treating as applied.**

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

(For DDL/introspection notes on 0026–0058, see v27/v28/v29/v30. 0059–0064 below.)

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

**Verified this cycle (code scan):** GST-12 / SEAT-13 / CAL-03 / DASH-03 / BUD polish / Gmail reconnect
code; Calendar `coupleOnly` gating; assistant notes-read `action_status`; 0059 DDL reconstructed.
**NOT verified this cycle:** live paste of 0060–0064; DB introspection.

### Column reference (v33 note; earlier entries unchanged)

**`guest_members.member_type` / `related_to_member_id`** (0063). **`notes.action_status`** nullable
text + CHECK (0062). **`vendors.instagram`** nullable text (0061). **`wedding_websites.content`**
jsonb carries section order + layout / image-shape. **Seating:** member-grain assignments (0059) +
one-sweetheart-per-project index (0064).

**No-migration slices to date (append v33):** DASH-01; DASH-02; **DASH-03**; CON-01; budget row polish;
**BUD paid/actual ramp polish**; BUD-FILTER-01; BUD-QUICKADD-01/02; BUD-NOTES-01; GST-03; WEB-EDITOR-02;
WEB-STYLE-01; RSVP-02; FIX-02; ASSIST-UI-01; **CAL-03**; **Gmail reconnect hardening**. (Earlier list
carries forward.)

---

## 6. Shell & routing

One login. `lib/post-login-path.ts` routes by account kind.
- **Planner (business):** `/dashboard`, `PlannerShell` + `PlannerProjectSidebar`.
- **Couple (personal):** into their project workspace (`CoupleShell`), gated by onboarding.
- **Invited member (no account):** into the invited project via `/projects`.

### Planner sidebar nav

**Dashboard / Calendar / Leads / Vendors / Contracts / Billing** — all business-account-kind gated,
never `project_members.role`.

### The signup → workspace path

```
signup (auth.signUp only — NO bootstrap here)
  → email confirm → /auth/callback → exchangeCodeForSession
  → consumePendingInvite  ← INV-05
  → getPostLoginPath → getAccountContext:
      no account_members row      → /projects  ← THE terminal decision point
      kind = business             → /dashboard
      personal + firstProjectId   → getCoupleDestinationPath
      personal + 0 projects       → /projects
```

### `/projects` — the only terminal routing decision point

| account context | direct projects | → |
|---|---|---|
| `null` | 0 | `OnboardingForm` (bootstrap) |
| `null` | 1 | `/projects/{id}` — no onboarding gate |
| `null` | >1 | minimal Card list |
| `personal` | — | `getCoupleDestinationPath(firstProjectId)` |
| `business` | — | `/dashboard` |

> **`plannerOnly` resolves from ACCOUNT KIND, never from `project_members.role`.**

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
`/dashboard`).

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
`account.kind` (pass `null` for invited members — do **not** collapse null→personal).

**Exact membership + order** (`lib/project-tabs.ts`):
- **personal:** Overview · **Calendar** · Checklist · Budget · Vendors · Guests · Website · Seating ·
  Day-of timeline · Notes & files
- **business:** Overview · Checklist · Budget · Vendors · Guests · Website · Seating · Day-of timeline
  · Contracts · Notes & files · Access
- **null (invited member):** personal set **minus Calendar**

**Registry is NOT a workspace tab.** Public registry + claims remain anon surfaces; outbound registry
links live under Website / `external_registry_links`.

> **Calendar tab gating — VERIFIED (v33).** `coupleOnly: true` ⇒ shown only when
> `kind === "personal"`. Business and invited members do **not** see the tab. This is intentional and
> consistent with the "`plannerOnly` / `coupleOnly` resolve from account kind, never
> `project_members.role`" invariant. CAL-02 RLS remains wider (any `can_access_project` caller can
> manage project-linked events) — tab visibility ≠ RLS width.
>
> **Edge to eyeball on the walk:** `coupleOnly` resolving to `kind === "personal"` means *every*
> kind-null user loses the tab — that includes an **invited member whose role is `couple`**, not only
> collaborators. For a couples-first launch (couples self-serve on personal accounts) this is fine,
> but an invited *real couple* not seeing their own Calendar tab is an edge to confirm-or-note on the
> visual walk, not a settled nicety. If it becomes a real complaint, the fix is a role-aware exception
> — which would be the FIRST tab gate to read `project_members.role`, so it needs a deliberate
> decision, not a quiet patch.

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

#### Seating tab (SEAT-12 + SEAT-13)

Seats assign at the `guest_members` (person) grain. Own SVG drag / click-to-place / arrow-nudge (not
@dnd-kit). **SEAT-13:** at most one sweetheart table per project (0064 + `setSeatingTableKind`
demote); empty sweetheart defaults to 2 seats; canvas labels sweetheart by form/text (accent stroke),
never status colour. Occupancy action-enforced (§5).

#### Website editor tab (WEB-EDITOR-02 / WEB-STYLE-01)

`website/` editor: `page.tsx` (server read of the site + `content` jsonb) → editor with a **sticky side
preview** pinned while editing (renders `components/website/` with injected props only — no server
imports). Sections can be **reordered via up/down buttons** (not @dnd-kit) and **collapsed** per
section (the shared chevron/collapse affordance, §10); order + per-section options persist in `content`
jsonb. **Image border-shape options** and **timeline layout options + visitor-facing centering** are
per-section style props in `content`, rendered Tier 3 on the public site. `FIX-02` corrected the meal
dropdown white-text contrast. (Tab is labelled "Website"; the route/editor is `website/`.)

#### Public gated RSVP intake (`/w/[slug]/rsvp`) — RSVP-02

Renders the **gated** intake only (household lookup → the form). Per the meal service style: **plated**
→ per-attendee rows (name → meal → dietary), with a **song box under meal** when `song_requests_enabled`;
**buffet/family/stations** → optional per-attendee rows, **forced open** when songs are on;
**`style=none`** → household block, no attendee rows, no song UI. **RSVP-02:** the guest-facing "how
many attending" number is **gone** (headcount derives from seat toggles / attendee rows), and **email
is no longer required** (form-field removal; column nullable since 0023). `submit_rsvp` still writes the
submission + attendees, persists songs only when the toggle is on, derives `party_size` server-side, and
sets the household badge.

### Account-scoped planner surfaces

`/leads`, `/account/billing`, `/vendors` (VND-08/08a + **VND-11 detail/portfolio**), `/calendar`
(CAL-01 + **CAL-03 hues/chips/legend**), `/contracts` (CON-01/01a/02). Couple project Calendar is
under the project workspace (`/projects/[id]/calendar`, CAL-02 RLS; **tab = personal-only**, §6).
Shared calendar chrome: `CalendarEventChip`, `CalendarLegend`, `lib/calendar-hues.ts` (`--cal-w-1…5`
categorical wedding/kind tints — not status colours).

### Public surfaces (no auth, outside `(app)`)

`app/w/[slug]`, `/w/[slug]/rsvp`, `/w/[slug]/registry`, `/invite/[token]`. Marketing `/` + `/pricing`.
Marketing copy must not lead with "AI."

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
tab gating verified personal-only (v33, §6).

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

---

## 8. Onboarding → AI starting plan

Unchanged from v29/v30. 3-step wizard captures `wedding_profile` + `wedding_date` + `total_budget`;
`generate-wedding-plan.ts` returns strict JSON; editable preview; **Approve** (`commitPlan`) inserts
tasks/budget_items/vendor_targets, stamps `onboarded_at`, guards double-commit. Computed task due dates
floor through `clampDueDateToToday`; `phase` is derived, never authored.

> **⚠️ `onboarded_at` lives on `wedding_profile`, NOT on `projects`.** A planner-created project has no
> `wedding_profile` row (Mila & Griffin reads null — correct). This is also why the partner-side derive
> (GST-07) needs a `projects.name` fallback: planner projects have no profile to read names from.

> **Invited couples never see the wizard.** The discriminator is whether the user owns the account that
> owns the project.

The generator's response shape (ONB-01) is unchanged; `vendorCategories[].category` must be a
`VENDOR_CATEGORIES` id; the generated budget `category` is free-text; `plannedAmount` becomes Estimate.

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
> the per-member grain + sweetheart), the calendar, contract templates, the account vendor library, the
> budget ledger / payment schedule, **and the guest-rework RSVP / website-editor / GST-12 association
> surfaces (no new tools in v32/v33).** Website has a narrow write (`set_website_travel`). The assistant
> has no vendor-removal tool and should not get one.
> - **`get_notes` / `get_note` return `action_status`** (pin-sort needs-action; summary count) —
>   confirmed in `lib/assistant/read-tools.ts` (v33). **`add_note` still does NOT set `action_status`**
>   (no note-status write tool).

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
> **Re-run this audit when any new write tool ships** (none shipped in v33 — discovery/UI only).

> The legacy `getBudget` assistant READ tool still double-counts quotes into `allocated`; the UI read
> path does not. Stale; separate cleanup.

---

## 10. Design system — Soft stack (C1)

> **This section is a POINTER.** Token VALUES live in `app/globals.css`. RULES live in
> `.cursor/design.mdc`. If they disagree with this file, those two win. `design/reference.html` is
> **stale**; regenerate. `design/theme-direction.html` is superseded — delete.

**Direction:** Soft stack (C1) — calm tool organized by **depth**. Mauve-tinted canvas; raised white
cards; recessed wells for rows/tracks. Hierarchy = raised-contains-recessed.

### Three-tier surface taxonomy

| Tier | Where | What it gets |
|---|---|---|
| **1 — App chrome** | `app/(app)/`, most of `components/`, planner, forms, **seating canvas**, assistant + **in-page `AskAssistantPrompt` wells**, settings, Access, `/vendors` / `/calendar` / `/contracts`, the Budget page, the Guests page, **the Notes board**, **the website editor incl. the sticky preview**, **the dashboard wedding cards** | Soft stack palette + Figtree; two depth levels; three radii; **no** accent flood; **no** Cormorant/Great Vibes |
| **2 — Emotional** | Landing, onboarding hero/welcome, empty-state heroes, `/invite/[token]` | Same palette + Figtree; larger display scale; **exactly one** deep field `--deep` per surface |
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
| `design/reference.html` regenerate | **Open** |
| `design/theme-direction.html` delete | **Open** |
| Font-load scoping | **Open** |
| **Dom live Soft stack + LAND-01 visual checkpoint** | **Partially closed** — Guests, Budget, website editor + public site, and public RSVP are **verified (v31)**; Notes board + AskAssistantPrompt + Vendor library detail + couple Calendar + **GST-12 association / SEAT-13 sweetheart / DASH-03 wedding cards / CAL-03 hues** are **shipped but unwalked**; planner dashboard/leads/billing/Access, `/vendors` / `/calendar` / `/contracts`, landing, `/pricing`, login, `/invite/[token]` still want a walk unless closed in the same pass |
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

**Cursor-freeform work still needs the gate.** v31–v33 product work includes freeform Cursor batches
(the entire v33 product batch except DASH-03 ran freeform, outside a Claude session). The promotion bar
is still a live pass — and any migration still needs the §5 landed-confirmation. **0060–0064 pastes
remain unconfirmed** unless Dom closed them. 0059 DDL is now reconstructed (v33).

**Cursor must not author the bible.** v32 AND v33 are both the exception that proves the rule: Cursor
drafted each under credit pressure / freeform work, and each took a full Claude review pass to strip
reconstructed rationale back to "reconstructed, adopted-for-now," restore the DASH-03a deferral, flag
the `isTaskPastDue` single-source risk, and correct the invited-couple Calendar edge. Prefer: Claude
authors the bible from session reasoning; a code scan is a **findings list** for factual drift only
(migration numbers, columns, paths, gating).

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
    while v32 claimed next-free 0063**. Grep `supabase/migrations/` before trusting a number.

**Documentation discipline:** factual drift (numbers, paths, existence, gating) may be corrected from
a code scan. Prefer section-level diffs.

**Drift watchlist (append v33):**
- **Trusting "next-free 0063"** — **0063–0064 are taken**; next-free is **0065**.
- Re-opening Calendar tab gating as undecided — it is **verified personal-only** (§6). But do NOT read
  "personal-only" as "collaborators only lose it" — every kind-null user loses it, invited couples
  included (§6 edge note).
- Treating Registry as a workspace tab — it is **not**; links live under Website.
- Assuming assistant guest-add writes GST-12 fields — it does **not** yet (§9).
- Assuming Overview / assistant already import `isTaskPastDue` — DASH-03 extracted it but did NOT
  refactor them in-slice; verify before trusting the rule is single-sourced (§13).
- Dropping the DASH-03a blurb decision — it's a deliberate deferral (needs `projects.description` +
  an editor), not an omission (§13 / §14).
- Nesting a raised `EmptyState` / card inside another raised card — keep recessed-prompt pattern.
- Reordering website sections with **@dnd-kit** (up/down buttons are sanctioned; §15).
- A **new collapse affordance** for the website section editor instead of the shared one.
- Server/Supabase or `lib/partner-sides.ts` imports into `components/website/` via the sticky preview.
- A future `submit_rsvp` replace that drops gated-only / song-gate / badge auto-populate while "just"
  touching the form (RSVP-02 did NOT — the RPC is still 0058).
- Dropping `guests.meal_choice` / `guests.party_size` / `rsvp_access_mode` / `budget_items.due_date`
  before their planned supersession migration (**0065+**). Claiming `party_size` is fully inert —
  it still drives create-form slots.
- Adding a second sweetheart without demoting (0064 + action enforce uniqueness).
- Encoding table kind in a status colour (sweetheart uses form/text + accent stroke only).
- Treating ASSIST-UI-01 as Phase 5 proactive assistant (it is discovery-only).
- (All prior watchlist items from v32/v31/v30/v29/v28 carry forward — no open RSVP path; no fuzzy
  attendee-name match; badge is the shown status; relationship picklist stays free-text/unwired; store
  the partner-side token not the name; no Bride/Groom; server-gate songs when off; no review/apply
  inbox; Paid=ledger-only; no per-installment stored status; budget filter never rewrites the headline;
  etc.)

---

## 12. Compliance & security notes

- **Stripe:** webhook verifies raw-body signature; service-role only in webhook (+ billing/admin);
  entitlement read only from the `subscriptions` row. **Stripe Tax NOT set up.**
- **Public website / registry / meal-options / song-toggle read:** anon `SELECT` gated to a published
  site (the song toggle + section-order/layout options are riders on the existing published read /
  `content` jsonb — no new surface).
- **Public RSVP write:** `submit_rsvp` RPC only; **gated-only (0054)** — every submission
  household-token-bound; `project_id` server-derived; honeypot + soft throttle; **auto-populates
  `guests.rsvp_status` in-transaction (0058) via the definer function.** **RSVP-02 changed only the
  client form** (email optional; no self-report headcount) — the RPC still derives `party_size` and
  writes the badge. **Collects guest PII** (names, songs, dietary; email now optional) → privacy policy.
- **Anon grant sharp edge:** the table GRANT on `guests` includes UPDATE to anon, but RLS blocks any
  direct anon write — the definer RPC is the only anon-reachable badge writer. Fold into WRITE-01.
- **Public registry claim:** anon INSERT gated to published sites; honeypot + throttle.
- **Invitations:** raw tokens 32 random bytes base64url, stored only as sha256 hex; acceptance bound to
  `auth.email()`; expiry 14 days; revocation immediate. Pending-invite cookie httpOnly, `sameSite: lax`,
  secure in prod, 30-min, consumed once, set in middleware (INV-08).
- **Guest gated-lookup token:** `guests.rsvp_token` (16 random bytes hex); `lookup_rsvp_household`
  definer/anon-execute surfaces a household's members by token; `submit_rsvp` re-resolves server-side.
- **Seating (SEAT-12/13):** project-scoped, authenticated, no anon policy; writers gate on
  `can_access_project` (a `viewer` would pass) — fold into WRITE-01.
- **Calendar (CAL-02):** project-linked `calendar_events` writable by any project member via
  `can_access_project` — a `viewer` would pass. Fold into WRITE-01. Tab is personal-only (§6).
- **Notes (NOTES-01):** `notes.action_status` project-scoped, authenticated, no anon policy;
  `can_access_project`-gated writes — a `viewer` would pass. Fold into WRITE-01.
- **Archive / Calendar / contract templates / Contracts downloads / Budget ledger + schedule /
  Vendor-media:** as recorded — account- or project-scoped, authenticated, no anon policy (except the
  published website-media carve-out), no service-role path; signed URLs (60s) for private-bucket
  downloads (**incl. `vendor-media`**).
- **Gmail OAuth:** `gmail.send` sensitive scope → needs verification. Testing mode caps apply.
  **v33 reconnect hardening:** require `refresh_token`; `noStore` on credential reads; reconnect
  messaging; advance `to_contact` → `contacted` on successful send.
- **Signup:** `auth.signUp` only; no tenant created at signup.
- **Production infra:** prod belongs in a **separate Supabase org on Pro**. Fresh prod project,
  migrations **0001–0064** applied by hand once each in order (NEVER `db push`), storage buckets
  (`project-files` + `website-media` + **`vendor-media`**) + policies recreated, real SMTP, prod domain
  in auth redirect URLs. See the Launch Prep Runbook.
- Set Anthropic + Google Cloud + Stripe + Supabase billing/spend alerts.

---

## 13. Known caveats / things to verify

**Closed by earlier versions (v10–v31):** the full budget arc; 0026 introspection; ONB-00/ONB-01;
invitation RLS asymmetry; vendor category vocabularies; no vendor removal; booked-slot independence;
multi-owner run sheets; dance floor; registry; meals + per-household gated RSVP; website photos +
sections; collaborator invites; planner create; pricing/marketing; archive; invite cookie; account
Vendor library; calendar; contracts archive + templates; **the full Guests-page rework (GST-03…09)**;
**Website-tab polish + SEAT-12 (v31)**. Full detail in v27–v31 §13.

**Shipped and recorded (v32/v33) — residual paste confirmation only where noted:**
- **NOTES-01** — notes action lifecycle + preview/modal board; **0062** on disk (confirm paste).
  Assistant read tools **do** return `action_status` (§9).
- **ASSIST-UI-01** — in-page `AskAssistantPrompt` (no schema; no new write tools).
- **CAL-02 / VND-11 / DASH-02** — **0060** / **0061** / no schema (confirm 0060–0061 pastes).
- **GST-12 / SEAT-13 / CAL-03 / DASH-03 / BUD polish / Gmail reconnect** — **0063** / **0064** / no
  schema (confirm 0063–0064 pastes).
- **Couple Calendar tab gating CLOSED** — personal-only (§6).
- **0059 seating DDL RECONSTRUCTED** — occupancy remains action-enforced (§5).

**Open — v33 (deferrals + gaps):**
- **0060–0064 hand-paste UNCONFIRMED** — on disk + DDL reconstructed; confirm before treating as live.
- **DASH-03a (deferred) — wedding-card blurb.** DASH-03 shipped schema-free by design; the one-line
  card description was split out as DASH-03a, needing `projects.description` (**0065+**) AND an actual
  edit affordance. Deferred deliberately to avoid a dead write path (no column without an editor).
  Not dropped — pending.
- **Past-due predicate single-source UNVERIFIED.** DASH-03 introduced `lib/task-overdue.ts`
  (`isTaskPastDue`) as the canonical rule, but Overview (`buildOverviewData`) and the assistant
  (`getChecklist`) were NOT refactored in-slice. Confirm they import `isTaskPastDue` rather than
  re-inlining the rule; if they still inline it, the predicate lives in 3 places — collapse to one.
- **`rsvp_access_mode` read-dead (0054), not dropped** — drop candidate **0065+**.
- **`guests.meal_choice` inert; `guests.party_size` still written for create slots** — both drop in
  **MEAL-03a / 0065+**. (`rsvp_submissions.party_size` is a DIFFERENT column — still live/RPC-derived.)
- **`guests.email` UI-deprecated, kept** — email may still matter for invites; later destructive
  migration if ever wanted.
- **Per-member RSVP status (model B) deferred.** GST-09 is household-badge only; the summary band counts
  people by household badge (multi-person households overcount slightly — consistent, not a bug). The
  **DASH-03 confirmed-guest card count is the same household-badge grain** — same caveat, new consumer.
- **GST-12 association not editable after create** — deliberate for now; no update writer for
  `related_to_member_id` / `member_type`.
- **Song `style=none` dead-toggle.** Toggle live but no surface when there's no attendee grain. Fix if
  confusing = disable the toggle when `style=none`. Leave for now.
- **Anon UPDATE grant on `guests`** — RLS-blocked; fold into WRITE-01.
- **Partner-side derive heuristic** — trailing-year strip + `&`/`and` split, backstopped by generic
  Partner 1/2.
- **Assistant guest-add path not updated** (§9) — predates GST-07/GST-12; verify/retire before relying
  on assistant-created guests. **No new assistant write tools in v33** (`add_note` still omits
  `action_status`).
- **`guest_members.relationship` free-text + the relationship picklist** — deliberate; do not enum, do
  not wire to `VENDOR_CATEGORIES`.
- **0053 `files_vendor_link` + 0050 `registry_teardown` rationale uncaptured** — reconstruct before
  relying on internals. (0059 DDL now captured.)

**Open — v29 budget (carried forward):** `budget_items.due_date` write-dead (drop **0065+** after parity);
reconciled payment schedule (model b) deferred; budget dashboard overhaul deferred (mockup-first);
`budget_payments`/`payment_schedule` ride `can_access_project` (viewer sharp edge); `budget_items.category`
free-text + quick-add list deliberate.

**Open — v28 (carried forward):** CON-03 deferred; CAL-01a deferred; contract category axis vendor-only;
`{{amount}}` no project source; `files.category` inherits the existing write gate; four NO-CHECK category
columns (ONB-02's decision).

**Open — security / schema (carried forward + v33):**
- **`viewer` can write on every project-scoped (or project-accessible) table except `projects` and the
  WRITE-01 exemplars** — `project_vendors`, `tasks`, `budget_items`, `budget_payments`,
  `payment_schedule`, `guests`, `guest_members` (**incl. GST-12 association columns**), `rsvp_attendees`,
  `notes` (**incl. `action_status`**), `timeline_events`, `seating_*` (**incl. SEAT-12/13**), `files`,
  and (via CAL-02) project-linked `calendar_events` still gate writes on `can_access_project`, which a
  `viewer` passes. Unreached today (Access issues only `{couple, collaborator}`). **WRITE-01 before any
  `viewer` invite** — including guest, seating, notes, and calendar writers.
- **`projects` has NO DELETE policy** (silent-no-op shape, unreached).
- **Four category columns have NO CHECK** — ONB-02 (**0065+**). (`budget_items.category` and
  `guest_members.relationship` stay free-text — NOT in that CHECK set.)
- **`guest_members.attending` default true, inert as shown status** — the badge is authoritative.
- **`website-media` public SELECT has no published gate** — intentional. **`vendor-media` has no anon
  SELECT** — intentional (private + signed URLs).
- **`project_invitations.invited_by` / `accepted_by` have no FK to `auth.users`** — cosmetic.
- **`tasks.phase` free-text; `budget_items.category` / `timeline_events.owner`/`section` free-text** —
  deliberate; do not enum.

**Open — Soft stack / design (the standing human gate, now partially closed):** the broad Dom live Soft
stack + LAND-01/01a walk — Guests, Budget, website editor + public site, and public RSVP are verified
(v31); Notes / AskAssistantPrompt / Vendor library detail / couple Calendar / **GST-12 / SEAT-13 /
DASH-03 / CAL-03** are shipped-but-unwalked; planner dashboard/leads/billing/Access, `/vendors` /
`/calendar` / `/contracts`, landing, `/pricing`, login, `/invite/[token]`, `/w/[slug]` date hydration
still want a walk unless closed in the same pass; budget dashboard overhaul mockup; Tier 1 date locale
policy; stale `reference.html`; `theme-direction.html` to delete; legacy CSS aliases; font-load scoping.

**Dev DB state (baseline — re-introspect before relying on rows):**
- `dominicciccaglione@gmail.com` — **personal**, "Dom & Jordyn 2027", wedding 2027-02-13. 12 guest
  households, every household ≥1 member (22 after the 0055 backfill). Song toggle state per §15 note.
  Seating at member grain (0059). Confirm **0060–0064** if using Calendar / vendor media / notes action
  status / guest association / sweetheart uniqueness.
- `d.ciccaglione1@gmail.com` — **business**, "Events by Jordyn". Projects include Mila & Griffin
  (planner-created, no `wedding_profile`, 2027-02-15, $40,000, 0 members — must remain), Matt & Courtney
  (2027-06-13), Bryce & Emma (no date set — budget/guest test project).
- `d.ciccaglione@icloud.com` — **orphaned auth user, 0 memberships** (invited-couple fixture).
> Confirm song-request toggles are OFF on both test projects post-verification if not already.

---

## 14. Roadmap

**Done (v1–v30):** unified shell + routing; timeline; couple onboarding → AI plan; AI assistant;
Contracts; lead pipeline; proposals → printable contract; Stripe billing; website builder + 5-template
gallery; public RSVP; **seating through SEAT-11**; Soft stack chrome; landing overhaul; planner invites
(INV-01…08); vendor category/status/removal + booked slots + packages; dance floor; gift registry; meals
+ per-household gated RSVP; photo-led website; archive; planner workspace expansion (DASH-01,
VND-08/08a, CAL-01, CON-01/01a/02); the full budget money-tracking arc; **the Guests-page rework
(GST-03…09 / 0054–0058).** Migrations **0001–0058**.

**Done (v31 — Website-tab polish + per-member seating):**
- **WEB-EDITOR-02** — No schema. Section reorder (up/down) + collapsible editors + sticky preview.
- **WEB-STYLE-01** — No schema. Image border-shape options; timeline layout + centering.
- **RSVP-02** — No schema. Public RSVP form: email optional; self-report headcount removed (UI-only).
- **FIX-02** — No schema. Meal dropdown contrast fix.
- **SEAT-12** — **0059.** Per-member seating (member grain), applied live + visually verified.

**Done (v32 — Notes + assistant discovery + catch-up):**
- **NOTES-01** — **0062** (on disk). Notes action lifecycle + preview/modal board.
- **ASSIST-UI-01** — No schema. In-page `AskAssistantPrompt` on Overview + empty tabs.
- **CAL-02** — **0060** (on disk, catch-up). Calendar project-member RLS. Tab gating = personal-only
  (verified v33).
- **VND-11** — **0061** (on disk, catch-up). `vendors.instagram` + private `vendor-media` bucket.
- **DASH-02** — No schema (catch-up). Shared `ProjectOverview`.

**Done (v33 — Guest association + sweetheart + polish):**
- **GST-12** — **0063** (on disk). Plus-one / child association on `guest_members`.
- **SEAT-13** — **0064** (on disk). One sweetheart table per project.
- **CAL-03** — No schema. Calendar hues / chips / legend.
- **DASH-03** — No schema. Planner wedding cards (session-authored; blurb → DASH-03a).
- **BUD polish** — No schema. Paid/actual category bars.
- **Gmail reconnect** — No schema. Refresh-token / reconnect hardening.

Current through **0064** (on disk); next-free **0065** (the deferred trio — MEAL-03a incl. `party_size`,
ONB-02, `budget_items.due_date` drop — plus the `rsvp_access_mode` drop candidate all take **0065+**).

**In progress:** confirm **0060–0064 hand-pastes**; the **broad** Dom Soft stack + LAND-01 live visual
checkpoint (Notes / AskAssistantPrompt / Vendor detail / couple Calendar / GST-12 / SEAT-13 / DASH-03 /
CAL-03 + planner surfaces still unwalked unless closed).

**Remaining couple side:** moodboard; **MEAL-03a (0065+, drops `guests.meal_choice` + `guests.party_size`)**;
**ONB-02 (0065+)**; **`budget_items.due_date` drop (0065+, after parity)**; **`rsvp_access_mode` drop
(0065+)**; **DASH-03a (wedding-card blurb — `projects.description` 0065+ + editor)**; optional
website-media orphan GC; budget dashboard overhaul (mockup-first); optional reconciled payment schedule
(model b); **optional per-member RSVP status (guest model B — member-ID-carrying gated form)**; optional
assistant write for note `action_status`; optional post-create edit for GST-12 association.

**Remaining planner side:** invoicing accepted proposals; deeper CRM; INV-06 (email delivery); `viewer`
invite (after WRITE-01); PRICE-02 (Stripe Prices + checkout); CAL-01a (task-due calendar overlay);
CON-03 (real PDF).

**Remaining seating:** SEAT-07 assistant mock-up (per-member seating itself now shipped as SEAT-12);
optional per-seat UI depth.

**Phase 4 — bridge:** lead→project conversion. **Re-audit every write policy when this ships.**

**Phase 5 — automation:** PROACTIVE assistant. (ASSIST-UI-01 is discovery only — not Phase 5.)

**Decided (append v33 — code-verified where noted; rationale reconstructed unless flagged
session-authored):**
- **Notes action status is optional tri-state** (`null` / `needs_action` / `done`) with pin-sort; not a
  second task system. Assistant reads surface it; writes do not (yet). *(Reconstructed.)*
- **In-page assistant prompts use recessed Soft stack wells** inside raised cards / EmptyState action
  slots — no accent floods, no raised-inside-raised.
- **`vendor-media` is private** (signed URLs); do not add anon SELECT.
- **Couple project Calendar RLS is dual-gated** (account member OR project access) — CAL-02. **Tab
  visibility is personal-account-only** (`coupleOnly`) — verified in `lib/project-tabs.ts`; every
  kind-null user (incl. invited couples) loses the tab (§6 edge note).
- **Plus-one/child association is person-grain** (`member_type` + `related_to_member_id`); chain
  prevention is writer-enforced, not a trigger. *(Reconstructed.)*
- **At most one sweetheart table per project** (partial unique index + action demote). *(Reconstructed.)*
- **Calendar wedding/kind hues are categorical** (`--cal-w-*`), never status colours. *(Reconstructed.)*
- **Budget category bars read paid ÷ actual**, not actual-vs-planned. *(Reconstructed.)*
- **DASH-03 wedding cards ship schema-free; the blurb is deferred to DASH-03a** (no `projects.description`
  column without an editor — dead-write-path avoidance). The past-due rule is extracted to
  `lib/task-overdue.ts`. *(Session-authored.)*
- (All prior "Decided" items from v32/v31/v30/v29/v28 carry forward — website up/down reorder; content
  jsonb layout options; email-optional RSVP; per-member seating; etc.)

---

## 15. Start here next (pick-up point)

The couple product is feature-complete, shareable, and payable — Budget (v29), Guests (v30 + **GST-12**),
Website + per-member seating (v31 + **SEAT-13**), Notes + in-page assistant + couple Calendar (v32 +
**CAL-03**), and planner wedding cards / budget polish / Gmail reconnect (v33). Schema pastes for
**0060–0064** still need confirmation unless Dom closed them. The planner product has a CRM +
collaborator invites + wedding archive + account Vendor library **(detail/portfolio + Instagram +
private media)** + authorable Calendar + **wedding cards** + cross-project Contracts archive with
templates. Plan is **couples-first launch**. Bible at **v33**. Schema through **0064** (on disk);
next-free **0065**.

**Do not** resume a Modern romantic / VND-01 layout pass; **do not** reorder website sections with
@dnd-kit or pull @dnd-kit into the website editor; **do not** fork a second collapse affordance for the
section editor; **do not** import Supabase or `lib/partner-sides.ts` into `components/website/` (incl.
via the sticky preview); **do not** re-open Calendar tab gating as undecided (it is **personal-only** —
and that excludes invited couples, not just collaborators, §6); **do not** treat Registry as a workspace
tab; **do not** assume Overview / assistant already import `isTaskPastDue` (DASH-03 extracted it but
didn't refactor them — verify); **do not** drop the DASH-03a blurb deferral; **do not** trust "next-free
0063" (0063–0064 taken — next-free is **0065**); **do not** drop `guests.meal_choice` /
`guests.party_size` until MEAL-03a, or `budget_items.due_date` / `rsvp_access_mode` until parity
(**0065+**); **do not** claim `party_size` is fully inert (it still drives create slots); **do not**
restore an open/anonymous RSVP path or a guest-facing self-report headcount as the count source; **do
not** auto-match RSVP attendee names to `guest_members`; **do not** treat `guest_members.attending` as
the shown RSVP status (the badge is); **do not** persist a client song when the toggle is off; **do
not** add anon SELECT on `registry_claims` / `rsvp_attendees` / `guest_members` / `guests` /
`rsvp_submissions` / `budget_payments` / `payment_schedule` / `notes` / the seating tables /
**`vendor-media`**; **do not** add a published gate to `website-media` SELECT; **do not** offer `viewer`
from Access until WRITE-01; **do not** fork a second invitation mechanism; **do not** wire PRICE-01 CTAs
to invented Stripe Price IDs; **do not** lead marketing copy with "AI"; **do not** write `archived_at`
except via `set_project_archived`; **do not** harden `budget_items.category` /
`timeline_events.owner`/`section` / `guest_members.relationship` to enums; **do not** set the
pending-invite cookie from InvitePage render (middleware only); **do not** reintroduce a review/apply
RSVP inbox; **do not** treat ASSIST-UI-01 as proactive automation (Phase 5); **do not** encode
sweetheart (or any table kind) in a status colour.

**A. Confirm hand-paste of 0060 → 0061 → 0062 → 0063 → 0064** (in order). Checkpoint: `calendar_events`
policy; `vendors.instagram` + `vendor-media`; `notes.action_status` + CHECK; `guest_members.member_type`
/ `related_to_member_id` + FK/CHECKs; `seating_tables_one_sweetheart_per_project` index.

**A′. Confirm `isTaskPastDue` is single-sourced.** Grep for the past-due rule (strict local-date `<`,
`status <> 'done'`): confirm `buildOverviewData` and the assistant `getChecklist` import
`lib/task-overdue.ts` rather than re-inlining it. If they still inline, collapse to the one helper.

**B. Close the broad Soft stack + LAND-01/01a visual checkpoint** — still unwalked or newly shipped:
Notes board + AskAssistantPrompt empties, Vendor library detail/portfolio, couple Calendar (**incl.
CAL-03 hues**), **GST-12 Guest of / association sublabels**, **SEAT-13 sweetheart**, **DASH-03 wedding
cards** (confirm: real confirmed-guest count vs the task total; overdue segment matches
`status <> 'done' and due_date < current_date`; Bryce & Emma shows "Date not set / no countdown", no
`in NaN days`; a tasks=0 project shows "No tasks yet"; **archive from the card → leaves the ACTIVE grid
AND archived ids stay out of the guest/task aggregates**; Enter → `/projects/{id}`), planner
dashboard/leads/billing/Access, `/vendors`, `/calendar`, `/contracts`, landing, `/pricing`, login,
`/invite/[token]`, `/w/[slug]` date hydration. (Guests core / Budget / website / public-RSVP already
verified — re-spot-check association + paid/actual bars.) Confirm no hydration mismatch (countdown +
calendar all-day + budget due-dates + any guest/RSVP/card date share the local-date tz class). Fix only
real regressions.

**C. Invite Jordyn for real** (prefer an INV-07 collaborator invite; confirm
`project_members.role = 'collaborator'` in SQL after accept). Confirm the invited collaborator does
**not** see the Calendar tab.

**D. Apply + checkpoint any un-pasted migrations through 0064.** A file on disk is not applied.

**E. MEAL-03a — drop `guests.meal_choice` AND `guests.party_size`. Migration 0065+** (after confirming
create-form no longer needs `party_size`; the `rsvp_submissions.party_size` column stays).

**F. Drop `budget_items.due_date` and `rsvp_access_mode`. Migration 0065+** — only after confirming
parity (schedule installments cover every prior single-date item; RSVP has no read of the mode).

**G. ONB-02 — `commitPlan` atomicity + category CHECKs. Migration 0065+.** Three sequential non-atomic
inserts → a SECURITY DEFINER function. Owns the category-constraint decision across
`vendor_targets.category`, `vendors.category`, `files.category`, `contract_templates.category`.
(`budget_items.category` and `guest_members.relationship` stay free-text.)

**H. WRITE-01 — project-scoped write policy audit. BEFORE ANY `viewer` INVITE.** Enumerate every
project-scoped (and project-accessible) table; decide per table `can_access_project` (read-alike) vs
`can_edit_project` (write); migrate the ones that should change in one pass. Sharp `can_access_project`
writes a `viewer` would pass include the guest writers (**incl. GST-12**), **the seating writers
(SEAT-12/13)**, **notes (incl. `action_status`)**, **project-linked `calendar_events` (CAL-02)**,
`budget_payments` / `payment_schedule` writers, `removeProjectVendor`, `deleteTask`, `setFileCategory`.
Also resolve the belt-and-suspenders anon UPDATE grant on `guests`. Collaborators already pass
`can_edit_project`.

**I. Budget dashboard overhaul (mockup-first).** Aesthetic; data model complete.

**J. Launch (after ONB-02 + visual QA).** Separate prod Supabase org on Pro + migrations **0001–0064**
(+ 0065 if MEAL-03a / drops shipped) by hand — never `db push` — + storage buckets
(`project-files` + `website-media` + **`vendor-media`**) + SMTP; Vercel + domain + env; Stripe live +
webhook + Portal + Tax; prod Places key; Gmail testing mode; privacy + ToS; monitoring; **full prod
smoke** — real signup, deliberate double-click, a couple + a collaborator invite round trip, planner
New-wedding create, archive/unarchive, a vendor add/remove + package link cycle, a vendor-library
no-link add + guarded delete + **portfolio upload**, a calendar event round trip incl. all-day +
archive-overlay + **couple project Calendar**, multi-line budget vendor links, a budget payment log +
installment schedule + waterfall past-due + **paid/actual bar** round trip, **a per-member seating
assign + sweetheart cycle**, a flat guest add (address + phone + Guest 2 + relationship/side) + **a
Guest-of association add**, a gated household-lookup RSVP (per-attendee meal + song, **no email, no
headcount field**) that auto-populates the badge and shows in the responses panel, a hero/gallery
upload + five-template render + **a section reorder / collapse / image-shape / timeline-layout edit
with the sticky preview**, checklist delete, an assistant-built checklist **opened from an
AskAssistantPrompt**, a notes needs-action → done cycle, a contracts archive filter + signed download,
a template fill + Print/Save-as-PDF, a registry claim, **planner wedding-card archive/enter**.

**K. Planner depth / revenue (post-launch).** Invoicing; INV-06 email; `viewer` invite (after WRITE-01);
PRICE-02; CAL-01a; CON-03; reconciled payment schedule (model b); **guest model B (per-member RSVP
status)**; lead→project conversion (Phase 4 — re-audit write policies).

**L. Seating — remaining (OPTIONAL).** SEAT-07 assistant mock-up; per-seat UI depth (per-member grain
+ sweetheart uniqueness already shipped).

**M (other rounding-out):** moodboard; assistant tools for leads/proposals/RSVP/seating/invitations/
calendar/templates/budget (re-run the §9 write-tool audit when any ship); optional note
`action_status` write tool; **update/retire the assistant guest-add path for GST-07/GST-12 fields**;
optional post-create GST-12 association edit; **DASH-03a wedding-card blurb**; `projects` DELETE policy
decision; website caching; website-media orphan GC; currency-helper consolidation; the stale `getBudget`
double-count; **reconstruct 0050 `registry_teardown` + 0053 `files_vendor_link` rationale**; regenerate
`reference.html` / delete `theme-direction.html` / retire CSS aliases; font-load scoping; countdown +
calendar + budget/guest-date hydration harden; Phase 5 proactive assistant (beyond ASSIST-UI-01
discovery).

**Recommended path:** **paste + checkpoint 0060–0064 + confirm `isTaskPastDue` single-source (A/A′/D)**
→ **close the broad visual checkpoint + invite Jordyn (B/C)** → **MEAL-03a + due_date/rsvp_access_mode
drops (E/F)** → **ONB-02 / 0065 (G)** → **budget dashboard mockup (I)** → **Launch (J)** → WRITE-01
before `viewer` (H) → invoicing → INV-06 / PRICE-02 / CAL-01a / CON-03 / reconciled schedule / guest
model B → conversion (K) → remaining M.