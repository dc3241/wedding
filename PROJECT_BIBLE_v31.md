# Wedding Planning SaaS — Project Bible (v31)

Canonical state document. **Supersedes v30.** Drop this into the Project's instructions/knowledge so
any new chat picks up cold. Lives in-repo at `PROJECT_BIBLE_v31.md`. The repo's `.cursor/design.mdc`,
`app/globals.css`, `design/reference.html` (stale — see §10), and `supabase/migrations/` remain the
live source of truth; this summarizes them and the decisions behind them. Current through migration
**0059**; **next-free migration is 0060**.

**v31 records two things atop v30 (the Guests-page rework): the Website-tab polish batch and
per-member seating.** All were verified before this write — the website UI walk passed and 0059 is
applied live and visually confirmed.

| Slice | What | Schema |
|---|---|---|
| **WEB-EDITOR-02** | Website editor UX: **section reorder** (up/down buttons — deliberately NOT @dnd-kit), **click-collapsible** section editors (reuses the shared collapse affordance), **sticky side preview** while editing. | **NONE** (order rides `content` jsonb) |
| **WEB-STYLE-01** | Visitor-facing website styling: **image border-shape options**; **timeline layout options + centering** on the public site. | **NONE** (`content` jsonb style props) |
| **RSVP-02** | Public RSVP form: **remove the "how many attending" self-report number** (headcount now derived from seat toggles / attendee rows); **email no longer required**. **UI-only — `submit_rsvp` untouched (still 0058), no DDL.** | **NONE** |
| **FIX-02** | Meal dropdown **white-text contrast fix** (Tier 3). | **NONE** |
| **SEAT-12** | **Per-member seating** — seating moves to the `guest_members` (person) grain, enabled by the GST-06 flatten. Applied live + visual-verified. | **0059** |

> **Provenance note:** WEB-EDITOR-02 / WEB-STYLE-01 / RSVP-02 / FIX-02 were done **Cursor freeform**
> ("fix the rest of the Website tab"), not slice-structured — no Step 0, no designed-to-fail
> checkpoint. They passed Dom's live visual walk before this promotion, which is why they're recorded
> as applied rather than "reported." **SEAT-12 / 0059** likewise landed via Cursor outside a slice; it
> is applied + visually verified, but **its DDL/intent was not reconstructed this session** — see the
> §5 factual-completeness flag (same class as 0053 / 0050).

Everything in v30 that isn't touched by the above carries forward unchanged: the full Guests-page
rework (GST-03…09 / 0054–0058), the full budget arc (BUD-03 / 0051, BUD-FILTER-01, BUD-QUICKADD-01/02,
BUD-NOTES-01, BUD-SCHED-01 / 0052), DASH-01, VND-08/08a, CAL-01, CON-01/01a/02, ARCH-01/01a, INV-08,
LAND-03, CHK-02/03, INV-02b, and everything they carried from v29 and earlier.

> **Numbering note:** **0059 is `seating_member_grain` (SEAT-12).** The v30 bible's "next-free 0059"
> claim is now **stale** — 0059 is taken. **Next-free is 0060.** The deferred trio — **MEAL-03a** (drop
> `guests.meal_choice` AND `guests.party_size`, both inert after the flatten), **ONB-02**, and the
> **`budget_items.due_date` drop** — plus the **`rsvp_access_mode` drop** candidate all take **0060+**.
> This is bible-claim-vs-taken-slot drift, NOT a 0053-class duplicate filename. Do not `db push`. **Do
> not offer `viewer` from Access** until WRITE-01. **CON-03** (real PDF bytes) remains **DEFERRED by
> choice**. **Marketing copy policy:** do not promote or lead with "AI"; frame as the app /
> "automatically" / "the assistant."

**Verification status (READ THIS):**
- **0031–0058** remain applied live (as recorded through v30).
- **0059 `seating_member_grain` (SEAT-12)** — **APPLIED LIVE + visually verified this cycle.** DDL not
  reconstructed this session (see §5 note); reconstruct from the migration file before relying on
  seating internals or asserting the occupancy-enforcement posture.
- **WEB-EDITOR-02 / WEB-STYLE-01 / RSVP-02 / FIX-02** — **visual-walk-verified** (Cursor freeform, no
  schema; RSVP-02 confirmed UI-only against an unchanged 0058 `submit_rsvp` and a nullable-since-0023
  `rsvp_submissions.email`).
- **RSVP-02 non-regression (confirmed):** `rsvp_submissions.email` nullable since **0023** — email
  went optional as a form-field removal, no `ALTER … DROP NOT NULL`. `submit_rsvp` body is still
  **0058** (gated-only 0054, song-gate 0057, badge auto-populate 0058 all intact). `party_size` remains
  `NOT NULL DEFAULT 1`, filled by the RPC's own rules (decline→1; plated-yes→`jsonb_array_length`;
  non-plated-yes→`clamp(coalesce(p_party_size,1),1..20)`); the guest-facing self-report is gone but the
  denormalized submissions column is never half-written.
- **v30 GST-08 / GST-09 UI walks — CLOSED.** The v31 public-RSVP walk exercised the same end-to-end path
  (household lookup → per-attendee meal/song → badge auto-populates → shows in the responses panel), so
  the song-renders-and-is-visible (GST-08) and gated-submit-flips-the-lines / no-apply-button (GST-09)
  checks are covered.
- **Still open (human gate):** the **broad** Soft stack + LAND-01/01a multi-surface visual checkpoint —
  the couple Guests/Budget/website surfaces and the public RSVP are now verified, but the planner
  dashboard/leads/billing/Access, `/vendors`, `/calendar`, `/contracts`, landing, `/pricing`, login,
  and `/invite/[token]` surfaces still want a walk unless Dom closed them in the same pass. See §10 / §15.

Sections changed from v30: header, **§1**, **§2**, **§3**, **§5** (0059), **§6** (Website editor +
public RSVP + Seating), **§7** (v31 batch + SEAT-12), **§9**, **§10**, **§11**, **§13**, **§14**, **§15**.

**Companion doc:** a separate **Launch Prep Runbook** exists (ops checklist for going to production).
This bible covers product/architecture state; the runbook covers deployment. Keep both.

---

## 1. What this is

An AI-native wedding-planning SaaS competing with Zola, The Knot, and Aisle Planner, serving BOTH
couples and wedding planners on one platform.

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
per-person meal members, gated-only RSVP that auto-populates the household badge, event-level song
requests, household mailing address**, budget with a per-item Estimate/Actual/Difference/Paid model +
payment ledger + dated payment schedule + filterable cards, notes, files, day-of timeline, gift
registry with public share + guest claims, in-app AI assistant, **a seating builder now at the
per-member grain**), a planner CRM (contracts, lead pipeline, proposals → accepted agreement →
printable contract, project access + couple/collaborator invitations, archive finished weddings, an
account-level Vendor library, an authorable Calendar, and a cross-project Contracts archive with
reusable contract templates), Stripe billing for both audiences, marketing `/` + `/pricing`, and a
**public, shareable wedding website** with a 5-template photo-led gallery, **an editor that reorders
and collapses sections with a sticky live preview, image border-shape and timeline-layout options**,
**adaptive meal- and song-aware gated RSVP intake** (household lookup → per-attendee meal + optional
song; **no self-report headcount, email optional**), and a registry sub-page.

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

- Multi-tenant. NEVER fork the data model or UI by audience — same model, different counts.
- **Authorization lives in the DATABASE via RLS, never in app code.** Trust RLS; mutate by
  `id`/`project_id`/`account_id`; no manual "and the user owns this" filters.
- Server components read (scoped); mutations are `'use server'` actions that write by id + call
  `revalidatePath`.
- Read existing migrations before writing queries; never invent columns; a new column = a new
  migration. TypeScript strict; `'use client'` only for interactivity; no localStorage/sessionStorage.

**Patterns (treat as rules):**

- **Project-scoped vs account-scoped is the spine.** Most features scope to a project via
  `can_access_project(project_id)`. **Pre-project CRM entities (leads, proposals), billing
  (subscriptions), and the account workspaces (calendar events, contract templates, the vendor
  library) are ACCOUNT-scoped** via `is_account_member(account_id)`. (RSVP submissions, seating,
  invitations, the budget ledger `budget_payments`, the `payment_schedule`, **guests / guest_members /
  rsvp_attendees** are project-scoped.)
- **`vendors` is ACCOUNT-scoped; `project_vendors` is the project-scoped LINK.** One vendor row can
  serve many projects in the same account. Every vendor UI action that says "remove" means **remove
  the link**, never the vendor. The account Vendor library (VND-08) is the one surface that adds a
  `vendors` row with NO `project_vendors` link, and the one place a `vendors` row may be deleted — and
  only when it has zero links.
- **Resolve the BUSINESS account explicitly** (`accounts.kind = 'business'` inner join), never naive
  first-membership. Couples resolve the `personal` account. Helpers in `lib/billing/resolve-account.ts`
  (`resolveBusinessAccountId`).
- **CHECK-constrain status enums.** EXCEPTION: Stripe-owned vocabularies aren't constrained.
  Constrained: `project_vendors.status` (0030/0031), `calendar_events.event_kind` (0045),
  `guests.rsvp_status` (`pending|attending|declined`), **`guest_members.relationship_side`
  (`partner_1|partner_2`, 0056)**. Remaining gap: the four vendor/file/template category columns — §13.
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
  surfaces** (three reads + one INSERT + two RPC executes) — see §4. **v31 adds NO anon surfaces**
  (RSVP-02's email-optional / no-headcount are client-form changes; `submit_rsvp` is untouched).
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
  (project_id, guest_id) → guests` ON DELETE CASCADE (0006). **Contrast seating occupancy, which
  remained action-enforced through v30 — VERIFY whether SEAT-12 / 0059 (seating member grain) altered
  that posture; its DDL was not reconstructed this session (§5).**
- **Structural enforcement can only act on a SHARED KEY. Say so out loud when it can't.**
- **A dedicated action owns an integrity obligation.** Don't extend a generic `update<Thing>(id,
  fields)` writer with a field that carries a constraint the generic writer doesn't understand.
  Exemplars: `setSeatingTableKind`, `setBudgetItemProjectVendor`, `removeProjectVendor`,
  `set_project_archived`, `addBudgetPayment`/`removeBudgetPayment`, `addScheduleInstallment`/
  `removeScheduleInstallment`, `addBudgetItemsBulk`. The guest writers validate their own canonical
  values — `addGuest` / `updateGuestMember` reject a `relationship` outside `lib/guest-relationships.ts`
  and a `relationship_side` outside the CHECK; `updateRsvp` and `submit_rsvp` both write
  `guests.rsvp_status` (see the dual-writer note below).
- **One terminal routing decision point per audience (ONB-00).** `/projects` is the ONLY place
  allowed to make a terminal routing decision for a personal or account-less account.
- **Two fields that can disagree are a bug waiting to happen; derive one from the other (ONB-01).**
- **A missing RLS policy on a writable table is a SILENT NO-OP that returns success, not an error.**
  Every time a new class of user gains READ access to a table, audit every WRITE policy on that table.
  **This audit (WRITE-01) is still outstanding for every project-scoped table other than `projects` —
  including `guests`, `guest_members`, `rsvp_attendees`, `budget_payments`, `payment_schedule`, and the
  seating tables** — see §13 and the WRITE-01 note in §15.
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
  read-dead after gated-only (0054, drop candidate 0060+); `guests.meal_choice` and `guests.party_size`
  doubly inert after the flatten (drop in MEAL-03a / 0060+).**
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
- No raised-inside-raised stacking.
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
  `guests` / `guest_members` / `rsvp_attendees`, **and the seating tables** — see §13.
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
  household/intake identity), `email` (nullable — **UI-deprecated by GST-07, column kept inert**),
  `phone` (nullable — surfaced in place of email), **`address` (nullable, 0056 — household mailing
  address)**, `household` (nullable label), `party_size` int default 1 (**doubly inert after the
  flatten — drop in MEAL-03a / 0060+**), `rsvp_status` text NOT NULL default `pending` CHECK
  `pending|attending|declined` (**the badge — the authoritative shown status; written by `updateRsvp`
  AND `submit_rsvp`**), `meal_choice` (nullable, **inert — drop in MEAL-03a**), `notes`, `created_at`,
  `rsvp_token` NOT NULL default `encode(gen_random_bytes(16),'hex')` (the per-household gated-lookup
  token).
- **`guest_members` (0040 + 0056)** — the **person / display line**. `id`, `project_id`, `guest_id`
  (composite FK `(project_id, guest_id) → guests` ON DELETE CASCADE), `name` (nullable), `meal_option_id`
  (nullable FK → `meal_options` ON DELETE SET NULL), `dietary_note` (nullable free-text), `attending`
  bool NOT NULL default true (**secondary/inert manual field — NOT the shown status; the badge is**),
  **`relationship_side` text nullable CHECK `partner_1|partner_2` (0056)**, **`relationship` text
  nullable (0056 — curated picklist value, NO DB CHECK, writer-guarded)**, `sort_order` int default 0,
  `created_at`. **SEAT-12 / 0059 gives this row the seating grain — reconstruct the exact seat linkage
  from the migration file (§5).**
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
> households. New guests from `addGuest` already get ≥1 member.

### Seating (SEAT-12 / 0059 — per-member grain)

Seating now operates at the **`guest_members` (person) grain**, enabled by the GST-06 flatten (a flat
person-list makes per-person seat assignment natural). Seating still uses its **own SVG pointer drag +
click-to-place / click-empty-to-move / arrow nudge — not @dnd-kit**. Applied live + visually verified.

> **⚠️ FACTUAL FLAG:** the exact seating tables/columns/FKs and whether occupancy is now
> **structurally** enforced (a shared-key constraint) or still **action**-enforced were NOT
> reconstructed this session (Dom did not paste `0059_seating_member_grain.sql`). Reconstruct from the
> migration file before relying on seating internals or asserting the enforcement posture. Same posture
> as the 0053 / 0050 rationale flags.

### `set_project_archived` + `projects.archived_at` (0044 / ARCH-01)

Unchanged. Sole writer `set_project_archived(uuid, boolean)` — SECURITY DEFINER,
`can_manage_project_access`-gated.

### The six public (anon) surfaces (UNCHANGED count in v31)

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
`calendar_events` / `contract_templates` / `budget_payments` / `payment_schedule` / the seating tables
have NO anon policy. Storage carve-out (0042 `website-media` public SELECT) is recorded, not counted.

> **Anon grant sharp edge (recorded, RLS-blocked):** the table-level GRANT on `guests` includes
> `UPDATE` to the anon role, but RLS (`can_access_project` only) blocks any *direct* anon UPDATE — the
> definer `submit_rsvp` is the sole anon-reachable badge writer. Safe today (RLS is the enforcer), but
> belt-and-suspenders-blocked rather than absent; fold into WRITE-01 and don't loosen the `guests`
> policy.

---

## 5. Migrations (source of truth: `supabase/migrations/`)

Applied in order. **You are the source of truth on the next number — next free is 0060.**

> **How migrations are applied here (READ THIS BEFORE SUGGESTING ANY CLI COMMAND):** by hand-pasting
> each file into the Supabase SQL editor and running it once, in order. There is NO CLI
> migration-history tracker. **`supabase db push` is FORBIDDEN.** `supabase db query --linked` for
> READS is sanctioned.

> **A migration paste must return clean. Any error means NOTHING applied.** After every migration,
> confirm with `to_regclass` / `to_regprocedure` / `pg_policies` / `pg_indexes` before running any
> checkpoint. A file on disk is NOT an applied migration.

> **Write migrations to be re-runnable.** `create or replace` for functions; `drop … if exists`
> before every `create policy` / `create trigger`; `create … if not exists` for indexes;
> `drop constraint if exists` before `add constraint`; guard backfills so a re-paste is a no-op.

- 0001–0047 as recorded in v28/v29 (core tenancy → contract_templates).
- 0048 budget_label_optional · 0049 budget_alert_dismissals · 0050 registry_teardown
- 0051 budget_payments (BUD-03) · 0052 payment_schedule (BUD-SCHED-01)
- 0053 files_vendor_link (drift-discovered — see v30 note) · 0054 rsvp_gated_only (GST-04)
- 0055 guest_members_backfill (GST-06) · 0056 guest_member_relationship (GST-07)
- 0057 song_requests (GST-08) · 0058 rsvp_autopopulate (GST-09)
- **0059 seating_member_grain (SEAT-12)**

(For DDL/introspection notes on 0026–0058, see v27/v28/v29/v30. New in v31 below.)

### 0059 seating_member_grain (SEAT-12) — APPLIED LIVE + visually verified, DDL UNRECONSTRUCTED

Moves seating to the `guest_members` (person) grain, enabled by the GST-06 flatten. Applied live and
confirmed in Dom's visual walk. **The DDL was NOT authored or reconstructed in this session** (the
migration file wasn't pasted here) — this is a factual-completeness gap of the same class as 0053
`files_vendor_link` and 0050 `registry_teardown`.

- **Flag — reconstruct before relying on seating internals:** the exact new tables/columns (e.g.
  whether a seat now references `guest_members(id)` vs `guests(id)`, any composite FK, any partial
  unique on `(table, seat)` for occupancy), and **whether occupancy became structurally enforced or
  stayed action-enforced (§3)**, must be read off the migration file. Do not assert the enforcement
  posture from memory.
- **RSVP-02 / WEB-EDITOR-02 / WEB-STYLE-01 / FIX-02 are NO-migration** (see §7): the two RSVP-form
  changes are UI-only against unchanged schema; the website editor/style changes ride `content` jsonb;
  the meal-dropdown fix is CSS.

**Verified this cycle:** 0059 present + applied; seating renders and assigns at the person grain in the
visual walk. RSVP-02 non-regression: `rsvp_submissions.email` nullable since 0023 (no DDL);
`submit_rsvp` body still 0058; `party_size` `NOT NULL DEFAULT 1` and RPC-derived.

### Column reference (v31 note; earlier entries unchanged)

Guest/RSVP columns unchanged from v30 (see v30 §5). **`rsvp_submissions`:** `email` nullable (since
0023; guest-facing input removed RSVP-02); `party_size` NOT NULL DEFAULT 1 (RPC-derived; self-report
input removed RSVP-02). **`wedding_websites`:** `content` jsonb now also carries section order +
per-section layout / image-shape options (WEB-EDITOR-02 / WEB-STYLE-01) — no new column.
**Seating tables:** member-grain (0059) — reconstruct exact columns from file.

**No-migration slices to date (append v31):** DASH-01; CON-01; budget row polish; BUD-FILTER-01;
BUD-QUICKADD-01/02; BUD-NOTES-01; GST-03; **WEB-EDITOR-02; WEB-STYLE-01; RSVP-02; FIX-02**. (Earlier
list carries forward.)

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

### Dashboard — Urgent grouped by wedding (DASH-01)

Unchanged. Collapsible per-wedding cards, `activeProjectIds`-scoped.

### Shared project workspace

`app/(app)/projects/[projectId]/layout.tsx`: tabs from `lib/project-tabs.ts`, role-gated
(`plannerOnly` / `coupleOnly`). Tabs: Overview / Checklist / **Calendar (couple-only)** /
Day-of timeline / Budget / Vendors / **Guests** / Seating / Website / Notes & files, plus
Contracts + Access (planner-only).

#### Guests tab (reworked in v30 — carries forward unchanged)

Flat one-line-per-person display over the preserved household tier; per-person relationship +
derived partner-side; household address + phone (email deprecated); RSVP dropdown (`updateRsvp`) with
the household badge as the authoritative shown status; no Headcount; single Add Guest (Bulk Add
removed); event-level song requests; gated submit auto-populates the badge; the responses panel is a
record, not an inbox. Full detail in v30 §6.

#### Seating tab (SEAT-12 — per-member grain)

Seats now assign at the `guest_members` (person) grain rather than the household grain. Own SVG drag /
click-to-place / arrow-nudge interaction (not @dnd-kit). Reconstruct exact seat linkage + occupancy
posture from 0059 before extending (§5).

#### Website editor tab (WEB-EDITOR-02 / WEB-STYLE-01)

`website/` editor: `page.tsx` (server read of the site + `content` jsonb) → editor with a **sticky side
preview** pinned while editing (renders `components/website/` with injected props only — no server
imports). Sections can be **reordered via up/down buttons** (not @dnd-kit) and **collapsed** per
section (the shared chevron/collapse affordance, §10); order + per-section options persist in `content`
jsonb. **Image border-shape options** and **timeline layout options + visitor-facing centering** are
per-section style props in `content`, rendered Tier 3 on the public site. `FIX-02` corrected the meal
dropdown white-text contrast.

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

`/leads`, `/account/billing`, `/vendors` (VND-08/08a), `/calendar` (CAL-01), `/contracts`
(CON-01/01a/02). Unchanged.

### Public surfaces (no auth, outside `(app)`)

`app/w/[slug]`, `/w/[slug]/rsvp`, `/w/[slug]/registry`, `/invite/[token]`. Marketing `/` + `/pricing`.
Marketing copy must not lead with "AI."

---

## 7. Features built

Pattern: a folder under the relevant scope with `page.tsx` (server read) + `actions.ts` (`'use server'`
writes by id + `revalidatePath`); RLS authorizes.

**The full per-slice build narratives for v1–v30 are preserved in the prior bibles and carry forward
unchanged** (unified shell, onboarding→plan, assistant, contracts, leads, proposals, billing, website
builder + 5-template gallery, RSVP, seating through SEAT-11, Soft stack, landing, invites, vendors,
registry, meals, the full budget arc, the v30 Guests-page rework GST-03…09, etc.). The v31 additions
are below.

### v31 — Website-tab polish (Cursor freeform, visual-walk-verified) + per-member seating

> **Provenance:** WEB-EDITOR-02 / WEB-STYLE-01 / RSVP-02 / FIX-02 / SEAT-12 landed via Cursor freeform
> outside the §11 slice process (no Step 0, no designed-to-fail checkpoint). They are recorded as
> applied because they passed Dom's live visual walk and (for RSVP-02) an explicit non-regression check
> against the unchanged 0058 RPC and 0023-nullable email column — not because Cursor narrated success.

#### WEB-EDITOR-02 — Website editor UX. NO SCHEMA.

Section **reorder** via up/down buttons (not @dnd-kit — respects the §15 constraint); **click-collapsible**
section editors (reuses the one shared collapse affordance, §10); **sticky side preview** pinned while
editing, rendering `components/website/` with injected props only (purity preserved — no Supabase/auth
imports, no `lib/partner-sides.ts`). Section order + per-section options persist in the site's `content`
jsonb (self-contained snapshot — §3).

#### WEB-STYLE-01 — Visitor-facing website styling. NO SCHEMA.

**Image border-shape options** (per-image style token) and **timeline layout options + centering** on
the public site. Tier 3; `--ws-*` / website radii, never Tier 1 utilities. Stored in `content` jsonb.

#### RSVP-02 — Public RSVP form. NO SCHEMA. UI-only.

Removed the guest-facing **"how many attending" number** (headcount now derived from seat toggles /
attendee rows and passed as `p_party_size`; the RPC's own rules still fill `rsvp_submissions.party_size`)
and made **email optional** (form-field removal; `rsvp_submissions.email` nullable since 0023).
`submit_rsvp` **unchanged** (still 0058): gated-only, song-gate, badge auto-populate all intact.
Consistent with the GST-06 flatten (guest-facing self-report gone; denormalized submissions count stays
filled).

#### FIX-02 — Meal dropdown contrast. NO SCHEMA.

White-text-on-light bug on the meal `<select>` fixed (Tier 3).

#### SEAT-12 — Per-member seating. Migration **0059**.

Seating moves to the `guest_members` (person) grain, enabled by the GST-06 flatten. Own SVG drag /
click-to-place interaction unchanged (not @dnd-kit). Applied live + visually verified. **DDL/enforcement
posture not reconstructed this session — see §5 flag.**

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

> **Read coverage is complete for project-scoped planning entities but NOT for account-scoped
> entities.** Surfaces WITHOUT assistant coverage include leads, proposals, invitations, seating (incl.
> the new per-member grain), the calendar, contract templates, the account vendor library, the budget
> ledger / payment schedule, **the guest-rework RSVP surfaces, and the v31 website editor / RSVP-form
> changes (no assistant tools shipped).** Website has a narrow write (`set_website_travel`). The
> assistant has no vendor-removal tool and should not get one.

> **Assistant write-tool canonical audit.** Enforced-canonical: `add_task`, `update_task_status`,
> `update_guest_rsvp`, `add_vendor_target`, `set_website_travel`. Free-text-by-design (correct, not a
> gap): `add_budget_item` category, `add_timeline_event(s)` owner/section, note/guest text, website
> schedule text.
> - `update_guest_rsvp` shares `guests.rsvp_status` with `submit_rsvp` (0058) — one column, two writers,
>   latest-wins (§3). Legitimate manual writer; no change needed.
> - **⚠️ VERIFY: the assistant's guest-add path predates the guest rework** and still writes the OLD
>   shape (email; no `address`, `relationship_side`, `relationship`). Not broken (all new columns
>   nullable), but out of sync with the couple-side form — update/retire before relying on
>   assistant-created guests carrying the new fields.
> **Re-run this audit when any new write tool ships** (none shipped in v31).

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
| **1 — App chrome** | `app/(app)/`, most of `components/`, planner, forms, **seating canvas**, assistant, settings, Access, `/vendors` / `/calendar` / `/contracts`, the Budget page, the Guests page, **the website editor incl. the sticky preview** | Soft stack palette + Figtree; two depth levels; three radii; **no** accent flood; **no** Cormorant/Great Vibes |
| **2 — Emotional** | Landing, onboarding hero/welcome, empty-state heroes, `/invite/[token]` | Same palette + Figtree; larger display scale; **exactly one** deep field `--deep` per surface |
| **3 — Website + print** | `components/website/`, public `/w/[slug]` (incl. the gated RSVP + song intake, **the image-shape + timeline-layout render**), `RunSheetDocument.tsx` print header, the contract print document | `--ws-*` colour + Cormorant + (Romance) Great Vibes + Hanken |

**Serif / script location rule:** Cormorant Garamond and Great Vibes may appear **only** in
`components/website/`, the run-sheet print header, and the contract print document.

**Status-colour meaning:** sage = settled/done/booked/signed/rsvp-yes/under-or-on budget; clay = in
flight; rosewood = wrong/overdue/over-plan/declined/rsvp-no/over budget; well/muted = neutral.
**Kind is never encoded in a status colour.**

> **rosewood is also the DESTRUCTIVE-ACTION colour** (muted at rest, rosewood on hover/focus).

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
for past-due).

### Open design items

| Item | Status |
|---|---|
| Legacy CSS aliases (`--plum`, `--stone`, …) | **Open** — temporary; no new alias consumers |
| `design/reference.html` regenerate | **Open** |
| `design/theme-direction.html` delete | **Open** |
| Font-load scoping | **Open** |
| **Dom live Soft stack + LAND-01 visual checkpoint** | **Partially closed** — Guests, Budget, website editor + public site, and public RSVP are **verified (v31)**; planner dashboard/leads/billing/Access, `/vendors` / `/calendar` / `/contracts`, landing, `/pricing`, login, `/invite/[token]` still want a walk unless closed in the same pass |
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

**Cursor-freeform work still needs the gate.** v31's website batch + SEAT-12 were done freeform, with
no Step 0 and no designed-to-fail checkpoint. They only earned "applied" in this bible **after** Dom's
live visual walk + an explicit RSVP-02 non-regression check (unchanged 0058 RPC; 0023-nullable email;
RPC-derived `party_size`). **Freeform is allowed under usage pressure, but the promotion bar is still a
live pass — and any migration it produces still needs the §5 landed-confirmation + DDL capture (SEAT-12
/ 0059 is recorded applied but DDL-unreconstructed — a residual gap, not a clean close).**

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
    fact.** 0053 surfaced during GST-04 Step 0; **0059 was taken by seating while the v30 bible still
    claimed "next-free 0059"** (bible-claim-vs-taken-slot, non-double-number). Grep
    `supabase/migrations/` before trusting a number.

**Documentation discipline:** the bible is written from the reasoning in the working session, not a code
scan. A code scan reliably catches **factual drift** (migration numbers, file paths, existence) — use it
for that, as a findings list, not as bible prose. It cannot reconstruct *why*. **Cursor does NOT author
the bible.** **Section-level diffs over full regenerations** (v31 is a full regeneration only because
the numbering correction rippled across the header/§5/§14/§15; return to section diffs next).

**Drift watchlist (append v31):**
- **Trusting "next-free 0059"** — it is taken by seating; next-free is **0060**.
- Reordering website sections with **@dnd-kit** (up/down buttons are sanctioned; §15).
- A **new collapse affordance** for the website section editor instead of the shared one.
- Server/Supabase or `lib/partner-sides.ts` imports into `components/website/` via the sticky preview.
- A future `submit_rsvp` replace that drops gated-only / song-gate / badge auto-populate while "just"
  touching the form (RSVP-02 did NOT — the RPC is still 0058).
- **Asserting the seating occupancy-enforcement posture from memory** — reconstruct from 0059 first.
- Dropping `guests.meal_choice` / `guests.party_size` / `rsvp_access_mode` / `budget_items.due_date`
  before their planned supersession migration (**0060+**).
- (All prior watchlist items from v30/v29/v28 carry forward — no open RSVP path; no fuzzy attendee-name
  match; badge is the shown status; relationship picklist stays free-text/unwired; store the
  partner-side token not the name; no Bride/Groom; server-gate songs when off; no review/apply inbox;
  Paid=ledger-only; no per-installment stored status; budget filter never rewrites the headline; etc.)

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
- **Seating (SEAT-12):** project-scoped, authenticated, no anon policy — reconstruct the exact write
  gate from 0059 and fold into WRITE-01.
- **Archive / Calendar / contract templates / Contracts downloads / Budget ledger + schedule:** as
  recorded — account- or project-scoped, authenticated, no anon policy, no service-role path; signed
  URLs (60s) for private-bucket downloads.
- **Gmail OAuth:** `gmail.send` sensitive scope → needs verification. Testing mode caps apply.
- **Signup:** `auth.signUp` only; no tenant created at signup.
- **Production infra:** prod belongs in a **separate Supabase org on Pro**. Fresh prod project,
  migrations **0001–0059** applied by hand once each in order (NEVER `db push`), storage buckets
  (`project-files` + `website-media`) + policies recreated, real SMTP, prod domain in auth redirect URLs.
  See the Launch Prep Runbook.
- Set Anthropic + Google Cloud + Stripe + Supabase billing/spend alerts.

---

## 13. Known caveats / things to verify

**Closed by earlier versions (v10–v30):** the full budget arc; 0026 introspection; ONB-00/ONB-01;
invitation RLS asymmetry; vendor category vocabularies; no vendor removal; booked-slot independence;
multi-owner run sheets; dance floor; registry; meals + per-household gated RSVP; website photos +
sections; collaborator invites; planner create; pricing/marketing; archive; invite cookie; account
Vendor library; calendar; contracts archive + templates; **the full Guests-page rework (GST-03…09)**.
Full detail in v27–v30 §13.

**Closed by v31:**
- **Website-tab polish shipped + visually verified:** section reorder (up/down) + collapsible editors +
  sticky preview; image border-shape options; timeline layout + centering; RSVP form email-optional +
  no self-report headcount (UI-only, RPC unchanged); meal-dropdown contrast fix.
- **Per-member seating shipped (SEAT-12 / 0059), applied live + visually verified.**
- **v30 GST-08 / GST-09 UI walks closed** (covered by the v31 public-RSVP end-to-end walk).

**Open — v31 (deferrals + gaps):**
- **0059 seating DDL/enforcement posture UNRECONSTRUCTED** — applied + verified, but the exact
  tables/columns/FKs and whether occupancy is structurally vs action-enforced were not captured this
  session. Reconstruct from the migration file before relying on seating internals (0053/0050-class).
- **`rsvp_access_mode` read-dead (0054), not dropped** — drop candidate **0060+**.
- **`guests.meal_choice` AND `guests.party_size` doubly inert** — both drop in **MEAL-03a / 0060+**.
  (`rsvp_submissions.party_size` is a DIFFERENT column — still live/RPC-derived, not dropped.)
- **`guests.email` inert (UI-deprecated), kept** — email may still matter for invites; later
  destructive migration if ever wanted.
- **Per-member RSVP status (model B) deferred.** GST-09 is household-badge only; the summary band counts
  people by household badge (multi-person households overcount slightly — consistent, not a bug).
- **Song `style=none` dead-toggle.** Toggle live but no surface when there's no attendee grain. Fix if
  confusing = disable the toggle when `style=none`. Leave for now.
- **Anon UPDATE grant on `guests`** — RLS-blocked; fold into WRITE-01.
- **Partner-side derive heuristic** — trailing-year strip + `&`/`and` split, backstopped by generic
  Partner 1/2.
- **Assistant guest-add path not updated** (§9) — predates the rework; verify/retire before relying on
  assistant-created guests carrying the new fields. **No assistant tools shipped in v31.**
- **`guest_members.relationship` free-text + the relationship picklist** — deliberate; do not enum, do
  not wire to `VENDOR_CATEGORIES`.
- **0053 `files_vendor_link` + 0050 `registry_teardown` rationale uncaptured; now also 0059
  `seating_member_grain` DDL uncaptured** — reconstruct each before relying on internals.

**Open — v29 budget (carried forward):** `budget_items.due_date` write-dead (drop 0060+ after parity);
reconciled payment schedule (model b) deferred; budget dashboard overhaul deferred (mockup-first);
`budget_payments`/`payment_schedule` ride `can_access_project` (viewer sharp edge); `budget_items.category`
free-text + quick-add list deliberate.

**Open — v28 (carried forward):** CON-03 deferred; CAL-01a deferred; contract category axis vendor-only;
`{{amount}}` no project source; `files.category` inherits the existing write gate; four NO-CHECK category
columns (ONB-02's decision).

**Open — security / schema (carried forward + v31):**
- **`viewer` can write on every project-scoped table except `projects` and the WRITE-01 exemplars** —
  `project_vendors`, `tasks`, `budget_items`, `budget_payments`, `payment_schedule`, `guests`,
  `guest_members`, `rsvp_attendees`, `notes`, `timeline_events`, `seating_*` (**incl. the SEAT-12 member
  grain**), `files` still gate writes on `can_access_project`, which a `viewer` passes. Unreached today
  (Access issues only `{couple, collaborator}`). **WRITE-01 before any `viewer` invite** — including the
  guest writers and the seating writers.
- **`projects` has NO DELETE policy** (silent-no-op shape, unreached).
- **Four category columns have NO CHECK** — ONB-02 (0060+). (`budget_items.category` and
  `guest_members.relationship` stay free-text — NOT in that CHECK set.)
- **`guest_members.attending` default true, inert as shown status** — the badge is authoritative.
- **`website-media` public SELECT has no published gate** — intentional.
- **`project_invitations.invited_by` / `accepted_by` have no FK to `auth.users`** — cosmetic.
- **`tasks.phase` free-text; `budget_items.category` / `timeline_events.owner`/`section` free-text** —
  deliberate; do not enum.

**Open — Soft stack / design (the standing human gate, now partially closed):** the broad Dom live Soft
stack + LAND-01/01a walk — Guests, Budget, website editor + public site, and public RSVP are verified
(v31); planner dashboard/leads/billing/Access, `/vendors` / `/calendar` / `/contracts`, landing,
`/pricing`, login, `/invite/[token]`, `/w/[slug]` date hydration still want a walk unless closed in the
same pass; budget dashboard overhaul mockup; Tier 1 date locale policy; stale `reference.html`;
`theme-direction.html` to delete; legacy CSS aliases; font-load scoping.

**Dev DB state (baseline — re-introspect before relying on rows):**
- `dominicciccaglione@gmail.com` — **personal**, "Dom & Jordyn 2027", wedding 2027-02-13. 12 guest
  households, every household ≥1 member (22 after the 0055 backfill). Song toggle state per §15 note.
  Seating now at the member grain (0059).
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
- **SEAT-12** — **0059.** Per-member seating (member grain), applied live + visually verified
  (DDL-uncaptured, §5).

Current through **0059**; next-free **0060** (the deferred trio — MEAL-03a incl. `party_size`, ONB-02,
`budget_items.due_date` drop — plus the `rsvp_access_mode` drop candidate all take 0060+).

**In progress:** the **broad** Dom Soft stack + LAND-01 live visual checkpoint (planner
dashboard/leads/billing/Access, `/vendors`, `/calendar`, `/contracts`, landing, `/pricing`, login,
`/invite/[token]`, `/w/[slug]` hydration) — the Guests/Budget/website/public-RSVP portions are done.

**Remaining couple side:** moodboard; **MEAL-03a (0060+, drops `guests.meal_choice` + `guests.party_size`)**;
**ONB-02 (0060+)**; **`budget_items.due_date` drop (0060+, after parity)**; **`rsvp_access_mode` drop
(0060+)**; optional website-media orphan GC; budget dashboard overhaul (mockup-first); optional
reconciled payment schedule (model b); **optional per-member RSVP status (guest model B —
member-ID-carrying gated form)**.

**Remaining planner side:** invoicing accepted proposals; deeper CRM; INV-06 (email delivery); `viewer`
invite (after WRITE-01); PRICE-02 (Stripe Prices + checkout); CAL-01a (task-due calendar overlay);
CON-03 (real PDF).

**Remaining seating:** SEAT-07 assistant mock-up (per-member seating itself now shipped as SEAT-12);
optional per-seat UI depth.

**Phase 4 — bridge:** lead→project conversion. **Re-audit every write policy when this ships.**

**Phase 5 — automation:** PROACTIVE assistant.

**Decided (append v31):**
- **Website section reorder uses up/down buttons, not @dnd-kit** (the website editor stays @dnd-kit-free).
- **Section order + per-section layout / image-shape options live in `content` jsonb**, not a new table.
- **RSVP is email-optional and collects no guest-facing headcount** — the count is server-derived; the
  RPC (0058) is untouched.
- **Seating is per-member (`guest_members` grain), enabled by the GST-06 flatten** — own SVG drag, not
  @dnd-kit.
- (All prior "Decided" items from v30/v29/v28 carry forward.)

---

## 15. Start here next (pick-up point)

The couple product is feature-complete, shareable, and payable — Budget (v29), Guests (v30), and now the
**Website editor + per-member seating (v31)** are all built and (for the v31 batch) visually verified.
The planner product has a CRM + collaborator invites + wedding archive + account Vendor library +
authorable Calendar + cross-project Contracts archive with templates. Plan is **couples-first launch**.
Bible at **v31**. Schema through **0059**; next-free **0060**.

**Do not** resume a Modern romantic / VND-01 layout pass; **do not** reorder website sections with
@dnd-kit or pull @dnd-kit into the website editor; **do not** fork a second collapse affordance for the
section editor; **do not** import Supabase or `lib/partner-sides.ts` into `components/website/` (incl.
via the sticky preview); **do not** assert the seating occupancy posture from memory (reconstruct 0059);
**do not** trust "next-free 0059" (taken — next-free is 0060); **do not** drop `guests.meal_choice` /
`guests.party_size` until MEAL-03a, or `budget_items.due_date` / `rsvp_access_mode` until parity
(0060+); **do not** restore an open/anonymous RSVP path or a guest-facing self-report headcount as the
count source; **do not** auto-match RSVP attendee names to `guest_members` (fuzzy match — guest model B
is a gated member-ID form); **do not** treat `guest_members.attending` as the shown RSVP status (the
badge is); **do not** persist a client song when the toggle is off; **do not** add anon SELECT on
`registry_claims` / `rsvp_attendees` / `guest_members` / `guests` / `rsvp_submissions` /
`budget_payments` / `payment_schedule` / the seating tables; **do not** add a published gate to
`website-media` SELECT; **do not** offer `viewer` from Access until WRITE-01; **do not** fork a second
invitation mechanism; **do not** wire PRICE-01 CTAs to invented Stripe Price IDs; **do not** lead
marketing copy with "AI"; **do not** write `archived_at` except via `set_project_archived`; **do not**
harden `budget_items.category` / `timeline_events.owner`/`section` / `guest_members.relationship` to
enums; **do not** set the pending-invite cookie from InvitePage render (middleware only); **do not**
reintroduce a review/apply RSVP inbox.

**A. Reconstruct 0059 (seating member grain).** Paste `0059_seating_member_grain.sql`; record its
tables/columns/FKs and the occupancy-enforcement posture into §3/§4/§5; confirm it's the recorded
applied state. This is the one residual gap from the v31 promotion.

**B. Close the broad Soft stack + LAND-01/01a visual checkpoint** — the surfaces still unwalked: planner
dashboard/leads/billing/Access, `/vendors`, `/calendar`, `/contracts`, landing, `/pricing`, login,
`/invite/[token]`, `/w/[slug]` date hydration. (Guests/Budget/website/public-RSVP already verified.)
Confirm no hydration mismatch (countdown + calendar all-day + budget due-dates + any guest/RSVP date
share the local-date tz class). Fix only real regressions.

**C. Invite Jordyn for real** (prefer an INV-07 collaborator invite; confirm
`project_members.role = 'collaborator'` in SQL after accept).

**D. Apply + checkpoint any un-pasted migrations through 0059.** A file on disk is not applied.

**E. MEAL-03a — drop `guests.meal_choice` AND `guests.party_size`. Migration 0060+** (after backfill
verification — both inert; the `rsvp_submissions.party_size` column stays).

**F. Drop `budget_items.due_date` and `rsvp_access_mode`. Migration 0060+** — only after confirming
parity (schedule installments cover every prior single-date item; RSVP has no read of the mode).

**G. ONB-02 — `commitPlan` atomicity + category CHECKs. Migration 0060+.** Three sequential non-atomic
inserts → a SECURITY DEFINER function. Owns the category-constraint decision across
`vendor_targets.category`, `vendors.category`, `files.category`, `contract_templates.category`.
(`budget_items.category` and `guest_members.relationship` stay free-text.)

**H. WRITE-01 — project-scoped write policy audit. BEFORE ANY `viewer` INVITE.** Enumerate every
project-scoped table; decide per table `can_access_project` (read-alike) vs `can_edit_project` (write);
migrate the ones that should change in one pass. Sharp `can_access_project` writes a `viewer` would pass
include the guest writers, **the seating writers (SEAT-12 member grain)**, `budget_payments` /
`payment_schedule` writers, `removeProjectVendor`, `deleteTask`, `setFileCategory`. Also resolve the
belt-and-suspenders anon UPDATE grant on `guests`. Collaborators already pass `can_edit_project`.

**I. Budget dashboard overhaul (mockup-first).** Aesthetic; data model complete.

**J. Launch (after ONB-02 + visual QA).** Separate prod Supabase org on Pro + migrations **0001–0059**
(+ 0060 if MEAL-03a / drops shipped) by hand — never `db push` — + storage buckets + SMTP; Vercel +
domain + env; Stripe live + webhook + Portal + Tax; prod Places key; Gmail testing mode; privacy + ToS;
monitoring; **full prod smoke** — real signup, deliberate double-click, a couple + a collaborator invite
round trip, planner New-wedding create, archive/unarchive, a vendor add/remove + package link cycle, a
vendor-library no-link add + guarded delete, a calendar event round trip incl. all-day + archive-overlay,
multi-line budget vendor links, a budget payment log + installment schedule + waterfall past-due round
trip, **a per-member seating assign cycle**, a flat guest add (address + phone + Guest 2 + per-person
relationship/side) + a gated household-lookup RSVP (per-attendee meal + song, **no email, no headcount
field**) that auto-populates the badge and shows in the responses panel, a hero/gallery upload +
five-template render + **a section reorder / collapse / image-shape / timeline-layout edit with the
sticky preview**, checklist delete, an assistant-built checklist, a contracts archive filter + signed
download, a template fill + Print/Save-as-PDF, a registry claim.

**K. Planner depth / revenue (post-launch).** Invoicing; INV-06 email; `viewer` invite (after WRITE-01);
PRICE-02; CAL-01a; CON-03; reconciled payment schedule (model b); **guest model B (per-member RSVP
status)**; lead→project conversion (Phase 4 — re-audit write policies).

**L. Seating — remaining (OPTIONAL).** SEAT-07 assistant mock-up; per-seat UI depth (per-member grain
itself shipped as SEAT-12).

**M (other rounding-out):** moodboard; assistant tools for leads/proposals/RSVP/seating/invitations/
calendar/templates/budget (re-run the §9 write-tool audit when any ship); **update/retire the assistant
guest-add path for the new fields**; `projects` DELETE policy decision; website caching; website-media
orphan GC; currency-helper consolidation; the stale `getBudget` double-count; **reconstruct 0050
`registry_teardown` + 0053 `files_vendor_link` + 0059 `seating_member_grain` rationale/DDL**; regenerate
`reference.html` / delete `theme-direction.html` / retire CSS aliases; font-load scoping; countdown +
calendar + budget/guest-date hydration harden.

**Recommended path:** **reconstruct 0059 + close the broad visual checkpoint + invite Jordyn (A/B/C)** →
**MEAL-03a + due_date/rsvp_access_mode drops (E/F)** → **ONB-02 / 0060 (G)** → **budget dashboard mockup
(I)** → **Launch (J)** → WRITE-01 before `viewer` (H) → invoicing → INV-06 / PRICE-02 / CAL-01a / CON-03
/ reconciled schedule / guest model B → conversion (K) → remaining M.