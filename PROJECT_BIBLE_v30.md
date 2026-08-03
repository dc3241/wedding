# Wedding Planning SaaS — Project Bible (v30)

Canonical state document. **Supersedes v29.** Drop this into the Project's instructions/knowledge so
any new chat picks up cold. Lives in-repo at `PROJECT_BIBLE_v30.md`. The repo's `.cursor/design.mdc`,
`app/globals.css`, `design/reference.html` (stale — see §10), and `supabase/migrations/` remain the
live source of truth; this summarizes them and the decisions behind them. Current through migration
**0058**; **next-free migration is 0059**.

**v30 records the Guests-page rework — all ten of the planner-review findings, shipped as GST-03
through GST-09.** The guest list is now a flat one-line-per-person view over a preserved two-tier
model, RSVP is gated-only and auto-populating, and guests carry per-person relationship + partner-side
plus event-level song requests. Atop v29 (the budget money-tracking arc):

| Slice | What | Schema |
|---|---|---|
| **GST-03** | Remove **Bulk Add** from the Guests page (household-era mass entry). Unshared `bulkAddGuests` action deleted. | **NONE** |
| **GST-04** | **RSVP is gated-only.** `submit_rsvp` always requires a household token; open/anonymous branch removed. `rsvp_access_mode` kept but **read-dead** (default flipped `open`→`gated`, existing rows backfilled). | **0054** |
| **GST-06** | **Flatten** the list to one line per person (`guest_members` is the display grain); household stays as intake + token + address + RSVP-grouping. **Headcount removed** (#7). Zero-member legacy households backfilled to one member line. | **0055** |
| **GST-07** | Couple-side guest fields: household **address**, **phone-over-email** (email inert-kept), per-person **relationship_side** (derived partner label) + **relationship** (curated picklist), **Guest 2/3** placeholders, **RSVP dropdown**. | **0056** |
| **GST-08 (4b)** | **Song requests** — event-level toggle on `wedding_websites`; per-attendee song box under meal selection; stored on `rsvp_attendees`; surfaced to the couple. | **0057** |
| **GST-09 (#10)** | Gated submit **auto-populates the household badge** in the same transaction (yes→attending, no→declined). Review/apply "inbox" retired; panel is now a record. | **0058** |

Everything in v29 that isn't touched by the above carries forward unchanged: the full budget arc
(BUD-03 / 0051, BUD-FILTER-01, BUD-QUICKADD-01/02, BUD-NOTES-01, BUD-SCHED-01 / 0052), DASH-01,
VND-08/08a, CAL-01, CON-01/01a/02, ARCH-01/01a, INV-08, LAND-03, CHK-02/03, INV-02b, and everything
they carried from v28 and earlier.

> **Numbering note:** **0054 is `rsvp_gated_only` (GST-04), 0055 `guest_members_backfill` (GST-06),
> 0056 `guest_member_relationship` (GST-07), 0057 `song_requests` (GST-08), 0058 `rsvp_autopopulate`
> (GST-09).** During GST-04 Step 0 we discovered **0053 `files_vendor_link`** already on disk and
> applied — the v29 bible never recorded it (same class as the v29-discovered 0048–0050); §5 now
> records it with the rationale flagged unreconstructed. **MEAL-03a (drop `guests.meal_choice` — and
> now `guests.party_size`, doubly inert after the flatten), ONB-02, and the `budget_items.due_date`
> drop all take next-free at build time (0059+).** Do not `db push`. **Do not offer `viewer` from
> Access** until WRITE-01. **CON-03** (real PDF bytes) remains **DEFERRED by choice**.
> **Marketing copy policy:** do not promote or lead with "AI"; frame as the app / "automatically" /
> "the assistant."

**Verification status (READ THIS):**
- **0031–0052** remain applied live (as recorded through v29).
- **0053 `files_vendor_link`** — applied live (discovered during GST-04 Step 0; DDL not authored in
  this session — see §5 factual-completeness note).
- **0054 (GST-04), 0055 (GST-06), 0056 (GST-07), 0057 (GST-08), 0058 (GST-09)** — **APPLIED LIVE +
  RPC/DB-verified this cycle.**
  - **0054:** `submit_rsvp` always requires a household token. **Kill-shot (verified):** no-token
    submit → `household_required` (incl. former-open site); token-bound submit → succeeds.
    `rsvp_access_mode` default flipped to `gated`, existing `open` rows backfilled → column reads only
    `gated`.
  - **0055:** data-only backfill, idempotent. **Verified:** Dom & Jordyn members 19→22, zero-member
    households 3→0, re-paste held at 22. **Kill-shot:** Joe Cig (badge `attending`, 0 members)
    reappears as an attending line — would have vanished from a members-only list without the backfill.
  - **0056:** `guests.address`; `guest_members.relationship_side` (CHECK `partner_1|partner_2`) +
    `relationship` (no CHECK, writer-guarded). **Verified:** columns + CHECK live; derive resolves
    `"Dom & Jordyn 2027"` → Dom / Jordyn (year stripped), planner projects with no `wedding_profile`
    resolve named sides without crashing, unsplittable name → Partner 1/2, `"Neighbor"` rejected by
    the writer guard.
  - **0057:** `wedding_websites.song_requests_enabled` (default false); `rsvp_attendees.song_request`.
    **Kill-shot (verified):** toggle OFF + client sends a song → stored NULL (server gates it, not just
    the UI); toggle ON → persists; a buffet **song-only** attendee row (name/dietary both null)
    survives the continue guard.
  - **0058:** `submit_rsvp` create-or-replace, preserving all 0057 behavior + a same-transaction
    `UPDATE guests SET rsvp_status`. **Kill-shot (verified):** a `pending` household submitting YES →
    `attending` with no manual apply, while a **different** untouched pending household stays `pending`
    (the move is caused by the submit, not ambient); NO → `declined`; resubmit yes-then-no → `declined`
    (latest wins). Dead review/apply/match code removed.
- **GST-03 (Remove Bulk Add):** no schema; `bulkAddGuests` unshared and deleted; grep → zero hits;
  clean build.
- **Still open (human gate):** two UI walks are RPC/DB-verified but not yet UI-verified — **GST-08**
  (public song box renders under meal / on the forced-open buffet row; couple **sees** the song in
  `RsvpSubmissionsPanel`) and **GST-09** (a live **public-form** gated submit flips the person-lines;
  the responses panel shows no apply/promote button). Plus the standing Dom Soft stack + LAND-01 /
  LAND-01a visual checkpoint — now including the **rebuilt Guests page**. See §13 / §15.

Sections changed from v29: header, **§1**, **§3** (guest-rework principles), **§4** (anon surface #2,
the auto-populate boundary redraw, guest tables), **§5** (0053–0058), **§6** (Guests page rebuild),
**§7** (v30 guest arc), **§9** (guest-tool audit note), **§10** (Guests page design), **§11**,
**§12**, **§13**, **§14**, **§15**.

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
registry with public share + guest claims, in-app AI assistant, seating builder), a planner CRM
(contracts, lead pipeline, proposals → accepted agreement → printable contract, project access +
couple/collaborator invitations, archive finished weddings, an account-level Vendor library, an
authorable Calendar, and a cross-project Contracts archive with reusable contract templates), Stripe
billing for both audiences, marketing `/` + `/pricing`, and a public, shareable wedding website with a
5-template photo-led gallery, **adaptive meal- and song-aware gated RSVP intake** (household lookup →
per-attendee meal + optional song), and a registry sub-page.

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
- @dnd-kit (`core`, `sortable`, `utilities`) — lead pipeline kanban only. Seating uses its own SVG
  pointer drag plus click-to-place / click-empty-to-move / arrow nudge — **not** @dnd-kit (see §7).
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
  (`partner_1|partner_2`, 0056 — a genuinely closed 2-value structural token)**. Remaining gap: the
  four vendor/file/template category columns — §13.
- **Billing source of truth = the webhook-updated `subscriptions` row.**
- **Self-contained snapshot for public surfaces.** Public-rendered content stores its displayed data
  on its own row — never joins live into private tables.
- **Service-role key is server-only and rare.** ONLY the Stripe webhook + billing/admin path.
- **Anon READ = one published-only RLS policy + the anon key.** New columns on an anon-readable row
  (e.g. `wedding_websites.song_requests_enabled`, 0057) are auto-readable **riders** — NOT new anon
  surfaces, no policy change.
- **Anon WRITE = tightly-scoped INSERT-only RLS (or a definer RPC) + server-derived scope.** Public
  writes are RSVP (`submit_rsvp` RPC) and registry claims (INSERT). **There are exactly SIX anon
  surfaces** (three reads + one INSERT + two RPC executes) — see §4. **v30 adds NO anon surfaces**
  (the guest rework rides existing surfaces: `submit_rsvp`'s badge write is a definer-internal
  `guests` UPDATE, not a new anon grant; `song_requests_enabled` is a rider on the existing published
  read; `rsvp_attendees.song_request` is written only through the definer RPC).
- **Discrete writes over client-authoritative state.** Every mutation writes by id +
  `revalidatePath`. `useOptimistic` is the sanctioned in-pattern fallback.
- **Keep public/reusable UI pure via prop injection.** `components/website/` imports NO Supabase/auth/
  server-only modules. **The partner-side derive (`lib/partner-sides.ts`) is read at the call site and
  passed as props — never imported into `components/website/`.**
- **Structural enforcement beats action enforcement when it's cheap.** Exemplars: BUD-02's composite
  FK; ONB-00's `already_bootstrapped` guard; 0028's partial unique index; 0029's
  `projects_account_id_immutable` trigger; 0030's `(project_id, vendor_id)` unique index; 0031/0045's
  composite FKs; 0051/0052's `budget_payments`/`payment_schedule` composite FKs; **`guest_members
  (project_id, guest_id) → guests` ON DELETE CASCADE (0006).** Contrast seating occupancy, which
  remains action-enforced.
- **Structural enforcement can only act on a SHARED KEY. Say so out loud when it can't.**
- **A dedicated action owns an integrity obligation.** Don't extend a generic `update<Thing>(id,
  fields)` writer with a field that carries a constraint the generic writer doesn't understand.
  Exemplars: `setSeatingTableKind`, `setBudgetItemProjectVendor`, `removeProjectVendor`,
  `set_project_archived`, `addBudgetPayment`/`removeBudgetPayment`, `addScheduleInstallment`/
  `removeScheduleInstallment`, `addBudgetItemsBulk`. **v30: the guest writers validate their own
  canonical values — `addGuest` / `updateGuestMember` reject a `relationship` outside
  `lib/guest-relationships.ts` and a `relationship_side` outside the CHECK; `updateRsvp` and (now)
  `submit_rsvp` both write `guests.rsvp_status` (see the dual-writer note below).**
- **One terminal routing decision point per audience (ONB-00).** `/projects` is the ONLY place
  allowed to make a terminal routing decision for a personal or account-less account.
- **Two fields that can disagree are a bug waiting to happen; derive one from the other (ONB-01).**
- **A missing RLS policy on a writable table is a SILENT NO-OP that returns success, not an error.**
  Every time a new class of user gains READ access to a table, audit every WRITE policy on that table.
  **This audit (WRITE-01) is still outstanding for every project-scoped table other than `projects` —
  including `guests`, `guest_members`, `rsvp_attendees`, `budget_payments`, `payment_schedule`** — see
  §13 and the WRITE-01 note in §15.
- **One concept must have ONE stored vocabulary, enforced at the write path.** v30 corollary: the
  **relationship picklist (`lib/guest-relationships.ts`)** is a STANDALONE UI+writer constant —
  deliberately NOT imported from / wired to `VENDOR_CATEGORIES`, carries NO DB CHECK, and is enforced
  by the guest writers (`isGuestRelationship`). A convenience picklist is not a vocabulary and must
  never be "unified" with the vendor-category ids. (Same posture as `budget-quick-categories.ts`.)
- **Resolve display vocabulary AT THE CALL SITE, not inside the consuming lib.** v30 exemplar:
  **`relationship_side` stores a stable token (`partner_1`/`partner_2`); the display label is derived
  at render** via `lib/partner-sides.ts` (profile names → `projects.name` split → generic Partner 1/2).
  Names change; a stored name string goes stale — the token doesn't. This is why "derive from the
  couple's names" is architecturally right, not merely cosmetic, and why **Bride/Groom was rejected**
  (hardcoded gendered labels break for same-sex couples and never surface in a hetero fixture).
- **Free-text-at-rest can still be a SET at read, but ONE parser owns the split.**
  (`timeline_events.owner`; `lib/timeline-owners.ts`.)
- **Website photos live as public URLs in `content` jsonb, not as `files` rows.**
- **A value with a canonical vocabulary or derivation must be enforced at the WRITE BOUNDARY, on EVERY
  writer. Where the app's column is DELIBERATELY free-text, matching that is CORRECT, not a gap** —
  `budget_items.category`, `timeline_events.owner`/`section`, and **`guest_members` free-text fields
  (`dietary_note`, `rsvp_attendees.song_request`)** are authored free on purpose; do NOT harden to
  enums.
- **Operational views are active-scoped; repository views span archived.** Dashboard aggregates,
  sidebar, Active count, Calendar overlay filter to `archived_at is null`. The Contracts archive
  (CON-01) deliberately does NOT.
- **Paid is derived ONLY from the `budget_payments` ledger; never from `actual_amount`.** (v29 budget
  dual-source guardrail — unchanged.)
- **Installment coverage is DERIVED AT READ via the waterfall, not stored.** (v29 — unchanged.)
- **The budget "paid so far" headline and Needs-attention panel are GLOBAL; per-card filters never
  rewrite them.** (v29 — unchanged.)
- **Additive-then-destructive for column reinterpretation / supersession.** (v29 exemplars:
  `actual_amount` reinterpreted, `budget_items.due_date` write-dead then dropped later.) **v30
  exemplars: `rsvp_access_mode` kept and read-dead after gated-only (0054, drop candidate 0059+);
  `guests.meal_choice` and `guests.party_size` doubly inert after the flatten (drop in MEAL-03a /
  0059+).**
- **NEW (v30) — a gated (token-bound) RSVP write to a KNOWN guest is NOT the forbidden auto-match.**
  The standing rule "no auto-matching of open RSVPs to guests" exists because an **open** submission
  arrives with no guaranteed identity, so matching it is a *guess*. GST-04 made every submission
  gated: the household token resolves to `matched_guest_id` **deterministically**. Writing a
  token-identified submission to its resolved household (setting `guests.rsvp_status`) is a direct
  write to a known identity, not a guess — the rule's precondition (unidentified submissions) no longer
  exists on this path. This is why GST-04 (gated-only) was the hard prerequisite for GST-09
  (auto-populate). **The still-forbidden thing is name-string fuzzy matching** — matching submitted
  attendee *names* to specific `guest_members` rows. GST-09 is **household-badge only (Option A)** and
  deliberately does NOT do this; per-member `attending` is left to the manual path / a future
  member-ID-carrying gated form (model B), not a fuzzy reconcile.
- **NEW (v30) — one authoritative badge column, two legitimate writers, latest-wins.**
  `guests.rsvp_status` is written by BOTH `updateRsvp` (manual dropdown — off-platform / phone / paper
  entry) AND `submit_rsvp` (on-platform gated auto-populate, 0058). This is NOT a dual-source trap:
  it's ONE column with two entry paths, newest answer wins (a household that changes its mind should
  override an older value, whichever path set it). The person-line displays this badge as the
  authoritative status (GST-06); `guest_members.attending` is a **secondary/inert** manual field, not
  the shown status.

**Soft stack design don'ts (Tier 1 chrome — see §10 / `.cursor/design.mdc`):**
- No raised-inside-raised stacking.
- No Tier 1 accent floods (`--accent-wash` for pills/washes only).
- No Cormorant or Great Vibes outside Tier 3 (and the run-sheet print-header carve-out).
- No ad-hoc radius utilities — use `--radius-card` / `--radius-inner` / `--radius-pill`.
- No florals, photographic ornament, gold/metal gradients, decorative shadows on Tier 1 / Tier 2.
- Do not import Tier 1 Soft stack tokens as website colour; websites read `--ws-*` only.

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
  including `project_vendors`, `files`, `budget_items`, `budget_payments`, `payment_schedule`, **and
  `guests` / `guest_members` / `rsvp_attendees`** — see §13.
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
  household/intake identity, often one person's name), `email` (nullable — **UI-deprecated by GST-07,
  column kept inert**), `phone` (nullable — surfaced in place of email), **`address` (nullable, 0056 —
  household mailing address)**, `household` (nullable label), `party_size` int default 1
  (**doubly inert after the flatten — drop in MEAL-03a / 0059+**), `rsvp_status` text NOT NULL default
  `pending` CHECK `pending|attending|declined` (**the badge — the authoritative shown status; written
  by `updateRsvp` AND `submit_rsvp`**), `meal_choice` (nullable, **inert — drop in MEAL-03a**), `notes`,
  `created_at`, `rsvp_token` NOT NULL default `encode(gen_random_bytes(16),'hex')` (the per-household
  gated-lookup token).
- **`guest_members` (0040 + 0056)** — the **person / display line**. `id`, `project_id`, `guest_id`
  (composite FK `(project_id, guest_id) → guests` ON DELETE CASCADE), `name` (nullable — the person's
  display name), `meal_option_id` (nullable FK → `meal_options` ON DELETE SET NULL), `dietary_note`
  (nullable free-text), `attending` bool NOT NULL default true (**secondary/inert manual field — NOT
  the shown status; the badge is**), **`relationship_side` text nullable CHECK `partner_1|partner_2`
  (0056 — stable token, label derived at render)**, **`relationship` text nullable (0056 — curated
  picklist value, NO DB CHECK, writer-guarded)**, `sort_order` int default 0, `created_at`.
- **`rsvp_attendees` (0039 + 0057)** — per-attendee rows attached to an RSVP **submission** (not a
  guest). `id`, `project_id`, `submission_id` FK, `meal_option_id` (nullable), `name`, `dietary_note`,
  **`song_request` text nullable (0057 — persisted only when the event toggle is on)**, `sort_order`,
  `created_at`. No `attending` flag (that lives on `guest_members`).
- **`rsvp_submissions`** — one row per submission; `matched_guest_id` (the token-resolved household),
  `name`, `response`, `party_size`, `email`, `message`. Written only by `submit_rsvp`.

> **Backfill discipline (GST-06 / 0055):** every household must have ≥1 `guest_members` row, or a
> members-only display drops it. Three Dom & Jordyn legacy households had zero members (all
> `party_size 1`); 0055 backfilled one member each (`name = full_name`, `attending` derived from the
> badge). New guests from `addGuest` already get ≥1 member, so only legacy rows needed it.

### `set_project_archived` + `projects.archived_at` (0044 / ARCH-01)

Unchanged. Sole writer `set_project_archived(uuid, boolean)` — SECURITY DEFINER,
`can_manage_project_access`-gated.

### The six public (anon) surfaces (UNCHANGED count in v30)

1. **Read:** `wedding_websites` anon `SELECT using (published = true)` (0022). Riders:
   `external_registry_links` (0035), `meal_service_style` (0038), `rsvp_access_mode` (0041 —
   **now read-dead**), **`song_requests_enabled` (0057)**.
2. **Write (RPC):** `submit_rsvp(...)` — definer, anon execute (0039; extended 0041; **gated-only
   0054** — always household-token-bound, no open branch; **song handling 0057**; **auto-populates
   `guests.rsvp_status` in-transaction, 0058** — a definer-internal `guests` UPDATE, NOT a new anon
   grant).
3. **Read:** `registry_items` anon `SELECT` gated to a published site (0035).
4. **Write:** `registry_claims` anon `INSERT` gated to published sites (0036).
5. **Read:** `meal_options` anon `SELECT` gated to a published site (0038).
6. **Read (RPC):** `lookup_rsvp_household(...)` — definer, anon execute (0041; full-name in 0043).
   **Unchanged by the guest rework** (still surfaces all household members together — the "add
   together, RSVP together" grouping the flat display preserves).

`rsvp_attendees` / `guest_members` / `guests` / `rsvp_submissions` / `project_invitations` /
`calendar_events` / `contract_templates` / `budget_payments` / `payment_schedule` have NO anon policy.
Storage carve-out (0042 `website-media` public SELECT) is recorded, not counted.

> **Anon grant sharp edge (recorded, RLS-blocked):** GST-09 Step 0 found the table-level GRANT on
> `guests` includes `UPDATE` to the anon role, but RLS (`can_access_project` only) blocks any *direct*
> anon UPDATE — the definer `submit_rsvp` is the sole anon-reachable badge writer. Safe today (RLS is
> the enforcer per §3), but the broad grant is belt-and-suspenders-blocked rather than absent; note it
> if anyone ever loosens the `guests` policy. Fold into WRITE-01.

---

## 5. Migrations (source of truth: `supabase/migrations/`)

Applied in order. **You are the source of truth on the next number — next free is 0059.**

> **How migrations are applied here (READ THIS BEFORE SUGGESTING ANY CLI COMMAND):** by hand-pasting
> each file into the Supabase SQL editor and running it once, in order. There is NO CLI
> migration-history tracker. **`supabase db push` is FORBIDDEN.** `supabase db query --linked` for
> READS is sanctioned.

> **A migration paste must return clean. Any error means NOTHING applied.** After every migration,
> confirm with `to_regclass` / `to_regprocedure` / `pg_policies` / `pg_indexes` before running any
> checkpoint. A file on disk is NOT an applied migration. (This bit us in the v29 cycle when a
> `payment_schedule` insert threw PGRST205 because 0052 hadn't been pasted; same lesson holds.)

> **Write migrations to be re-runnable.** `create or replace` for functions; `drop … if exists`
> before every `create policy` / `create trigger`; `create … if not exists` for indexes;
> `drop constraint if exists` before `add constraint`; guard backfills so a re-paste is a no-op.

- 0001–0047 as recorded in v28/v29 (core tenancy → contract_templates).
- 0048 budget_label_optional · 0049 budget_alert_dismissals · 0050 registry_teardown
- 0051 budget_payments (BUD-03) · 0052 payment_schedule (BUD-SCHED-01)
- **0053 files_vendor_link** (drift-discovered — see note) · **0054 rsvp_gated_only (GST-04)**
- **0055 guest_members_backfill (GST-06)** · **0056 guest_member_relationship (GST-07)**
- **0057 song_requests (GST-08)** · **0058 rsvp_autopopulate (GST-09)**

(For DDL/introspection notes on 0026–0052, see v27/v28/v29. New in v30 below.)

### 0053 files_vendor_link — factual-completeness note (authored OUTSIDE this session)

Discovered on disk during **GST-04 Step 0**, already applied, absent from the v29 §5 list (same class
as the v29-discovered 0048–0050). Recorded here for factual completeness (the legitimate use of a
Cursor code scan — existence/numbering, not prose). Its full *why* was NOT reconstructed this session:

- **0053 `files_vendor_link`** — links a `files` row to a vendor (a `vendor_id` column and/or FK on
  `files`). **Flag:** reconstruct the intent from the migration file before relying on file↔vendor
  internals. (Do not confuse with CON-01a's `files.category`, 0046 — that is the vendor-*category*
  string, a different axis.)

### 0054 rsvp_gated_only (GST-04) — APPLIED LIVE + verified

`submit_rsvp` create-or-replace: always requires a household token (no open/anonymous branch);
resolves the token to `matched_guest_id`; `lookup_rsvp_household` untouched. Column hygiene: default
flipped `open`→`gated`, existing `open` rows backfilled — `rsvp_access_mode` now fully read-dead (drop
candidate 0059+; CHECK left intact for a clean later drop). The RPC body also carries the meal-service
plated/non-plated logic and the attendee loop (the base later extended by 0057/0058). Trailing hygiene:

```sql
alter table wedding_websites alter column rsvp_access_mode set default 'gated';
update wedding_websites set rsvp_access_mode = 'gated' where rsvp_access_mode = 'open';
```

**Kill-shot (verified):** no-token `submit_rsvp` → `household_required` (incl. former-open site);
token-bound submit → succeeds. Post-backfill `select distinct rsvp_access_mode` → `gated` only.

### 0055 guest_members_backfill (GST-06) — APPLIED LIVE + verified

Data-only, idempotent. For every `guests` row with zero `guest_members`, insert ONE member:
`name = guests.full_name`, `sort_order 0`, `attending` derived from the household badge
(`attending`→true, else false). Guarded with `NOT EXISTS` so a re-paste is a no-op. No column changes.

```sql
insert into guest_members (project_id, guest_id, name, sort_order, attending)
select g.project_id, g.id, g.full_name, 0,
       case when g.rsvp_status = 'attending' then true else false end
from guests g
where not exists (
  select 1 from guest_members m
  where m.project_id = g.project_id and m.guest_id = g.id
);
```

**Verified:** Dom & Jordyn members 19→22, zero-member households 3→0; re-paste held at 22. **Kill-shot:**
Joe Cig (badge `attending`, 0 members) reappears as an attending line.

### 0056 guest_member_relationship (GST-07) — APPLIED LIVE + verified

Additive, re-runnable. Household mailing address + per-person relationship token & value.

```sql
alter table guests add column if not exists address text;

alter table guest_members add column if not exists relationship_side text;
alter table guest_members drop constraint if exists guest_members_relationship_side_check;
alter table guest_members add constraint guest_members_relationship_side_check
  check (relationship_side is null or relationship_side in ('partner_1','partner_2'));

alter table guest_members add column if not exists relationship text;  -- picklist value, NO DB CHECK
```

`relationship` is writer-guarded via `lib/guest-relationships.ts` (`isGuestRelationship`), NOT a DB
CHECK — editable later without a migration. `relationship_side` is the stable token; the display label
resolves at render via `lib/partner-sides.ts`. **Verified:** columns + CHECK live; derive resolves
`"Dom & Jordyn 2027"` → Dom / Jordyn (trailing year stripped), no-`wedding_profile` planner projects
resolve named sides without crashing, unsplittable name → Partner 1/2, `"Neighbor"` rejected.

### 0057 song_requests (GST-08 / 4b) — APPLIED LIVE + verified

Additive; rides the existing `wedding_websites` anon read (new column is a rider) and the existing
`rsvp_attendees` insert path (written only through the definer RPC).

```sql
alter table wedding_websites
  add column if not exists song_requests_enabled boolean not null default false;

alter table rsvp_attendees add column if not exists song_request text;
```

`submit_rsvp` create-or-replace (preserving 0054): reads `song_requests_enabled`; in the attendee loop
pulls `song_request` from the attendee jsonb and **persists it only when the toggle is on** (server
ignores a client-sent song when off — same posture as never persisting a client meal id when not
plated); the non-plated continue guard now keeps a row when **name OR dietary OR song_request** is
present (so a song-only buffet row survives). **Kill-shot (verified):** toggle OFF + client song →
stored NULL; toggle ON → persists; buffet song-only row survives.

### 0058 rsvp_autopopulate (GST-09 / #10) — APPLIED LIVE + verified

`submit_rsvp` create-or-replace, **preserving ALL 0057 behavior**, adding ONLY a same-transaction badge
write after `matched_guest_id` and the response are validated:

```sql
update guests
set rsvp_status = case when p_response = 'yes' then 'attending' else 'declined' end
where id = v_matched_guest_id;
```

No new column, no policy change, **no new anon surface** (definer-internal write; anon has no direct
`guests` write path that passes RLS). Dead review/apply code removed in the app layer
(`promoteSubmissionOntoGuest` / `applyMatchedSubmission` / `matchSubmissionToGuest` / `unmatchSubmission`
/ `hintGuestMatch` + `MatchControl`) — their only callers were the submissions panel, and their
zero-member insert branch is moot post-0055. **Kill-shot (verified):** a `pending` household submitting
YES → `attending` with no manual apply, a different untouched pending household stays `pending`; NO →
`declined`; yes-then-no → `declined` (latest wins).

### Column reference (v30 additions; earlier entries unchanged)

**`guests` (0006 + 0056):** `full_name` (household identity); `email` (**inert, UI-deprecated**);
`phone` (surfaced); **`address` (0056)**; `party_size` (**doubly inert — drop 0059+**); `rsvp_status`
(CHECK; badge; two writers); `meal_choice` (**inert — drop MEAL-03a**); `rsvp_token`.

**`guest_members` (0040 + 0056):** `name` (person display); `meal_option_id`; `dietary_note`;
`attending` (**secondary/inert, not shown status**); **`relationship_side` (CHECK `partner_1|partner_2`,
0056)**; **`relationship` (picklist, no CHECK, 0056)**; `sort_order`.

**`rsvp_attendees` (0039 + 0057):** `meal_option_id`; `name`; `dietary_note`; **`song_request` (0057)**;
`sort_order`.

**`wedding_websites` (… + 0057):** existing public-config record + riders; **`song_requests_enabled`
boolean default false (0057)**; `rsvp_access_mode` (**read-dead, 0054 — drop 0059+**).

**No-migration slices to date (append v30):** DASH-01; CON-01; budget row polish; BUD-FILTER-01;
BUD-QUICKADD-01/02; BUD-NOTES-01; **GST-03 (Remove Bulk Add)**. (Earlier list carries forward.)

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
(`plannerOnly`). Tabs: Overview / Checklist / Budget / Vendors / Day-of timeline / **Guests** /
Registry / Notes / Seating / Website editor / Contracts, plus **Access (planner-only)**.

#### Guests tab (v30 — reworked)

`guests/page.tsx` (server read: `guest_members` joined to their `guests` parent, plus `meal_options`
and the RSVP submissions for the responses record) → the flat person-line list. Actions in
`guests/actions.ts`: `addGuest`, `updateGuest`, `updateGuestMember`, `removeGuest`, `updateRsvp`.
`lib/guest-relationships.ts` (picklist constant + `isGuestRelationship` guard) and `lib/partner-sides.ts`
(partner-label derive) support the relationship fields. **`bulkAddGuests` deleted (GST-03).** The
review/apply/match actions are **removed** (GST-09).

- **Display grain — ONE line per person** (`guest_members.name`), flat. No nested expand-to-see-members
  panel. Each line shows a **household cue** (which people RSVP together) — a grouping affordance, not a
  nested row. Person name comes from `guest_members.name`; household identity/token from `guests`.
- **Fields per line:** relationship + partner-side (resolved label, editable inline via
  `updateGuestMember`); phone + address surfaced at the household level (email is gone from the form and
  row — column inert-kept). Meal option + dietary stay inline per person.
- **RSVP control:** a **dropdown** (pending / attending / declined) writing `guests.rsvp_status` via
  `updateRsvp` — the manual / off-platform entry path. The badge is the authoritative **shown** status
  (auto-populated on gated submit by `submit_rsvp`, 0058).
- **No Headcount** (#7 removed): `guestDisplayHeadcount` and its column are gone, as is the
  "Invited: up to {party_size}" sub-line.
- **Summary band:** People = member count; attending / declined / pending = people counted by their
  household badge. **Known softness:** a 4-person `attending` household counts 4 attending people, so
  multi-person households overcount slightly vs a true per-member tally — consistent with the "RSVP
  together" model, dissolved only by a future per-member status model (B).
- **Add Guest form:** additional-name inputs use **"Guest 2", "Guest 3"…** placeholders (#1); collects
  household **address** + **phone** (no email); each person (primary + additional) gets Relationship-to
  (the two resolved partner labels) + Relationship (picklist). Single Add only — Bulk Add removed.

#### RSVP responses panel (v30 — record, not inbox)

`RsvpSubmissionsPanel` is now a **record** of what guests submitted (per-attendee meal / dietary /
**song**), relabelled away from "inbox / pending review." There is **no apply / promote / match button**
— a gated submission auto-populates the household badge on submit (GST-09). The manual RSVP dropdown on
each guest line remains for off-platform entries.

#### Public gated RSVP intake (v30)

`/w/[slug]/rsvp` renders the **gated** intake only (household lookup → the form). Per the meal service
style: **plated** → per-attendee rows (name → meal → dietary), with a **song box under meal** when
`song_requests_enabled`; **buffet/family/stations** → optional per-attendee rows (name + dietary),
**forced open** when songs are on so the song box has a home; **`style=none`** → household block, no
attendee rows and therefore **no song UI** (see the dead-toggle softness in §13). `submit_rsvp` writes
the submission + attendees, persists songs only when the toggle is on, and sets the household badge.

### Account-scoped planner surfaces

`/leads`, `/account/billing`, `/vendors` (VND-08/08a), `/calendar` (CAL-01), `/contracts`
(CON-01/01a/02). Unchanged from v28/v29.

### Public surfaces (no auth, outside `(app)`)

`app/w/[slug]`, `/w/[slug]/rsvp`, `/w/[slug]/registry`, `/invite/[token]`. Marketing `/` + `/pricing`.
Marketing copy must not lead with "AI."

---

## 7. Features built

Pattern: a folder under the relevant scope with `page.tsx` (server read) + `actions.ts` (`'use server'`
writes by id + `revalidatePath`); RLS authorizes.

**The full per-slice build narratives for v1–v29 are preserved in the prior bibles and carry forward
unchanged** (unified shell, onboarding→plan, assistant, contracts, leads, proposals, billing, website
builder, RSVP, seating, Soft stack, landing, invites, vendors, registry, meals, the full budget arc,
etc.). The v30 guest rework is below in full.

### v30 — Guests-page rework (all ten planner-review findings)

Sequenced deliberately: cheap deletions and the gated-only prerequisite first, then the flatten (the
grain change), then the couple-side field batch on the flat shape, then the RSVP capstone.
**GST-05-RECON** (a no-change reconnaissance pass) sat between GST-04 and GST-06 to dump the real
`guests` / `guest_members` column layout and row reality; its findings (person name on
`guest_members.name`; household identity on `guests.full_name`; 3 zero-member households, all
`party_size 1`) shaped GST-06/07 and are recorded in §4 / §5.

#### GST-03 — Remove Bulk Add. NO SCHEMA.

Household-era mass-entry UI removed ahead of the flatten. Step 0 confirmed `bulkAddGuests` was
**unshared** (only caller: `AddGuestForms`; no tests / import flow / assistant tool). Removed the Bulk
Add card + handler + transition state from `AddGuestForms.tsx`; deleted `bulkAddGuests` from
`actions.ts`; single Add Guest left intact (dropped its 2-col grid wrapper — a minor layout change to
watch in the visual pass). Grep for `bulkAddGuests` / "Bulk add" → zero hits; clean build.

#### GST-04 — RSVP is gated-only. Migration **0054**.

The prerequisite for auto-populate: every submission becomes identity-bound. Step 0 found
`rsvp_access_mode` `text NOT NULL default 'open' CHECK ('open','gated')`, dev values open×2/gated×2, and
`submit_rsvp` accepting a null token in the open branch; **0 orphaned submissions** (both live rows
already matched). `submit_rsvp` create-or-replace: always requires a household token (open branch
removed); `lookup_rsvp_household` untouched. UI: the Open/Gated toggle removed (`setRsvpAccessMode` +
plumbing deleted), fixed "Guest list only" copy, public form always gated intake, QR always shown when
published. Column hygiene (added after the initial ship, folded into 0054): default flipped
`open`→`gated`, existing rows backfilled — the column is now **read-dead** (drop candidate 0059+).

**Kill-shot:** no-token `submit_rsvp` → `household_required`; token-bound submit → succeeds.

#### GST-06 — Flatten to one line per person. Migration **0055**.

Display-grain flatten (NOT destructive): household stays as intake + token + address + RSVP-grouping;
`guest_members` becomes the display line. Step 0 (GST-05-RECON) confirmed the 3 zero-member households
are all `party_size 1` (safe unambiguous backfill — one person each, no name-splitting judgment).
0055 backfills one member per zero-member household (`name = full_name`, `attending` derived from the
badge). Page read becomes person-grain (`guest_members` joined to `guests`); UI renders one flat row
per person with a household cue; the nested members panel is gone; **Headcount removed** (#7 —
`guestDisplayHeadcount` + column dropped). Summary band reworked to People (member count) +
badge-based respondent counts. Seating/assistant still read `guests` as households (their own grain —
unaffected).

**Kill-shot:** Joe Cig (attending household, 0 members) reappears as an attending line — would have
vanished from a members-only list without the backfill. Backfill counts: 19→22, 3→0, re-paste 22.

#### GST-07 — Couple-side guest fields. Migration **0056**.

The field batch on the flat person-line: household **address** (#2, `guests.address`); **phone-over-
email** (#3 — UI swap; both columns pre-existed; email inert-kept, not dropped); per-person
**relationship_side** (#4 — stable `partner_1`/`partner_2` token, label derived at render, **NOT
Bride/Groom**) + **relationship** (#4 — curated picklist `Family / Friend / Wedding Party / Family
Friend / Coworker`, standalone constant, writer-guarded, no DB CHECK); **Guest 2/3 placeholders** (#1);
**RSVP dropdown** (#6, pill → select). Step 0: couple names live on `projects.name` (no partner-name
columns on `wedding_profile`); all three test projects split cleanly on `&`; generic Partner 1/2 covers
non-split names. New libs: `lib/guest-relationships.ts`, `lib/partner-sides.ts` (derive chain: profile
names → `projects.name` split → generic). Writers validate relationship against the constant.

**Fail-designed checks (verified):** a no-`wedding_profile` planner project renders a sensible
relationship-to control (project-name split or generic) — no empty/crash; the side label resolves to a
real partner name, not "Bride/Groom"; `"Neighbor"` rejected. **Softness:** the year-strip in
`partner-sides.ts` is a trailing-4-digit heuristic; an oddly-named project ("Dom & Jordyn's Big Day")
splits imperfectly, backstopped by the generic fallback.

#### GST-08 (4b) — Song requests. Migration **0057**.

Event-level toggle (decided: event-level, like meal service style) on
`wedding_websites.song_requests_enabled`; per-attendee song text on `rsvp_attendees.song_request`. Step 0
confirmed a whole-row anon read (new column auto-readable, no policy change) and mapped the public-form
grain (plated → per-attendee rows; buffet-like → optional attendee rows behind a toggle; `style=none` →
household block, no attendee rows) and the couple-side view (`RsvpSubmissionsPanel` → `AttendeeList`).
`submit_rsvp` create-or-replace: reads the toggle, persists song **only when on** (server ignores a
client song when off), and keeps a non-plated row when **name OR dietary OR song** is present. UI: a
"Song requests" checkbox beside meal service style (`MealConfigCard` → `setSongRequestsEnabled`); the
public form shows a song box under meal (plated) / on the forced-open attendee row (buffet); the couple
view shows `Song: …` beside meal/dietary. **Placement choice:** `style=none` gets **no song UI** (no
attendee grain; no invented household field).

**Kill-shot:** toggle OFF + client song → stored NULL (server-gated, not just UI); toggle ON →
persists; buffet song-only row survives the continue guard.

#### GST-09 (#10) — Auto-populate the RSVP badge. Migration **0058**.

Gated submit writes the household badge in the same transaction — no review inbox. **Legal because**
GST-04 made every submission token-bound: `matched_guest_id` resolves deterministically, so writing it
to that known household is a direct write, not the forbidden open guess-match (§3). **Option A —
household-badge only:** `submit_rsvp` (preserving all 0057 behavior) sets
`guests.rsvp_status = attending|declined` after match+response validation. **No per-member name fuzzy
matching**, no `guest_members.attending` write (that fuzzy match is the very thing the "no auto-match"
rule guards; per-member precision is deferred to a member-ID-carrying gated form, model B). The reported
bug ("removed from pending but Attending/Declined didn't update") is fixed at the source: the person-line
already shows the badge (GST-06), so moving the badge moves the display. Dead review/apply/match code
removed (only callers were the panel; zero-member branch moot post-0055). Panel relabelled "RSVP
responses." The manual dropdown (`updateRsvp`) stays — **one badge column, two writers, latest-wins.**

**Kill-shot:** a `pending` household submitting YES → `attending` with no manual apply, while a
different untouched pending household stays `pending` (caused by the submit, not ambient); NO →
`declined`; yes-then-no → `declined`.

> **Deliberately not built this cycle:** per-member `attending` reconcile from submitted attendee names
> (model B) — it reintroduces name-string fuzzy matching one grain down. If ever wanted, the honest
> implementation is a gated RSVP form that carries each `guest_members.id`, so the write is by ID, not
> by name guess.

---

## 8. Onboarding → AI starting plan

Unchanged from v29. 3-step wizard captures `wedding_profile` + `wedding_date` + `total_budget`;
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
> entities.** Surfaces WITHOUT assistant coverage include leads, proposals, invitations, seating, the
> calendar, contract templates, the account vendor library, the budget ledger / payment schedule, and
> **the guest-rework RSVP surfaces (gated intake, songs, auto-populate) shipped no assistant tools.**
> Website has a narrow write (`set_website_travel`). The assistant has no vendor-removal tool and
> should not get one.

> **Assistant write-tool canonical audit.** Enforced-canonical: `add_task`, `update_task_status`,
> `update_guest_rsvp`, `add_vendor_target`, `set_website_travel`. Free-text-by-design (correct, not a
> gap): `add_budget_item` category, `add_timeline_event(s)` owner/section, note/guest text, website
> schedule text.
> **v30 audit events:**
> - **`update_guest_rsvp` now shares `guests.rsvp_status` with `submit_rsvp` (0058).** One column, two
>   authenticated/anon-definer writers, latest-wins — NOT a dual-source trap (see §3). The assistant
>   tool remains a legitimate manual writer; no change needed.
> - **⚠️ VERIFY: the assistant's guest-add path predates the rework and was NOT in any v30 slice's
>   scope.** GST-07 Step 0 referenced an `assistant add_guest` as a caller of the (now UI-deprecated)
>   email field. If such a tool exists, it still writes the OLD shape (email; no `address`,
>   `relationship_side`, `relationship`) and is now out of sync with the couple-side form. Not broken
>   (all new columns are nullable), but **re-run this audit and update/retire the tool before relying
>   on assistant-created guests carrying the new fields.**
> **Re-run this audit when any new write tool ships.**

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
| **1 — App chrome** | `app/(app)/`, most of `components/`, planner, forms, seating canvas, assistant, settings, Access, `/vendors` / `/calendar` / `/contracts`, the Budget page, **the reworked Guests page** | Soft stack palette + Figtree; two depth levels; three radii; **no** accent flood; **no** Cormorant/Great Vibes |
| **2 — Emotional** | Landing, onboarding hero/welcome, empty-state heroes, `/invite/[token]` | Same palette + Figtree; larger display scale; **exactly one** deep field `--deep` per surface |
| **3 — Website + print** | `components/website/`, public `/w/[slug]` (**incl. the gated RSVP + song intake**), `RunSheetDocument.tsx` print header, the contract print document | `--ws-*` colour + Cormorant + (Romance) Great Vibes + Hanken |

**Serif / script location rule:** Cormorant Garamond and Great Vibes may appear **only** in
`components/website/`, the run-sheet print header, and the contract print document.

**Status-colour meaning:** sage = settled/done/booked/signed/rsvp-yes/under-or-on budget; clay = in
flight; rosewood = wrong/overdue/over-plan/declined/rsvp-no/over budget; well/muted = neutral.
**Kind is never encoded in a status colour.**

> **rosewood is also the DESTRUCTIVE-ACTION colour** (muted at rest, rosewood on hover/focus).

**Guests page (v30 — Tier 1, no new design language):**
- **Flat person-lines** with a light **household cue** (grouping affordance, not a nested row) — reuses
  the shared collapse/group vocabulary, does not fork a new one.
- **RSVP status = the household badge**, shown via a dropdown control (pending/attending/declined). The
  badge carries the sage/clay/rosewood status meaning; the manual dropdown is the control, the
  auto-populate (submit) is the on-platform path.
- **Relationship + partner-side** are neutral inline fields (not status colours). Phone + address are
  neutral household-level figures.
- **No Headcount numeral.** Summary band is a plain People/attending/declined/pending readout.
- The **RSVP responses panel** is a record surface (meal/dietary/song), not a queue — no apply affordance.

**Collapse pattern:** DASH-01 per-wedding cards, VND-08a category groups, the budget quick-add menu and
category cards, and **the Guests household cue** share ONE chevron/expand affordance — do not fork.

**Date formatting (LAND-01a):** public/couple-identifying long wedding dates → shared
`formatWeddingDate`, locale `en-US`. All-day calendar placement, the wedding countdown, budget
due-dates/installments **and any guest/RSVP date** derive by **local date** (no tz off-by-one; strict
`<` for past-due).

### Open design items

| Item | Status |
|---|---|
| Legacy CSS aliases (`--plum`, `--stone`, …) | **Open** — temporary; no new alias consumers |
| `design/reference.html` regenerate | **Open** |
| `design/theme-direction.html` delete | **Open** |
| Font-load scoping | **Open** |
| **Dom live Soft stack + LAND-01 visual checkpoint — incl. the Budget page AND the reworked Guests page** | **Open** — the standing human gate |
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
recon pass that changes nothing (GST-05-RECON) is worth a whole slot** — author the migration from real
column/row facts, not remembered shape.

**Design the checkpoint to fail.** Ask: *what would this checkpoint look like if the fix silently
didn't work?* If the answer is "the same," it's decoration. **v30 exemplars:** GST-04
no-token-→-rejected AND token-→-succeeds; GST-06 **Joe-Cig-must-reappear** (a zero-member household
vanishes from a members-only list without the backfill); GST-07 no-`wedding_profile`-project-renders-
sensibly AND side-resolves-to-a-real-name-not-Bride/Groom; GST-08 toggle-OFF-stores-NULL-even-when-
client-sends-a-song; GST-09 **submitted-household-flips-while-a-neighbour-stays-pending** (proves the
move is caused by the submit, not ambient).

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
   **(v30: the 0055 backfill was proven by counting 19→22 / 3→0 / re-paste 22, not by eyeballing.)**
9. Raw Postgres/PostgREST error objects rendered in the UI mean the write is FAILING, not succeeding.
10. **A "next-free" migration number from Cursor is a claim to verify, not a fact — 0053 drift (like
    0048–0050) surfaced during GST-04 Step 0. Grep `supabase/migrations/` before trusting a number.**

**Documentation discipline:** the bible is written from the reasoning in the working session, not a code
scan. A code scan reliably catches **factual drift** (migration numbers, file paths, existence) — use it
for that, as a findings list, not as bible prose. It cannot reconstruct *why*. **Cursor does NOT author
the bible.** **Section-level diffs over full regenerations** once past a consolidation (v30 is a
consolidation — the guest rework is large enough to warrant one; return to section diffs after).

**Drift watchlist (append v30):**
- Reintroducing an **open** RSVP path (gated-only is the invariant; `submit_rsvp` must require a token).
- Writing `guest_members.attending` from submitted attendee **names** (fuzzy match — the forbidden
  auto-match one grain down; GST-09 is badge-only by design).
- Treating `guest_members.attending` as the **shown** RSVP status (the badge is; `attending` is inert).
- Wiring `lib/guest-relationships.ts` to `VENDOR_CATEGORIES` or adding a DB CHECK to
  `guest_members.relationship` (writer-guarded free-text picklist).
- **Storing** a partner-side display name instead of the `partner_1`/`partner_2` token (resolve at
  render).
- Hardcoding **Bride/Groom** for the relationship-to control (derive from the couple's names).
- Persisting a client-sent **song** when the event toggle is off (server gates it).
- Dropping `guests.meal_choice` / `guests.party_size` / `rsvp_access_mode` before their planned
  supersession migration (0059+).
- Reintroducing a review/apply/match "inbox" step (gated submit auto-populates).
- (All prior watchlist items from v29/v28/v27 carry forward — Paid=ledger-only, no per-installment
  stored status, budget filter never rewrites the headline, etc.)

---

## 12. Compliance & security notes

- **Stripe:** webhook verifies raw-body signature; service-role only in webhook (+ billing/admin);
  entitlement read only from the `subscriptions` row. **Stripe Tax NOT set up.**
- **Public website / registry / meal-options / song-toggle read:** anon `SELECT` gated to a published
  site (the song toggle is a rider on the existing published read — no new surface).
- **Public RSVP write:** `submit_rsvp` RPC only; **gated-only (0054)** — every submission is
  household-token-bound, no open path; `project_id` server-derived; honeypot + soft throttle;
  **auto-populates `guests.rsvp_status` in-transaction (0058) via the definer function** (anon has no
  direct `guests` write that passes RLS). **Collects guest PII** (names, songs, dietary) → privacy
  policy.
- **Anon grant sharp edge:** the table GRANT on `guests` includes UPDATE to anon, but RLS
  (`can_access_project`) blocks any direct anon write — the definer RPC is the only anon-reachable
  badge writer. Safe (RLS is the enforcer), but fold into WRITE-01 and don't loosen the `guests` policy.
- **Public registry claim:** anon INSERT gated to published sites; honeypot + throttle.
- **Invitations:** raw tokens 32 random bytes base64url, stored only as sha256 hex; acceptance bound to
  `auth.email()`; expiry 14 days; revocation immediate. Pending-invite cookie httpOnly, `sameSite:
  lax`, secure in prod, 30-min, consumed once, set in middleware (INV-08).
- **Guest gated-lookup token:** `guests.rsvp_token` (16 random bytes hex); `lookup_rsvp_household`
  definer/anon-execute surfaces a household's members by token; `submit_rsvp` re-resolves the token
  server-side (never trusts a client guest id).
- **Archive / Calendar / contract templates / Contracts downloads / Budget ledger + schedule:** as
  recorded in v28/v29 — account- or project-scoped, authenticated, no anon policy, no service-role path;
  signed URLs (60s) for private-bucket downloads.
- **Gmail OAuth:** `gmail.send` sensitive scope → needs verification. Testing mode caps apply.
- **Signup:** `auth.signUp` only; no tenant created at signup.
- **Production infra:** prod belongs in a **separate Supabase org on Pro**. Fresh prod project,
  migrations **0001–0058** applied by hand once each in order (NEVER `db push`), storage buckets
  (`project-files` + `website-media`) + policies recreated, real SMTP, prod domain in auth redirect
  URLs. See the Launch Prep Runbook.
- Set Anthropic + Google Cloud + Stripe + Supabase billing/spend alerts.

---

## 13. Known caveats / things to verify

**Closed by earlier versions (v10–v29):** the full budget arc (BUD-02/03, filter, quick-add, notes,
payment schedule + waterfall); 0026 introspection; ONB-00/ONB-01; invitation RLS asymmetry; vendor
category vocabularies; no vendor removal; booked-slot independence; multi-owner run sheets; dance floor;
registry; meals + per-household gated RSVP; website photos + sections; collaborator invites; planner
create; pricing/marketing; archive; invite cookie; account Vendor library; calendar; contracts archive
+ templates. Full detail in v27/v28/v29 §13.

**Closed by v30:**
- **All ten Guests-page findings shipped (GST-03…09).** Bulk Add removed; RSVP gated-only; flat
  one-line-per-person over a preserved household tier; household address; phone-over-email; per-person
  relationship + derived partner-side; Guest 2/3 placeholders; RSVP dropdown; event-level song requests;
  gated submit auto-populates the household badge with the review/apply inbox retired. All
  RPC/DB-verified live; two UI walks remain (below).

**Open — v30 (deliberate deferrals + gaps):**
- **`rsvp_access_mode` read-dead (0054), not dropped.** Default flipped to `gated`; drop candidate 0059+.
- **`guests.meal_choice` AND `guests.party_size` doubly inert after the flatten.** Both drop in
  **MEAL-03a / 0059+** (party_size joins the drop list — its last display use, Headcount, is gone).
- **`guests.email` inert (UI-deprecated by GST-07), kept.** Not dropped — email may still matter for
  invites; a later destructive migration if ever wanted.
- **Per-member RSVP status (model B) deferred.** GST-09 is household-badge only; per-person `attending`
  from submissions needs a member-ID-carrying gated form, not a name fuzzy match. Until then the summary
  band counts people by household badge (multi-person households overcount slightly — consistent, not a
  bug).
- **Song `style=none` dead-toggle.** With no attendee grain, the song toggle is live but has no surface
  — a couple can turn songs on and get nothing. Not a bug (nowhere to put it); fix if confusing =
  disable the toggle when `style=none`. Leave for now.
- **Anon UPDATE grant on `guests`** — RLS-blocked; fold into WRITE-01.
- **Partner-side derive heuristic** — `partner-sides.ts` strips a trailing 4-digit year and splits on
  `&`/`and`; an oddly-named project splits imperfectly, backstopped by generic Partner 1/2.
- **Assistant guest-add path not updated** (§9) — predates the rework; verify/retire before relying on
  assistant-created guests carrying the new fields.
- **`guest_members.relationship` free-text + the relationship picklist** — deliberate; do not enum, do
  not wire to `VENDOR_CATEGORIES`.
- **0053 `files_vendor_link` rationale uncaptured** — recorded factually in §5; reconstruct before
  relying on file↔vendor internals. **0050 `registry_teardown`** rationale likewise still uncaptured.

**Open — v29 budget (carried forward):** `budget_items.due_date` write-dead (drop 0059+ after parity);
reconciled payment schedule (model b) deferred; budget dashboard overhaul deferred (mockup-first);
`budget_payments`/`payment_schedule` ride `can_access_project` (viewer sharp edge); `budget_items.category`
free-text + quick-add list deliberate.

**Open — v28 (carried forward):** CON-03 deferred; CAL-01a deferred; contract category axis vendor-only;
`{{amount}}` no project source; `files.category` inherits the existing write gate; four NO-CHECK category
columns (ONB-02's decision).

**Open — security / schema (carried forward + v30):**
- **`viewer` can write on every project-scoped table except `projects` and the WRITE-01 exemplars.**
  `project_vendors`, `tasks`, `budget_items`, `budget_payments`, `payment_schedule`, **`guests`,
  `guest_members`, `rsvp_attendees`**, `notes`, `timeline_events`, `seating_*`, `files` still gate
  writes on `can_access_project`, which a `viewer` passes. Unreached today (Access issues only
  `{couple, collaborator}`). **WRITE-01 before any `viewer` invite** — now explicitly including the
  guest writers (`addGuest`, `updateGuest`, `updateGuestMember`, `updateRsvp`, `removeGuest`).
- **`projects` has NO DELETE policy** (silent-no-op shape, unreached).
- **Four category columns have NO CHECK** — ONB-02 (0059+). (`budget_items.category` and
  `guest_members.relationship` stay free-text — NOT in that CHECK set.)
- **`guest_members.attending` default true, inert as shown status** — the badge is authoritative.
- **`website-media` public SELECT has no published gate** — intentional.
- **`project_invitations.invited_by` / `accepted_by` have no FK to `auth.users`** — cosmetic.
- **`tasks.phase` free-text; `budget_items.category` / `timeline_events.owner`/`section` free-text** —
  deliberate; do not enum.

**Open — Soft stack / design (the standing human gate):** Dom live Soft stack + LAND-01/01a visual
checkpoint across couple tabs (**incl. the reworked Guests page and the Budget page**), planner
dashboard/leads/billing/Access, `/vendors` / `/calendar` / `/contracts`, landing, `/pricing`, login,
`/invite/[token]`, `/w/[slug]` date hydration; budget dashboard overhaul mockup; Tier 1 date locale
policy; stale `reference.html`; `theme-direction.html` to delete; legacy CSS aliases; font-load scoping.

**Open — v30 UI walks (RPC/DB-verified, not yet UI-verified):**
- **GST-08:** public song box renders under meal (plated) / on the forced-open buffet row; the couple
  **sees** the song in `RsvpSubmissionsPanel` (a collected-but-invisible song is a dead feature).
- **GST-09:** a live **public-form** gated submit flips the person-lines; the responses panel shows no
  apply/promote button. (The RPC checkpoint proved the write; the public-form round trip proves the path
  the couple's guests actually use.)
- **GST-03:** single Add Guest still inserts + appears after the Bulk Add removal (and its 2-col-wrapper
  drop reads right in the Soft stack).

**Dev DB state (baseline — re-introspect before relying on rows):**
- `dominicciccaglione@gmail.com` — **personal**, "Dom & Jordyn 2027", wedding 2027-02-13. 12 guest
  households, now every household has ≥1 member (22 members total after the 0055 backfill; the 3 legacy
  zero-member rows — Gino, Joe Cig, Steffen — now have member lines). Song toggle left ON for UI check.
- `d.ciccaglione1@gmail.com` — **business**, "Events by Jordyn". Planner projects include Mila & Griffin
  (planner-created, no `wedding_profile`, 2027-02-15, $40,000, 0 members — must remain), Matt & Courtney
  (2027-06-13), and Bryce & Emma (no date set — 2 guest households, the budget/guest test project; song
  toggle left ON for UI check).
- `d.ciccaglione@icloud.com` — **orphaned auth user, 0 memberships** (invited-couple fixture).
> Toggle song requests OFF on both test projects after the GST-08 UI check.

---

## 14. Roadmap

**Done (v1–v29):** unified shell + routing; timeline; couple onboarding → AI plan; AI assistant;
Contracts; lead pipeline; proposals → printable contract; Stripe billing; website builder + 5-template
gallery; public RSVP; seating through SEAT-11; Soft stack chrome; landing overhaul; planner invites
(INV-01…08); vendor category/status/removal + booked slots + packages; dance floor; gift registry; meals
+ per-household gated RSVP; photo-led website; archive; **planner workspace expansion (DASH-01,
VND-08/08a, CAL-01, CON-01/01a/02)**; **the full budget money-tracking arc (BUD-03 / 0051, filter,
quick-add, notes, BUD-SCHED-01 / 0052)**. Migrations **0001–0052** (+ 0053 `files_vendor_link`,
drift-discovered).

**Done (v30 — Guests-page rework):**
- **GST-03** — No schema. Remove Bulk Add.
- **GST-04** — **0054.** RSVP gated-only; `rsvp_access_mode` read-dead.
- **GST-06** — **0055.** Flatten to one line per person; Headcount removed; zero-member backfill.
- **GST-07** — **0056.** Address; phone-over-email; per-person relationship + derived partner-side;
  Guest 2/3 placeholders; RSVP dropdown.
- **GST-08 (4b)** — **0057.** Event-level song requests.
- **GST-09 (#10)** — **0058.** Gated submit auto-populates the household badge; inbox retired.

Current through **0058**; next-free **0059** (the deferred trio — MEAL-03a incl. `party_size`, ONB-02,
`budget_items.due_date` drop — plus the `rsvp_access_mode` drop candidate all take 0059+).

**In progress:** Dom Soft stack + LAND-01 live visual checkpoint (human) — incl. `/vendors`,
`/calendar`, `/contracts`, the Budget page, and the reworked Guests page; plus the two v30 UI walks.

**Remaining couple side:** moodboard; optional seating depth (per-seat / SEAT-07);
**MEAL-03a (0059+, drops `meal_choice` + `party_size`)**; **ONB-02 (0059+)**;
**`budget_items.due_date` drop (0059+, after parity)**; **`rsvp_access_mode` drop (0059+)**; optional
website-media orphan GC; budget dashboard overhaul (mockup-first); optional reconciled payment schedule
(model b); **optional per-member RSVP status (guest model B — member-ID-carrying gated form)**.

**Remaining planner side:** invoicing accepted proposals; deeper CRM; INV-06 (email delivery);
`viewer` invite (after WRITE-01); PRICE-02 (Stripe Prices + checkout); CAL-01a (task-due calendar
overlay); CON-03 (real PDF).

**Phase 4 — bridge:** lead→project conversion. **Re-audit every write policy when this ships.**

**Phase 5 — automation:** PROACTIVE assistant.

**Decided (append v30):**
- **RSVP is gated-only; there is no open/anonymous submission path.** `rsvp_access_mode` read-dead.
- **A gated (token-bound) submit auto-populates `guests.rsvp_status` in-transaction** — legal because
  identity is deterministic, distinct from the forbidden open guess-match.
- **Guest model B (per-member RSVP status) is NOT built** — Option A (household badge only), no
  attendee-name fuzzy matching.
- **The guest list is flat display over a preserved two-tier model** — household stays as intake +
  token + address + RSVP grouping; `guest_members` is the display line and per-person field home.
- **Relationship-to is derived from the couple's names (`partner_1`/`partner_2` token, label at render),
  NOT Bride/Groom.** Relationship is a writer-guarded standalone picklist, no DB CHECK, not wired to
  `VENDOR_CATEGORIES`.
- **Song requests are event-level** (a `wedding_websites` toggle), stored per-attendee on
  `rsvp_attendees`, server-gated when off.
- **One badge column, two writers (`updateRsvp` manual + `submit_rsvp` auto), latest-wins** — not a
  dual-source trap.
- (All prior "Decided" items from v29/v28/v27 carry forward.)

---

## 15. Start here next (pick-up point)

The couple product is feature-complete, shareable, and payable — the Budget page is fully built (v29)
and the **Guests page is now reworked** (flat one-line-per-person over a preserved household tier,
gated-only auto-populating RSVP, per-person relationship + derived partner-side, household address,
phone-over-email, event-level song requests, no Headcount, no Bulk Add). The planner product has a CRM +
collaborator invites + wedding archive + account Vendor library + authorable Calendar + cross-project
Contracts archive with templates. Plan is **couples-first launch**. Bible at **v30**. Schema through
**0058**; next-free **0059**.

**Do not** resume a Modern romantic / VND-01 layout pass; **do not** reintroduce category eyebrows /
`PACKAGE` label; **do not** store a registry claim counter; **do not** add anon SELECT on
`registry_claims` / `rsvp_attendees` / `guest_members` / `guests` / `rsvp_submissions` /
`budget_payments` / `payment_schedule`; **do not** restore an open/anonymous RSVP path or an anon INSERT
on `rsvp_submissions`; **do not** drop `guests.meal_choice` / `guests.party_size` until MEAL-03a; **do
not** drop `budget_items.due_date` or `rsvp_access_mode` until parity (0059+); **do not** auto-match RSVP
attendee names to `guest_members` (fuzzy match — guest model B is a gated member-ID form, not a name
guess); **do not** treat `guest_members.attending` as the shown RSVP status (the badge is); **do not**
put Supabase imports in `components/website/`; **do not** import `lib/partner-sides.ts` into
`components/website/`; **do not** wire `lib/guest-relationships.ts` to `VENDOR_CATEGORIES` or CHECK
`guest_members.relationship`; **do not** hardcode Bride/Groom; **do not** persist a client song when the
toggle is off; **do not** add a published gate to `website-media` SELECT; **do not** pull @dnd-kit into
the website editor; **do not** offer `viewer` from Access until WRITE-01; **do not** fork a second
invitation mechanism; **do not** wire PRICE-01 CTAs to invented Stripe Price IDs; **do not** lead
marketing copy with "AI"; **do not** write `archived_at` except via `set_project_archived`; **do not**
let any writer author free-text task phases or unclamped due dates; **do not** harden
`budget_items.category` / `timeline_events.owner`/`section` to enums; **do not** set the pending-invite
cookie from InvitePage render (middleware only); **do not** reintroduce a review/apply RSVP inbox.

**A. Finish the v30 UI walks (yours — RPC-verified, UI-pending).**
- **GST-08:** public song box renders (plated under meal; buffet forced-open row); the couple **sees**
  the song in the responses panel. Then toggle songs OFF on both test projects.
- **GST-09:** a live **public-form** gated submit flips the person-lines; responses panel has no
  apply/promote button.
- **GST-03:** single Add Guest inserts + appears; its layout reads right after the wrapper drop.

**B. Dom Soft stack + LAND-01 / LAND-01a live visual checkpoint (still open).** Walk couple tabs (incl.
the **Guests** and **Budget** pages), planner dashboard/leads/billing/Access, `/vendors`, `/calendar`,
`/contracts`, landing, `/pricing`, login, `/invite/[token]`, `/w/[slug]`. Confirm no hydration mismatch
(countdown + calendar all-day + budget due-dates + any guest/RSVP date share the local-date tz class).
Fix only real regressions.

**C. Invite Jordyn for real** (prefer an INV-07 collaborator invite; confirm
`project_members.role = 'collaborator'` in SQL after accept).

**D. Apply + checkpoint any un-pasted migrations through 0058.** A file on disk is not applied. Without
0054 open submissions still slip through; without 0055 the flat list drops zero-member households;
without 0056 the relationship fields error; without 0057 songs fail; without 0058 the badge doesn't
auto-populate.

**E. MEAL-03a — drop `guests.meal_choice` AND `guests.party_size`. Migration 0059+** (after backfill
verification — both are now inert).

**F. Drop `budget_items.due_date` and `rsvp_access_mode`. Migration 0059+** — only after confirming
parity (schedule installments cover every prior single-date item; RSVP has no read of the mode).

**G. ONB-02 — `commitPlan` atomicity + category CHECKs. Migration 0059+.** Three sequential non-atomic
inserts → a SECURITY DEFINER function. Also owns the category-constraint decision across
`vendor_targets.category`, `vendors.category`, `files.category`, `contract_templates.category`.
(`budget_items.category` and `guest_members.relationship` stay free-text — NOT in this set.)

**H. WRITE-01 — project-scoped write policy audit. BEFORE ANY `viewer` INVITE.** Enumerate every
project-scoped table; decide per table `can_access_project` (read-alike) vs `can_edit_project` (write);
migrate the ones that should change in one pass. Sharp `can_access_project` writes a `viewer` would
pass now include the guest writers (`addGuest`, `updateGuest`, `updateGuestMember`, `updateRsvp`,
`removeGuest`), `budget_payments` / `payment_schedule` writers, `removeProjectVendor`, `deleteTask`,
`setFileCategory`. Also resolve the belt-and-suspenders anon UPDATE grant on `guests`. Collaborators
already pass `can_edit_project`. Re-run after Phase-4.

**I. Budget dashboard overhaul (mockup-first).** Aesthetic; data model complete.

**J. Launch (after ONB-02 + visual QA + the v30 UI walks).** Separate prod Supabase org on Pro +
migrations **0001–0058** (+ 0059 if MEAL-03a / drops shipped) by hand — never `db push` — + storage
buckets + SMTP; Vercel + domain + env; Stripe live + webhook + Portal + Tax; prod Places key; Gmail
testing mode; privacy + ToS; monitoring; **full prod smoke** — real signup, deliberate double-click, a
couple + a collaborator invite round trip, planner New-wedding create, archive/unarchive, a vendor
add/remove + package link cycle, a vendor-library no-link add + guarded delete, a calendar event round
trip incl. all-day + archive-overlay, multi-line budget vendor links, a budget payment log + installment
schedule + waterfall past-due round trip, a seating dance-floor cycle, **a flat guest add (address +
phone + Guest 2 + per-person relationship/side) + a gated household-lookup RSVP with per-attendee meal +
song that auto-populates the badge and shows in the responses panel**, a hero/gallery upload +
five-template render, checklist delete, an assistant-built checklist, a contracts archive filter + signed
download, a template fill + Print/Save-as-PDF, a registry claim.

**K. Planner depth / revenue (post-launch).** Invoicing; INV-06 email; `viewer` invite (after WRITE-01);
PRICE-02; CAL-01a; CON-03; reconciled payment schedule (model b); **guest model B (per-member RSVP
status)**; lead→project conversion (Phase 4 — re-audit write policies).

**L. Seating — remaining (OPTIONAL).** SEAT-07 assistant mock-up; per-member seating.

**M (other rounding-out):** moodboard; assistant tools for leads/proposals/RSVP/seating/invitations/
calendar/templates/budget (re-run the §9 write-tool audit when any ship); **update/retire the assistant
guest-add path for the new fields**; per-seat UI; `projects` DELETE policy decision; website caching;
website-media orphan GC; currency-helper consolidation; the stale `getBudget` double-count; reconstruct
0050 `registry_teardown` + 0053 `files_vendor_link` rationale; regenerate `reference.html` / delete
`theme-direction.html` / retire CSS aliases; font-load scoping; countdown + calendar + budget/guest-date
hydration harden.

**Recommended path:** **v30 UI walks + visual checkpoint + invite Jordyn (A/B/C)** →
**MEAL-03a + due_date/rsvp_access_mode drops (E/F)** → **ONB-02 / 0059 (G)** → **budget dashboard mockup
(I)** → **Launch (J)** → WRITE-01 before `viewer` (H) → invoicing → INV-06 / PRICE-02 / CAL-01a / CON-03
/ reconciled schedule / guest model B → conversion (K) → remaining M.