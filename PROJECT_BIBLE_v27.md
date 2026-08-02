# Wedding Planning SaaS — Project Bible (v27)

Canonical state document. **Supersedes v26.** Drop this into the Project's instructions/knowledge so
any new chat picks up cold. Lives in-repo at `PROJECT_BIBLE_v27.md`. The repo's `.cursor/design.mdc`,
`app/globals.css`, `design/reference.html` (stale — see §10), and `supabase/migrations/` remain the
live source of truth; this summarizes them and the decisions behind them. Current through migration
**0044**; **next-free migration is 0045**.

**v27 records planner wedding archive (ARCH-01 / 01a), pending-invite cookie in middleware
(INV-08), landing audience toggle (LAND-03), checklist delete + due-date/phase write hygiene
(CHK-02 / CHK-03), and Access Has-access = live membership — atop v26 collaborator invites +
pricing:**

| Slice | What | Schema |
|---|---|---|
| **ARCH-01** | `projects.archived_at`; sole writer `set_project_archived` (definer, `can_manage_project_access`); planner dashboard Active/Archived + sidebar filters active only | **0044** |
| **ARCH-01a** | Dashboard child aggregates (Urgent / vendors-needing-action / tasks-due) scoped to active project IDs only | **NONE** |
| **INV-08** | Pending-invite cookie set in `middleware.ts` on `/invite/*` (not Server Component render); closes the Next 16 cookie-write crash | **NONE** |
| **LAND-03** | Couples/Planners audience toggle + unify band under hero; drop How-it-works / audience-split; marketing copy must not lead with "AI" | **NONE** |
| **CHK-02** | Per-task `deleteTask` + row trash (rosewood hover); existing `FOR ALL` RLS; no confirm | **NONE** |
| **CHK-03** | Assistant `add_task`: clamp due date; derive canonical phase; drop model-authored `phase` | **NONE** |
| **INV-02b** | Access "Has access" lists live `project_members` (not surviving accepted invites); remove soft-revokes matching invites | **NONE** |

Everything in v26 that isn't touched by the above carries forward unchanged: INV-07, CREATE-01,
LAND-02, PRICE-01, photo-led website (WEB-*), RSVP-01a, GST-01, meals, registry, Soft stack (C1),
LAND-01, planner CRM, Stripe.

> **Numbering note:** **0044 is archive.** **MEAL-03a (drop `guests.meal_choice`) and ONB-02 take
> next-free at build time (0045+).** Do not `db push`. **Do not offer `viewer` from Access** until
> WRITE-01 — collaborator is deliberately the only non-couple invite role today.
> **Marketing copy policy:** do not promote or lead with "AI"; frame as the app / "automatically" /
> "the assistant."

**Verification status (READ THIS):**
- **0031–0033** remain applied live (as in v23).
- **0034–0043** — apply/checkpoint if not yet live (v24/v25 Dom lists; especially **0040** /
  **0042** / **0043**).
- **0044 (ARCH-01)** — **APPLIED LIVE (added + run).** Spot-check remains: archive a wedding → drops
  from Active list, sidebar, and Urgent/vendor/task aggregates; Unarchive restores. Invitee / couple
  paths still see their project if they have membership.
- **INV-08:** logged-out `/invite/[token]` sets `pending_invite_token` cookie **without** a render
  crash; signup/login still consumes it.
- **LAND-03:** `/` shows Couples/Planners toggle under hero; topbar `/#couples` `/#planners` sync
  the tab; no "AI" / "Soft stack" in marketing copy.
- **CHK-02:** delete a task (incl. done) → `select id from tasks where id = …` returns **zero rows**;
  phase band count drops by one. **(Delete DB-confirmed this cycle by rowcount inference — a fresh
  assistant build produced 40 rows not 55, proving the removed set left the table; the literal
  per-row row-gone query is the on-record checkpoint.)**
- **CHK-03:** assistant-built checklist → every `tasks.phase` is a canonical
  `lib/checklist-phases.ts` string; `due_date < current_date` count is **0**. **VERIFIED (DB):**
  cleared, rebuilt via assistant, group-by all-canonical, zero past dates, one band per phase,
  single ad-hoc "due next Tuesday" derives the correct single phase.
- **INV-02b:** Remove access → member disappears from Has access **and** loses `can_access_project`.
- **Still open (human gate):** Dom Soft stack + LAND-01 / LAND-01a visual checkpoint. See §13.

Sections changed from v26: header, **§1**, **§3** (write-boundary rule), **§4** (archive RPC + Access
membership), **§5** (**0044**), **§6** (dashboard archive, invite middleware, checklist, marketing),
**§7** (v27 slices), **§9** (write-tool audit), **§13**, **§14**, **§15**.

**Companion doc:** a separate **Launch Prep Runbook** exists (ops checklist for going to
production). This bible covers product/architecture state; the runbook covers deployment. Keep both.


---

## 1. What this is

An AI-native wedding-planning SaaS competing with Zola, The Knot, and Aisle Planner, serving BOTH
couples and wedding planners on one platform.

**Core architecture — "unified foundation, two experiences":** one app, one auth, one data model.
A couple is a `personal` account owning exactly ONE project (their wedding); a planner is a
`business` account owning MANY projects (one per client). Not two products — two experiences over
one foundation, differentiated by routing and role-gated tabs. (The "two separate products" approach
was explicitly rejected.)

**As of v18 there is a THIRD class of user: the invited project member** (originally couple-only;
**v26 / INV-07 also issues `collaborator`**). A planner invites by email; the invitee gets a
`project_members` row on ONE project and **no account of their own** — no `accounts` row, no
`account_members` row. They see that project and nothing else in the planner's book — no CRM tabs.
This is the Aisle Planner model and it is what `can_access_project`'s "OR direct project member"
branch was designed for in 0001. **Not** account-level seats / `account_invitations`. See §4.

The app spans: the couple planning product (onboarding → AI plan, checklist, vendors, guests with
per-person meal members + RSVP→guest match + optional household-gated RSVP, budget, notes, files,
day-of timeline, gift registry with public share + guest claims, in-app AI assistant, seating
builder), a planner CRM (contracts, lead pipeline, proposals → accepted agreement → printable
contract, project access / couple + collaborator invitations, **archive finished weddings off the
active book**), Stripe billing for both audiences, marketing `/` + `/pricing` (audience toggle +
capabilities + pricing cards), and a public, shareable wedding website with a 5-template photo-led
gallery (hero / gallery / party media, FAQ, structured travel), adaptive meal-aware RSVP intake
(open or gated), and a registry sub-page.

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
- pgcrypto (`extensions` schema) — `digest()` for invitation token hashing
- @dnd-kit (`core`, `sortable`, `utilities`) — lead pipeline kanban only. Seating uses its own SVG
  pointer drag plus click-to-place / click-empty-to-move / arrow nudge — **not** @dnd-kit (see §7).
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
  `can_access_project(project_id)`. **Pre-project CRM entities (leads, proposals) and billing
  (subscriptions) are ACCOUNT-scoped** via `is_account_member(account_id)` — NO `project_id`, NO
  `can_access_project`. (RSVP submissions, seating, and invitations are project-scoped.)
- **`vendors` is ACCOUNT-scoped; `project_vendors` is the project-scoped LINK.** One vendor row can
  serve many projects in the same account. Every vendor UI action that says "remove" means **remove
  the link**, never the vendor. See §7 VND-05.
- **Resolve the BUSINESS account explicitly** (`accounts.kind = 'business'` inner join), never naive
  first-membership. Couples resolve the `personal` account. Helpers in `lib/billing/resolve-account.ts`.
- **CHECK-constrain status enums.** EXCEPTION: Stripe-owned vocabularies aren't constrained.
  **`project_vendors.status` is constrained (0030, widened in 0031 to include `replied`).** Remaining
  gap: `vendors.category` — see §13.
- **Billing source of truth = the webhook-updated `subscriptions` row.**
- **Self-contained snapshot for public surfaces.** Public-rendered content stores its displayed data
  on its own row — never joins live into private tables.
- **Service-role key is server-only and rare.** ONLY the Stripe webhook + billing/admin path.
- **Anon READ = one published-only RLS policy + the anon key.**
- **Anon WRITE = tightly-scoped INSERT-only RLS (or a definer RPC) + server-derived scope.** Public
  writes are RSVP (`submit_rsvp` RPC) and registry claims (INSERT). **There are exactly SIX anon
  surfaces** (three reads + one INSERT + two RPC executes) — see §4.
- **Discrete writes over client-authoritative state.** Every mutation writes by id +
  `revalidatePath`. `useOptimistic` is the sanctioned in-pattern fallback.
- **Keep public/reusable UI pure via prop injection.** `components/website/` imports NO Supabase/auth/
  server-only modules.
- **Structural enforcement beats action enforcement when it's cheap.** Where a DB constraint can make
  an invalid state unrepresentable, prefer it over an app-code check. Exemplars: BUD-02's composite
  FK; ONB-00's `already_bootstrapped` guard; 0028's partial unique index; 0029's
  `projects_account_id_immutable` trigger; **0030's `(project_id, vendor_id)` unique index**;
  **0031's `(project_id, project_vendor_id)` composite FK on `vendor_targets`** (same column-specific
  `ON DELETE SET NULL` pattern as 0026). Contrast seating occupancy, which remains action-enforced
  because a constraint would have been expensive.
- **NEW (v19) — structural enforcement can only act on a SHARED KEY. Say so out loud when it can't.**
  A unique index stops the same entity being linked twice. It cannot stop two *different* rows that
  describe the same real-world vendor — "Occasions at Laguna Village" (Places, has
  `external_place_id`) and "Ocassions at Laguna" (manual, null place id) share no key and never will.
  Near-duplicates are a **soft, best-effort UI warning** problem, and the cleanup tool is deletion,
  not deduplication. Don't promise a constraint that can't exist.
- **A dedicated action owns an integrity obligation.** Don't extend a generic
  `update<Thing>(id, fields)` writer with a field that carries a constraint the generic writer
  doesn't understand. `setSeatingTableKind`, `rotateSeatingTable`, `setSeatingTableSeatCount`,
  `setBudgetItemProjectVendor`, **`removeProjectVendor`**, **`linkVendorToTarget` /
  `unlinkVendorFromTarget`**, **`set_project_archived`** all exist for this reason.
  **`linkVendorToTarget` is the sole application writer that SETs `vendor_targets.project_vendor_id`
  to a non-null value** (VND-07); unlink / remove only clear it. **`set_project_archived` is the sole
  writer of `projects.archived_at`** (ARCH-01) — no direct app-code UPDATE.
- **One terminal routing decision point per audience (ONB-00).** `/projects` is the ONLY place
  allowed to make a terminal routing decision for a personal or account-less account.
- **Two fields that can disagree are a bug waiting to happen; derive one from the other (ONB-01).**
- **A missing RLS policy on a writable table is a SILENT NO-OP that returns success, not an error
  (v18).** Every time a new class of user gains READ access to a table, audit every WRITE policy on
  that table for whether the new class passes it. **This audit is still outstanding for every
  project-scoped table other than `projects`** — see §13 and the WRITE-01 note in §15.
- **NEW (v19) — one concept must have ONE stored vocabulary, and the write path is where it's
  enforced.** `vendors.category` accumulated **three** vocabularies from two writers plus a sibling
  table: `addDiscoveredVendor` stored the LABEL (`"Venue"`), `addVendor` stored **whatever the user
  typed** in a free-text `<Input placeholder="e.g. florist">`, and `vendor_targets.category` stored
  canonical IDs (`venue`). Read sites diverged to match, so `VendorsToBookSection` called
  `vendorCategoryLabel` and `OutreachShortlistRow` printed the raw string. Fixed in 0030 + VND-05 by
  normalizing to ids at rest and making the form a picker. **The lesson is that a free-text control
  wired to nothing is a vocabulary fork with a UI on it.**
- **NEW (v19) — resolve display vocabulary AT THE CALL SITE, not inside the consuming lib.**
  `generate-outreach-draft.ts` and `vendor-enrichment.ts` take a category as an argument and
  interpolate it into a prompt. They should not know that a canonical id vocabulary exists. VND-05a
  resolves `vendorCategoryLabel(...)` where the value is read from the database, so those libs keep
  receiving human-readable text and their signatures never changed.
- **NEW (v20) — free-text-at-rest can still be a SET at read, but ONE parser owns the split.**
  `timeline_events.owner` stays a free-text column. Comma-separated multi-owner strings are a
  **read-layer** concern: `lib/timeline-owners.ts` is the only place that may parse an owner string.
  Dropdown builders and filter predicates must both call it. Two parsers that can disagree recreate
  the bug. Do not normalize on write; do not invent a join table without a deliberate slice.
- **NEW (v25) — website photos live as public URLs in `content` jsonb, not as `files` rows.**
  Upload goes to the public `website-media` bucket; the couple editor persists the public URL into
  `wedding_websites.content`. Clearing a hero/gallery image clears the URL only — **storage object
  cleanup is deferred** (orphans OK until a later slice). `components/website/` still imports no
  Supabase; upload helpers live under the website tab.
- **NEW (v27) — a value with a canonical vocabulary or derivation must be enforced at the WRITE
  BOUNDARY, on EVERY writer.** Task `phase` (`phaseFromMonthsBefore`), computed task `due_date`
  (floor via `clampDueDateToToday`, `lib/date-months.ts`), status enums, and vendor category all
  have a canonical source. A free-text column, a CHECK-less column, **or a model-supplied
  assistant-tool argument** is NOT a license to author the value. Enforcement may live in the form,
  the server action, or the tool body — but it must exist on *every* path that writes the column,
  not just the form. This fault line opened three times on `tasks` (ONB-01 couple plan → the
  starter-checklist button → the assistant `add_task` tool), each a writer that skipped the canonical
  derivation; all three now route through the shared helpers (`clampDueDateToToday`; phase derived
  from the clamped due date, never authored — same reason `phase` is absent from the onboarding
  generator's JSON shape, §8). Deriving phase from the clamped date also collapses the "phase and
  date can disagree" hazard: one is computed from the other. **Corollary (proven by the v27
  write-tool audit, §9): where the app's column is DELIBERATELY free-text, the assistant matching
  that is CORRECT, not a gap** — `budget_items.category` and `timeline_events.owner`/`section` are
  authored free on purpose; do NOT "harden" them to enums.

**Soft stack design don'ts (Tier 1 chrome — see §10 / `.cursor/design.mdc`):**
- No raised-inside-raised stacking.
- No Tier 1 accent floods (`--accent-wash` for pills/washes only).
- No Cormorant or Great Vibes outside Tier 3 (and the run-sheet print-header carve-out).
- No ad-hoc radius utilities — use `--radius-card` / `--radius-inner` / `--radius-pill`.
- No florals, photographic ornament, gold/metal gradients, decorative (non-hierarchical) shadows
  on Tier 1 / Tier 2. **Tier 3 website photos are product content, not chrome ornament** (WEB-IMG-01).
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
account kind. Any gate that reads only one of those inputs will break the other class. This is why
`plannerOnly` tab filtering resolves from ACCOUNT kind and must never be switched to
`project_members.role` — see §6. **`viewer` exists on the enum but is not issued by Access (INV-07
allowlist); do not offer it until WRITE-01.**

### `project_invitations` (0028; INV-07 uses existing `role`)

- `project_id`, `email`, **`role project_role NOT NULL DEFAULT 'couple'`**, `token_hash` (sha256 hex;
  raw token never stored), `invited_by`, `expires_at`, `accepted_at` / `accepted_by`, `revoked_at`,
  `created_at`
- Partial unique: one live invite per `(project_id, lower(email))`
- Policies: all four gated by `can_manage_project_access` — **unchanged by INV-07**
- **`accept_project_invitation` inserts `project_members.role` from `v_inv.role`** (never hardcodes
  `'couple'`). Existing pending invites without an explicit writer role keep the column default
  `couple`.
- **Sole app writer:** `createProjectInvitation(projectId, email, role)` — server allowlist
  `{couple, collaborator}`; rejects `viewer`. Couple path still passes `couple` explicitly.

### `project_members` (0001)

- `project_id` uuid NOT NULL FK→projects cascade
- `user_id` uuid NOT NULL FK→`auth.users` cascade
- `role` **`project_role` enum NOT NULL default `'couple'`** — values `couple | collaborator | viewer`
- `created_at` timestamptz NOT NULL default now()
- **PK is composite `(project_id, user_id)`. There is no `id` column** — conflict targets and
  deletes use the pair, not an id.
- Policies: SELECT `can_access_project(project_id)` (0001); DELETE
  `can_manage_project_access(project_id)` (0028). NO INSERT policy, NO UPDATE policy —
  `accept_project_invitation` is the only writer.

> **The `project_members` SELECT policy is recursive BY SHAPE ONLY and is SAFE. Do not re-flag it,
> and do not narrow it.** It calls `can_access_project`, which itself reads `project_members`.
> Verified v16: `can_access_project` is SECURITY DEFINER owned by `postgres`, and `postgres` has
> `rolbypassrls = true`; `project_members.relforcerowsecurity = false`. Two independent reasons the
> inner read is not RLS-scoped. Narrowing it to a plain `user_id = auth.uid()` predicate would ALSO
> break INV-02, which needs the planner to see their couple's membership row in order to revoke it.

### Access functions (SECURITY DEFINER, `public`, granted to `authenticated`)

- **`can_access_project(project_id)`** — member of the owning account OR direct project member.
  The READ gate on every project-scoped surface. **Also still the WRITE gate on most project-scoped
  tables, including `project_vendors` — see §13.**
- **`is_account_member(account_id)`** — account-scoped features (leads, proposals, subscriptions),
  project INSERT.
- **`can_manage_project_access(project_id)` (0028)** — `is_account_member` of the project's owning
  account. Gates all four `project_invitations` policies, the `project_members` DELETE policy, **and
  `set_project_archived` (0044)** — archive is owning-account only, not invited members.
- **`can_edit_project(project_id)` (0029)** — `is_account_member` of the owning account **OR** a
  `project_members` row for `auth.uid()` with `role in ('couple','collaborator')`. Gates the
  `projects` UPDATE policy. **`viewer` is deliberately excluded — that is the role's entire purpose.**
  **WRITE-01 exemplars already on this gate (do not weaken):** `registry_items` writes (0034),
  `registry_claims` editor UPDATE/DELETE (0036), `meal_options` writes (0038), `guest_members`
  writes (0040), **`website-media` storage INSERT/UPDATE/DELETE (0042)**. Most other
  project-scoped writes still gate on `can_access_project`, which a `viewer` passes — see §13 /
  WRITE-01.
- `can_read_vendor(vendor_id)`, `bootstrap_account_and_project(...)`.
- `account_members` RLS uses a plain `user_id = auth.uid()` predicate to avoid recursion.

> **`bootstrap_account_and_project` is STILL the ONLY insert path into `accounts` /
> `account_members`.** `accept_project_invitation` deliberately inserts into `project_members` ONLY.
> That is what keeps 0027's `already_bootstrapped` guard airtight (§5).

> **`projects` UPDATE — replaced in 0029.** Now `"editors update projects"` on
> `can_edit_project(id)` in both `using` and `with check`. **`projects` INSERT still gates on
> `is_account_member` and should stay that way.** **`projects` has NO DELETE policy** — same
> silent-no-op shape, currently unreached. Flagged in §13. **Archive does not use the UPDATE
> policy** — it goes through `set_project_archived` only (0044); do not add a direct
> `archived_at` write from app code.

### `projects.archived_at` + `set_project_archived` (0044 / ARCH-01)

- Column: `archived_at timestamptz` nullable. Null = active; non-null = archived (timestamp of first
  archive; re-archive keeps the original via `coalesce`).
- **Sole writer:** `set_project_archived(p_project_id, p_archived)` — `SECURITY DEFINER`, grant
  execute to `authenticated`, revoke from `anon`. Gate = `can_manage_project_access`. Returns the
  resulting `archived_at` (null when unarchived).
- App action: `setProjectArchived` in `app/(app)/dashboard/actions.ts` → RPC + revalidate
  `/dashboard` and layout. **Planner UI only** (Active/Archived toggle on the dashboard wedding
  list). Sidebar and "Active weddings" count filter `.is("archived_at", null)`.
- **Does not delete data.** Invited members keep `project_members` and can still open the project
  by URL; it simply leaves the planner's active book and cross-project aggregates (ARCH-01a).

### The six public (anon) surfaces

1. **Read:** `wedding_websites` has an anon `SELECT` policy `using (published = true)` (0022).
   Columns that ride this surface (no new anon policy): `external_registry_links` (0035),
   `meal_service_style` (0038), **`rsvp_access_mode` (0041)**.
2. **Write (RPC):** `submit_rsvp(...)` — `SECURITY DEFINER`, grant execute to `anon` (0039;
   extended in **0041** with trailing `p_household_token`). Resolves `project_id` / published /
   style / access mode from slug; inserts `rsvp_submissions` + optional `rsvp_attendees`
   atomically. In **gated** mode the token MUST resolve to a `guests` row in that project or the
   RPC RAISES (zero rows). On success gated submits set `matched_guest_id` **only** — no guests-row
   mutation. **Direct anon INSERT on `rsvp_submissions` was dropped in 0039**. NO anon SELECT on
   submissions or attendees.
3. **Read:** `registry_items` has an anon `SELECT` policy gated to a published wedding site (0035).
4. **Write:** `registry_claims` has an anon `INSERT` policy gated to published sites (0036), NO anon
   read/update/delete. Public availability is via `registry_item_availability(project_id)` (aggregate
   only; security definer; published-gated) — not a SELECT on claims.
5. **Read:** `meal_options` has an anon `SELECT` policy gated to a published wedding site (0038).
   Draft options must not leak when unpublished.
6. **Read (RPC):** `lookup_rsvp_household(p_slug, p_token, p_full_name)` — `SECURITY DEFINER`,
   grant execute to `anon` (**0041**; signature/arg renamed in **0043**). Returns only
   `{household_token, party_label, party_size}` (label = `guests.full_name`). Name path =
   **exact match on normalized full name** (strip non-alnum, collapse whitespace, lower; length
   ≥ 2). Token path unchanged. **NO anon SELECT on `guests`.**

`rsvp_attendees` and `guest_members` have **NO anon policy of any kind**. `guests` has **NO anon
policy**. `project_invitations` has NO anon policy. `/invite/[token]` is a public ROUTE that does
not resolve the token before authentication.

> **Storage carve-out (0042 — not counted as a 7th anon table/RPC surface, but record it):** objects
> in the public `website-media` bucket are world-readable **even when the wedding site is
> unpublished**. Knowing or guessing a URL leaks draft photos. Deliberate; contrast with
> published-gated table reads above.

---

## 5. Migrations (source of truth: `supabase/migrations/`)

Applied in order. **You are the source of truth on the next number — next free is 0045.**

> **How migrations are applied here (READ THIS BEFORE SUGGESTING ANY CLI COMMAND):** by hand-pasting
> each file into the Supabase SQL editor and running it once, in order. There is NO CLI
> migration-history tracker. **`supabase db push` is FORBIDDEN.** `supabase db query --linked` for
> READS is sanctioned.

> **A migration paste must return clean. Any error means NOTHING applied.** The Supabase SQL editor
> wraps a multi-statement paste in ONE transaction; a single error rolls back the entire file. At
> 0028 an error was dismissed as benign, nothing committed, and eleven checkpoint blocks then ran
> against an empty schema producing vacuous "passes". After every migration, confirm with
> `to_regclass` / `to_regprocedure` / `pg_policies` / `pg_indexes` before running any checkpoint.

> **Write migrations to be re-runnable.** `create or replace` for functions; `drop … if exists`
> before every `create policy` and `create trigger`; `create … if not exists` for indexes;
> `drop constraint if exists` before `add constraint`. 0030 follows this standard throughout and
> its backfill is idempotent (every canonical id maps to itself).

> **SQL editor gotcha:** the editor renders only the **last** statement's result set, and wide cells
> truncate. Run introspection queries **one at a time**, and coerce long definitions to booleans
> (`… like '%clause%' as flag`) so they cannot clip. **This bit at 0030** — the
> `project_vendors_status_check` definition clipped mid-array and the boolean re-check was never
> reported. See §13.

- 0001 core tenancy (incl. `projects.wedding_date`, `project_members`, `project_role` enum)
  · 0002 checklist (`tasks`) · 0003 write access (`is_account_member`, `bootstrap_account_and_project`)
- 0004 vendors_account · 0005 discovery_and_outreach · 0006 guests · 0007 email_credentials
- 0008 outreach_app_columns · 0009 notes · 0010 budget · 0011 files
- 0012 wedding_profile (incl. **`wedding_profile.onboarded_at`** — see §8) · 0013 vendor_targets
  · 0014 assistant_messages · 0015 timeline_events
- 0016 contract_status · 0017 leads · 0018 proposals · 0019 proposal_acceptance
- 0020 subscriptions · 0021 wedding_websites · 0022 wedding_websites_public_read (anon SELECT)
- 0023 rsvp_submissions (originally anon INSERT; **anon INSERT dropped in 0039** — intake via
  `submit_rsvp` RPC only)
- 0024 seating_tables · 0025 seating_assignments
- 0026 budget_item_project_vendor — `budget_items.project_vendor_id` via composite FK.
  **INTROSPECTION-VERIFIED (v10):**
  ```
  budget_items_project_vendor_fkey   FOREIGN KEY (project_id, project_vendor_id)
                                       REFERENCES project_vendors(project_id, id)
                                       ON DELETE SET NULL (project_vendor_id)
  ```
  **Column-specific, parenthesized, exactly one column named.** A *bare* `ON DELETE SET NULL` on a
  composite FK nulls EVERY referencing column including the NOT NULL `project_id`.
- 0027 bootstrap_idempotency — `already_bootstrapped` guard inside
  `bootstrap_account_and_project`. Deliberately NOT a unique constraint on `account_members.user_id`.
  **INTROSPECTION-VERIFIED.**
- 0028 project_invitations (INV-01) — `project_invitations` table + partial unique index
  `(project_id, lower(email)) where accepted_at is null and revoked_at is null`,
  `can_manage_project_access`, `accept_project_invitation`, `project_members` DELETE policy.
  **FULLY VERIFIED** via an 11-block JWT-simulation harness. Detail in v18 §5.
- 0029 project_member_updates (INV-04) — `can_edit_project`, `"editors update projects"` replacing
  `"members update projects"`, `guard_project_account_id()` + `projects_account_id_immutable`
  trigger. **VERIFIED with the checkpoint-1 caveat recorded in v18.**

### 0030 vendor_category_and_status (VND-04) — APPLIED, VERIFIED (one clipped read, §13)

No new table. Three changes, all on existing objects:

```sql
-- 1. Backfill vendors.category from labels to ids. Mapping covers exactly the
--    13 canonical labels in lib/vendor-categories.ts. Legacy free text from the
--    old manual-add Input is left alone (vendorCategoryLabel falls back to the
--    raw string). Idempotent: re-running maps every id to itself.
update vendors set category = case lower(trim(category))
  when 'venue'          then 'venue'
  when 'caterer'        then 'caterer'
  when 'florist'        then 'florist'
  when 'baker'          then 'baker'
  when 'hair & makeup'  then 'hair-makeup'
  when 'jewelry'        then 'jewelry'
  when 'photographer'   then 'photographer'
  when 'videographer'   then 'videographer'
  when 'dj'             then 'dj'
  when 'band'           then 'band'
  when 'officiant'      then 'officiant'
  when 'planner'        then 'planner'
  when 'rentals'        then 'rentals'
  else category
end
where category is not null;

-- 2. One link per vendor per project.
create unique index if not exists project_vendors_project_vendor_key
  on project_vendors (project_id, vendor_id);

-- 3. Retire the dead 'lead' default and pin the vocabulary.
alter table project_vendors alter column status set default 'to_contact';

alter table project_vendors drop constraint if exists project_vendors_status_check;
alter table project_vendors add constraint project_vendors_status_check
  check (status in ('to_contact','contacted','booked','declined'));
```

**The mapping is exhaustive against `VENDOR_CATEGORIES` as of v19 — all 13 ids.** An earlier draft of
this migration invented `stationery` and `transportation` (which do not exist) and omitted `jewelry`
(which does). It was corrected only because the actual array was read out of
`lib/vendor-categories.ts` and reconciled line by line. **If a category is ever added, this backfill
is historical and does not need updating — but any future backfill must be reconciled the same way.**

**Why the `'lead'` default had to go.** `project_vendors.status` defaulted to `'lead'` since 0001.
Step 0 proved `'lead'` is written by nothing, read by nothing, and present in zero live rows — both
inserts (`addDiscoveredVendor`, `addVendor`) always wrote `'to_contact'` explicitly. Adding the CHECK
without changing the default would have made **every insert that omits `status` fail against the
column's own default.** Default and vocabulary must be reconciled in the same migration.

**Why `'replied'` was NOT in the 0030 CHECK (historical).** At VND-04 time, `VENDOR_PIPELINE_STEPS`
rendered a four-stop pipeline but `replied` was display-only and unstorable. **Closed in 0031 /
VND-06** — the CHECK now includes `replied`, and VND-06a aligns Outreach UI with the stored set.
See §7.

### 0031 vendor_target_link (VND-06) — APPLIED LIVE

No new table. Four changes:

```sql
-- 1. Slot link. Composite FK so a target can only point at a project_vendor
--    in its OWN project. MATCH SIMPLE: null project_vendor_id = empty slot.
alter table vendor_targets
  add column if not exists project_vendor_id uuid;
-- FK (project_id, project_vendor_id) → project_vendors(project_id, id)
-- ON DELETE SET NULL (project_vendor_id)  -- column-specific, same pattern as 0026

-- 2. A linked vendor is only meaningful on a booked slot.
--    Reverse NOT required: booked slot may have no vendor record yet.
check (project_vendor_id is null or status = 'booked');

-- 3. Widen outreach vocabulary. Closes v19 B2 (`replied` was unstorable).
--    'declined' remains an exit, not a pipeline stop.
check (status in ('to_contact','contacted','replied','booked','declined'));

-- 4. User-editable address. NOT from Google Places — manual entry only.
alter table vendors add column if not exists address text;
```

**Originally prompted as 0032** while ONB-02 held 0031; Dom released the reservation so VND-06 took
**0031**. ONB-02 was then reserved on **0032** until BUD-04 took that number (Jul 23), then on
**0033** until SEAT-11 took **0033** (Jul 26), then on **0034** until REG-01…03 took **0034–0036**
(Jul 27), then on **0037** until REG-04 / MEAL took **0037–0040**, then on **0042** until
WEB-IMG-01 took **0042** and RSVP-01a took **0043**. **ARCH-01 took 0044.** **ONB-02 takes
next-free at build time (0045+).** **MEAL-03a (drop `guests.meal_choice`) is intended as 0045+**
after live backfill verification — if ONB-02 needs a number first, bump MEAL-03a and record it here.

### 0032 budget_item_vendor_many (BUD-04) — APPLIED LIVE

No new table. Drops the 0026 partial unique so one `project_vendor` may link to many
`budget_items` (venue package on the money side — mirrors VND-07's many category slots).

```sql
drop index if exists budget_items_project_vendor_uidx;
-- Retained (0026): budget_items_project_vendor_id_idx on (project_vendor_id) — non-unique
```

**INTROSPECTION-VERIFIED (Jul 23):** `budget_items_project_vendor_uidx` absent. Still one vendor per
budget *item* (nullable FK unchanged); many items per vendor is now legal.

### 0033 seating_dancefloor (SEAT-11) — APPLIED LIVE

No new table. Dance floors reuse `seating_tables` as seatless floor-plan elements (not a separate
`seating_floor_elements` table). Two CHECK widenings:

```sql
alter table seating_tables drop constraint if exists seating_tables_kind_check;
alter table seating_tables
  add constraint seating_tables_kind_check
  check (kind in ('standard', 'sweetheart', 'head', 'dancefloor'));

alter table seating_tables drop constraint if exists seating_tables_seat_count_check;
alter table seating_tables
  add constraint seating_tables_seat_count_check
  check (
    (kind = 'dancefloor' and seat_count = 0)
    or (kind <> 'dancefloor' and seat_count between 1 and 20)
  );
```

**Product rules (authoritative — do not regress):**
- `kind = 'dancefloor'` ⇒ `seat_count = 0`, no seat dots, not assignable, not in By-table breakdown.
- Shape at insert is `'rectangle'` (layout size is kind-driven in `tableBodyForElement`, not
  shape-driven). Canvas: larger dashed `--well` rect + `--ring`/`--accent` stroke; label only.
- Place via toolbar **Dance floor** + click-to-place (`addDancefloor`). Move / rotate (45°) / delete
  reuse the table path. Seat-count and kind pickers do not apply (`setSeatingTableSeatCount` /
  `setSeatingTableKind` / `assignGuestToTable` reject dance floors).
- Table labels still count only non-dancefloor rows (`Table N`); dance floors label
  `Dance floor` / `Dance floor N`.
- Design: kind remains form + text only — dashed rect distinguishes dance floor; no status colour.

### 0034 registry_items (REG-01)

Couple-managed gift registry. Table `registry_items`:

| Column | Notes |
|---|---|
| `id` | `uuid` PK `gen_random_uuid()` |
| `project_id` | FK → `projects` cascade |
| `name` | text NOT NULL |
| `price` | `numeric(12,2)` nullable — **display-only; never a budget headline** |
| `image_url` / `buy_url` | text nullable — hotlinked; no uploads in v1 |
| `quantity_wanted` | integer NOT NULL default 1, CHECK `>= 1` |
| `note` | text nullable |
| `created_at` | timestamptz default now() |

RLS: members `SELECT` via `can_access_project`; INSERT/UPDATE/DELETE via **`can_edit_project`**
(deliberate — do not weaken to `can_access_project`; WRITE-01 exemplar for this table). No anon
policy in 0034 — public read arrives in 0035.

### 0035 registry_public (REG-02)

Anon surface #3: `"anon read registry items"` on `registry_items` for `to anon` when the project's
`wedding_websites.published = true`. Adds `wedding_websites.external_registry_links jsonb not null
default '[]'` shaped `[{ "label": "Amazon", "url": "https://…" }]`. Link-outs ride the **existing**
published website read (surface #1) — no new anon policy on `wedding_websites`.

### 0036 registry_claims (REG-03)

Anon surface #4. Table `registry_claims`:

| Column | Notes |
|---|---|
| `registry_item_id` | FK → `registry_items` cascade |
| `quantity` | integer NOT NULL default 1, CHECK `>= 1` |
| `status` | CHECK `reserved \| purchased` (default `reserved`) |
| `claimer_name` | text nullable — **couple-only**; never exposed to anon |

RLS: anon **INSERT only** gated to published sites; members `SELECT` via `can_access_project`;
editors UPDATE/DELETE via `can_edit_project`. **No anon SELECT/UPDATE/DELETE.**

Function `registry_item_availability(p_project_id uuid)` → `(registry_item_id, claimed_qty)` —
`security definer`, published-gated join; grant execute to `anon, authenticated`. Remaining =
`quantity_wanted − claimed_qty` (derived; both reserved and purchased count). No stored counter.

### 0037 registry_legacy_links_backfill (REG-04)

Idempotent data migration: consolidates website-builder legacy `content.registry.links` into
`wedding_websites.external_registry_links`, then clears the legacy array. No new columns / policies.
No new anon surface.

### 0038 meal_options (MEAL-01)

Couple-authored meal choices + catering service style.

- `wedding_websites.meal_service_style text NOT NULL DEFAULT 'none'` with CHECK
  `none | plated | buffet | family_style | stations`. Rides existing published website anon read —
  **zero new anon surfaces** for the column.
- Table `meal_options`: `id`, `project_id` FK→projects cascade, `name` NOT NULL, `description`,
  `is_kids boolean NOT NULL default false`, `sort_order integer NOT NULL default 0`, `created_at`.
- RLS: members SELECT via `can_access_project`; INSERT/UPDATE/DELETE via **`can_edit_project`**
  (WRITE-01 exemplar). Anon SELECT gated to published site (anon surface #5).

### 0039 rsvp_attendees (MEAL-02)

Per-person RSVP grain + atomic public submit.

- Unique indexes `rsvp_submissions_project_id_key` / `meal_options_project_id_key` for composite FKs.
- Table `rsvp_attendees`: `project_id`, `submission_id`, `meal_option_id` nullable, `name`,
  `dietary_note`, `sort_order`, `created_at`. Composite FK → submissions cascade; composite FK →
  meal_options **`ON DELETE SET NULL (meal_option_id)`** (0026 parenthesized form — mandatory).
- RLS: members SELECT via `can_access_project`; editors UPDATE/DELETE via `can_edit_project`.
  **NO anon policy. NO INSERT policy** — only `submit_rsvp` (definer) writes attendees.
- Drops `"rsvp_anon_insert"`; revokes anon INSERT on `rsvp_submissions`.
- Function `submit_rsvp(p_slug, p_name, p_response, p_email, p_message, p_party_size, p_attendees
  jsonb) → uuid`: resolves project from slug (never trusts client project id); plated+options
  requires named attendees with meals and **derives `party_size` from attendee count**; other styles
  clamp `party_size` 1–20 and force `meal_option_id` null. Decline → party_size 1, zero attendees.

### 0040 guest_members (MEAL-03)

Couple-side per-person guest grain + RSVP→guest reconciliation. **Does not drop `guests.meal_choice`.**

- Unique index `guests_project_id_key`.
- Table `guest_members`: `project_id`, `guest_id`, `name`, `meal_option_id`, `dietary_note`,
  `attending boolean NOT NULL default true`, `sort_order`, `created_at`. Composite FKs to guests
  (cascade) and meal_options **`ON DELETE SET NULL (meal_option_id)`**.
- `rsvp_submissions.matched_guest_id` + composite FK → guests **`ON DELETE SET NULL
  (matched_guest_id)`**.
- RLS: members SELECT via `can_access_project`; INSERT/UPDATE/DELETE via **`can_edit_project`**.
  **NO anon policy.**
- Idempotent backfill: guests with non-null `meal_choice` → one `guest_member` with
  `dietary_note = meal_choice`, `name` null, `attending = (rsvp_status = 'attending')`. Does **not**
  map free text to `meal_option_id`. **Match/apply fabricates attending `guest_members` from
  `rsvp_submissions.party_size` when there are no attendee rows and the guest has no members yet**
  (so Guests Attending reflects RSVP'd headcount, not the invite cap).

### 0041 rsvp_household_access (RSVP-01)

Guest-gated RSVP. No new tables.

- `guests.rsvp_token text` unique opaque hex (backfilled for existing rows); regenerate allowed.
- `wedding_websites.rsvp_access_mode text NOT NULL DEFAULT 'open'` CHECK `open | gated`. Rides
  existing published website anon read — no new anon policy for the column.
- Function `lookup_rsvp_household(...)` — anon surface #6; returns token / party_label /
  party_size only. **NO anon SELECT on guests.**
- Rebuilds `submit_rsvp` with trailing `p_household_token`. Open mode ignores it. Gated mode
  requires an in-project token or RAISES (zero submissions). Success sets `matched_guest_id`
  pointer only — never mutates the guests row.

### 0042 website_media (WEB-IMG-01)

Public storage for wedding-site photos (hero; gallery / party reuse the same path).

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'website-media', 'website-media', true, 26214400,
  array['image/png', 'image/jpeg', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;
```

Policies on `storage.objects` for `bucket_id = 'website-media'`:
- **SELECT** to `anon, authenticated` — **no published gate** (recorded carve-out).
- **INSERT / UPDATE / DELETE** to `authenticated` where
  `can_edit_project(((storage.foldername(name))[1])::uuid)` — first path folder = `project_id`.

No table changes. URLs land in `wedding_websites.content` jsonb (`hero.imageUrl`, gallery images,
party `imageUrl`). Client helper: `app/(app)/projects/[projectId]/website/website-media.ts`.
Path shape: `{projectId}/{hero|gallery|party}/{uuid}.{ext}`.

### 0043 rsvp_full_name_lookup (RSVP-01a)

No table changes. Replaces `lookup_rsvp_household` so the name argument is **`p_full_name`**
(was last-name tokenization). Match = equality on normalized full `guests.full_name` (same
normalize: strip non-alnum → space, collapse whitespace, lower; require length ≥ 2). Token branch
unchanged. Still published-site scoped; still returns token / label / party_size; `limit 25`;
grant execute to `anon, authenticated`.

> **Filename note:** on disk the file may be named `0043_rsvp_partial_name_lookup.sql`; the
> behavior and header comment are full-name lookup. Prefer "full-name" in prose.

### 0044 project_archive (ARCH-01)

Adds `projects.archived_at timestamptz` (nullable). Creates `set_project_archived(uuid, boolean)`
→ `timestamptz`: security definer; raises `42501` unless `can_manage_project_access`; sets
`archived_at = coalesce(archived_at, now())` when archiving, `null` when unarchiving; returns the
column value. Grant execute to `authenticated`; revoke from `anon`. **No RLS policy change** —
direct client `UPDATE` of `archived_at` is not the intended path (sole writer = the RPC).

**APPLIED LIVE.** Post-paste confirm (still worth spot-checking):
`to_regprocedure('public.set_project_archived(uuid,boolean)')` and a null→non-null→null round trip
on a throwaway project.

### Column reference

**`projects` (0001 + 0010 + 0044):** `wedding_date` date nullable; `total_budget` numeric(12,2)
nullable; **`archived_at` timestamptz nullable (0044)** — null = on the active book. Archive via
`set_project_archived` only.

**`guests` (0006 + 0040 + 0041 semantics):** `party_size integer NOT NULL default 1` is the **invited cap**
(couple-authored; never derived from members; never overwritten by RSVP match). `meal_choice text`
nullable remains in schema through 0040 but is **inert in app code** (no live reads/writes) —
preserved only for the 0040 backfill and for MEAL-03a drop. Per-person truth is `guest_members`.
`rsvp_status` still lives on the household guest row; match sets it from the submission response.
**`rsvp_token`** (0041) is the opaque household gate key — unique; never anon-selected.

**`tasks` (0002):** `status` CHECK `todo | in_progress | done` default `todo`; `phase` text
**NULLABLE, free-text (NO CHECK)** — canonical order / writers in `lib/checklist-phases.ts`
(`"12+ months" | "9 months" | "6 months" | "3 months" | "1 month" | "week of"`). **Computed due
dates floor through `clampDueDateToToday` (`lib/date-months.ts`)** — sole owner of "no task is
created with a due_date before today." Assistant `add_task` derives phase from clamped due date
(CHK-03); undated ad-hoc tasks get `phase: null` (Other bucket). **Hard delete via `deleteTask`
(CHK-02)** — nothing FKs `tasks.id`.

**`budget_items` (0010 + 0026 + 0032):** `category` text NULLABLE free-text; `planned_amount`
numeric(12,2) NOT NULL default 0; `actual_amount` nullable; `project_vendor_id` uuid nullable
(composite FK). **0032 dropped** `budget_items_project_vendor_uidx` — many lines per vendor allowed.
Non-unique `budget_items_project_vendor_id_idx` retained.

**`vendors` (0004, category normalized in 0030, `address` in 0031):** ACCOUNT-scoped. `account_id`
NOT NULL FK→accounts cascade; `name` NOT NULL; `category` text **NULLABLE, NO CHECK — now stores
canonical `VENDOR_CATEGORIES` ids**; `source` text NOT NULL default `'manual'` (live values:
`manual`, `google_places`); `external_place_id` text nullable; plus `contact_name/email/phone`,
`website`, `service_area`, `notes`, `is_preferred`, `ai_overview`, `last_enriched_at`, **`address`
text nullable (0031 — manual only, never written from Places)**. Unique index
`vendors_account_place_idx` on `(account_id, external_place_id) where external_place_id is not null`
— **this is what prevents re-adding the same DISCOVERED vendor. It cannot see manual rows, whose
`external_place_id` is null.**

**`project_vendors` (0004 + 0026 + 0030 + 0031):** the project-scoped LINK. PK is named `vendors_pkey`
(artifact of the 0004 rename — expected, don't "fix" it). `project_id` NOT NULL, `vendor_id` NOT NULL
FK→`vendors(id)` **ON DELETE CASCADE**, `status` text NOT NULL **default `'to_contact'`, CHECK
`to_contact | contacted | replied | booked | declined` (0031 added `replied`)**, `quoted_price`
numeric nullable, `role` text nullable, `notes` text nullable. Unique `(project_id, id)` (**0026**,
for the composite FK — not 0004) and **unique `(project_id, vendor_id)` (0030)**.

**`vendor_targets` (0013 + 0031 + VND-07 semantics):** project-scoped category slots. `category`
text (still NO CHECK — ONB-02 / **next-free / 0045+** owns that decision); `status` includes booked/needed/skipped
vocabulary used by the UI; **`project_vendor_id` uuid nullable (0031)** with composite FK to
`project_vendors` and CHECK `project_vendor_id is null or status = 'booked'`. **No unique index or
unique constraint on `project_vendor_id`** — one `project_vendor` may own many targets (venue
package). That shared FK **is** the package; there is no junction table (VND-07).

**`timeline_events` (0015):** day-of run sheet. `owner` text **NULLABLE, free-text, NO CHECK**. At
rest it is a string; at read (TL-04) it is a comma-separated SET via `lib/timeline-owners.ts`. Do not
normalize on write.

**`seating_tables` (0024 + 0033):** project-scoped floor-plan elements. `shape` CHECK
`round | square | rectangle`; `kind` CHECK `standard | sweetheart | head | dancefloor` (0033 added
`dancefloor`); `seat_count` CHECK **kind-conditional** — `0` iff dancefloor, else 1–20. Dance floors
are layout markers only (SEAT-11); occupancy / assignment still apply only to seatable kinds.

**FKs pointing AT `project_vendors`** — what a link delete touches:

| From | Constraint | On delete |
|---|---|---|
| `tasks.vendor_id` | `tasks_vendor_id_fkey` | **SET NULL** |
| `budget_items.project_vendor_id` | `budget_items_project_vendor_fkey` | **SET NULL** (column-specific) |
| `vendor_targets.project_vendor_id` | `vendor_targets_project_vendor_fkey` | **SET NULL** (column-specific) |
| `outreach_messages.project_vendor_id` | `outreach_messages_project_vendor_id_fkey` | **CASCADE — hard delete of outreach history** |

The cascade on outreach history is why `removeProjectVendor` requires an explicit confirm that names
it. Before delete, `removeProjectVendor` resets **every** `vendor_targets` row whose
`project_vendor_id` matches (`.eq('project_vendor_id', projectVendorId)`) to
`{ project_vendor_id: null, status: 'needed' }` — required for N-slot packages so the FK's
`ON DELETE SET NULL` cannot leave N booked-empty slots after remove (VND-07 discriminating
checkpoint). See §7.

**Unlink vs remove (VND-07):**
| Action | `project_vendor_id` | Slot `status` | Intent |
|---|---|---|---|
| `unlinkVendorFromTarget` | → null | stays **`booked`** | "Booked · vendor not recorded" empty slot |
| `removeProjectVendor` | → null on all matching | → **`needed`** | Vendor gone; slots return to Still to book |

> **Naming trap:** `project_vendors.vendor_id` → `vendors(id)` and `budget_items.project_vendor_id` →
> `project_vendors(id)` are DIFFERENT things one join apart. Don't "simplify" it.

> **No-migration slices to date:** the 5-template pack; V3-QA-01…06; SEAT-02/03/05/05a/08/09/10;
> CHK-01; SET-01; TL-01/02/03; **TL-04**; BUD-01; BUD-01a; ONB-01; Soft stack chrome pass (v11);
> LAND-01; LAND-01a; INV-03; INV-05; INV-02; **INV-07**; **INV-08**; **INV-02b**; **VND-05; VND-05a; VND-05b; VND-06a;
> VND-07; VND-07a; VND-07b**; **WEB-LAYOUT; WEB-EDITOR; GST-01**; **CREATE-01; LAND-02; LAND-03; PRICE-01**;
> **ARCH-01a; CHK-02; CHK-03**.

**`projects.total_budget`** — numeric(12,2) NULLABLE (0010). **`projects.wedding_date`** — date
NULLABLE (0001). **`projects.archived_at`** — timestamptz NULLABLE (0044).

---

## 6. Shell & routing

Unchanged from v18. One login. `lib/post-login-path.ts` routes by account kind.
- **Planner (business):** `/dashboard`, `PlannerShell` + `PlannerProjectSidebar`.
  Dashboard splits Active vs Archived wedding lists (`DashboardWeddingList`); sidebar and
  Active-weddings count read only `archived_at is null`. Cross-project Urgent / vendors-needing-
  action / tasks-due aggregates filter to **active project IDs only** (ARCH-01a).
- **Couple (personal):** into their project workspace (`CoupleShell`), gated by onboarding.
- **Invited member (no account):** into the invited project via `/projects` (couple **or**
  collaborator — same path; role only affects `can_edit_project` / future WRITE-01 gates).
  Archive does not revoke membership.

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

**`getDirectProjectIds(supabase)` (INV-03)** queries `project_members` **`.eq("user_id", uid)`**
ordered `created_at asc`. **The `user_id` filter is load-bearing** — RLS alone does NOT scope this,
because a planner reading `project_members` legitimately sees their couples' rows. **It must never
throw.**

### `/projects` — the only terminal routing decision point

| account context | direct projects | → |
|---|---|---|
| `null` | 0 | `OnboardingForm` (bootstrap) |
| `null` | 1 | `/projects/{id}` — **no onboarding gate** |
| `null` | >1 | minimal Card list (id, name, wedding_date) |
| `personal` | — | `getCoupleDestinationPath(firstProjectId)` |
| `business` | — | `/dashboard` |

> **`plannerOnly` resolves from ACCOUNT KIND, never from `project_members.role`.** A planner opening
> their own project has no `project_members` row at all. Do not "improve" this.

### Invitation acceptance path (INV-05 + INV-08)

```
/invite/[token]
  middleware (logged-out) → set pending_invite_token cookie   [httpOnly, 30 min]
  authenticated           → acceptProjectInvitation(token)
                            → /projects/{projectId}   or   ?error=<reason>
  unauthenticated         → STATIC generic invite page (Sign up / Log in)
                            (cookie already set by middleware — page does NOT cookies().set)
```

**The route MUST NOT resolve the token before authentication.** `consumePendingInvite` runs at BOTH
auth entry points (`app/auth/callback/route.ts` and `app/login/actions.ts`) because **password login
never passes through `/auth/callback`**. Cookie name/options live in
`lib/invitations/pending-invite-config.ts` (shared by middleware + consume). **INV-08 closed the
Next 16 Server Component cookie-write crash** — do not move the write back into `InvitePage`.

### Shared project workspace

`app/(app)/projects/[projectId]/layout.tsx`: tabs from `lib/project-tabs.ts`, role-gated
(`plannerOnly`). Invalid → `notFound()`. Couple working surfaces use Soft stack vocabulary: progress
/ allocation bands, **raised** cards containing **recessed** rows/wells, sticky context rails,
Figtree display numerals. Canonical two-column split:
`lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]` with `lg:sticky lg:top-6 lg:self-start` rail.

- **Overview** — `WeddingHero` (couple) / `SlimHero` (planner); inline wedding-date editor +
  countdown. The date editor works for invited couples (0029).
- **Checklist** — CHK-01 progress band + two-column body; **CHK-02** per-row delete (hard delete,
  rosewood hover, no confirm). Phase bands use canonical `lib/checklist-phases.ts` labels; null
  phase → **Other** (shown only when non-empty). Computed due dates clamp via `clampDueDateToToday`.
- **Budget** — BUD-01/02/01a + allocation band. **No pie/donut/circular progress.**
- **Vendors** — Gmail mailbox card; **Add vendor form** (manual; VND-05 + **VND-07a** project-wide
  soft dup → connect); Still-to-book target cards; **Booked band** shaped as:
  - **Raised package cards** — one per `project_vendor` with ≥1 linked slot; full wrapping name;
    category **chips** for every linked slot (VND-07b, including count = 1); Unbook / Remove
  - **Raised unslotted cards** — booked vendor with zero linked slots: "Not linked to a category" +
    first-slot link control
  - **Recessed empty-slot wells** — booked target, null `project_vendor_id`: "Booked · vendor not
    recorded"; Connect existing (when any booked vendor exists) + Add new
  Outreach = in-flight only (VND-06a); Declined group; select-all + Draft outreach; shortlist Remove.
- **Day-of timeline** — TL-01/02/03; **TL-04 multi-owner run sheets** (comma SET at read); per-owner
  printable run sheet at `/projects/[projectId]/timeline/run-sheet`.
- **Guests / Registry / Notes / Seating / Website editor / Contracts** — Soft-stacked; Registry is
  couple-visible (not `plannerOnly`) at `/projects/[projectId]/registry`. **Guests** hosts the
  Catering / Meals card (`meal_service_style` + `meal_options`), expandable `guest_members` per
  row (invited cap = `party_size`; responded headcount = attending members when present; **GST-01**
  add-guest collects additional names up front), RSVP inbox with Match-to-guest, project-wide
  caterer meal tally (`lib/caterer-tally.ts`), and **RsvpAccessCard** + per-guest **GuestRsvpQr**
  when a published slug exists. **Website** editor: LookStep (template + palette) + hero photo +
  Gallery / Party / Travel / FAQ authoring; content persists on each edit via `persistContent`
  (slug still requires an explicit Save).
- **Access (planner-only)** — `app/(app)/projects/[projectId]/access/page.tsx` (INV-02 + **INV-07**
  + **INV-02b**). Separate couple vs collaborator invite cards; pending list from live invites;
  **Has access lists live `project_members`** (email from accepted invite when present) — not
  accepted invitation rows that outlive a remove. Revoke / remove unchanged in shape; remove also
  soft-revokes matching invitations and `router.refresh`s. Helper copy: collaborators help **this**
  wedding only — not the planner's book.

**Account-scoped planner surfaces:** `/leads`, `/leads/[leadId]`,
`/leads/[leadId]/proposals/[proposalId]/contract`, `/account/billing`.

**Public surfaces (no auth, outside `(app)`):** `app/w/[slug]` (Tier 3 templates, anon read;
photo-led sections via shared `SectionStack`; adaptive RSVP form driven by `meal_service_style` +
`meal_options` + `rsvp_access_mode`), `app/w/[slug]/rsvp` (QR / gated deep-link landing; forces
RSVP visible even if couple hid it on the main site), `app/w/[slug]/registry` (registry sub-page;
anon read of `registry_items` when published), and `app/invite/[token]` (Tier 2, NO data read).
Marketing landing at `/` → `components/marketing/` (**LAND-03** Couples/Planners audience toggle +
unify band under hero; capabilities panel; **no How-it-works**); **`/pricing`** (PRICE-01).
**Marketing copy must not lead with "AI"** — frame as the app / automatically / the assistant.

---

## 7. Features built

Pattern: a folder under the relevant scope with `page.tsx` (server read) + `actions.ts` (`'use server'`
writes by id + `revalidatePath`); RLS authorizes. v1–v15 features unchanged; see v15/v18 for their
detail. The planner→project invitation feature (INV-01 … INV-05, migrations 0028/0029) plus
**INV-07 (collaborator role on the same mechanism)** is current — including **INV-06 (transactional
email) deliberately NOT built**; planners copy the link and send it themselves. **`viewer` is still
not offered from Access** (WRITE-01 gate).

**Seating occupancy model (authoritative — do not regress):** occupancy = **COUNT of
`seating_assignments` rows** for the table. `assignGuestToTable` upserts `seat_index: null`. A guard
querying `seat_index >= N` is **wrong**. Rotation step is **45°**. Drag/click disambiguation: travel
under ~4px = select; at/over threshold = drag. **Dance floors (`kind = 'dancefloor'`) are not
seatable** — they never contribute occupancy and reject assignment (SEAT-11).

### v22 — Seating dance floor (SEAT-11)

#### SEAT-11 — placeable dance floor on the seating canvas. Migration **0033**.

Floor plans needed a spatial dance-floor marker without inventing a second canvas entity store.
Chose **reuse `seating_tables`** with `kind = 'dancefloor'` and `seat_count = 0` over a new
`seating_floor_elements` table — same move/rotate/delete path, one RLS surface.

**Schema (0033):** see §5. Kind CHECK adds `'dancefloor'`; seat-count CHECK is kind-conditional
(0 iff dancefloor, else 1–20).

**App:** `addDancefloor`; toolbar Dance floor arm + click-to-place; canvas dashed well rect (no
seats); `isDancefloor` / `isSeatableTable` helpers; By-table breakdown + unassigned roster only see
seatable tables; assign / seat-count / kind mutations guard-reject.

**Files:** `0033_seating_dancefloor.sql`, `types.ts`, `seat-layout.ts`, `actions.ts`, `page.tsx`,
`SeatingCanvas.tsx`, `SeatingToolbar.tsx`, `SeatingWorkspace.tsx`, `SeatingSelectedPanel.tsx`,
`SeatingTableBreakdown.tsx` (receives seatable-only list from workspace).

### v23 — Gift registry (REG-01 → REG-03)

#### REG-01 — couple Registry tab + `registry_items`. Migration **0034**.

Couples manage gift items in-app before any public exposure. Tab registered in `lib/project-tabs.ts`
(couple-visible). Server read ordered `created_at asc`; actions `addRegistryItem` /
`updateRegistryItem` / `deleteRegistryItem` write by id + `revalidatePath`. Store label is
**derived at render** via `storeLabelFromUrl` (`lib/registry.ts`) — no store column. Price uses
`lib/format-currency.ts` and must not touch budget aggregates.

#### REG-01a — paste-a-link prefill. NO SCHEMA.

`fetchRegistryItemPreview` (server action) fetches the URL with native `fetch` + `AbortController`
(mirrors vendor-enrichment), parses Open Graph + schema.org Product JSON-LD, returns
`{ name?, imageUrl?, price? }`, never throws. Prefill only — `addRegistryItem` still does the
insert. Failed fetch degrades to manual entry. Hint: boutique/Shopify works best.

#### REG-02 — public registry page + external link-outs. Migration **0035**.

`app/w/[slug]/registry` loads via `createAnonServerClient`; unpublished → `notFound()`. Rendering
lives in `components/website/registry/` (props only; no Supabase imports). Templates accept
`registryHref` / `homeHref` / `pageSlot` so the sub-page **inherits the template hero** (no
duplicate hero). Main `/w/[slug]` gets a Registry nav link. External registries: couple editor on
the Registry tab → `setExternalRegistryLinks` writes `wedding_websites.external_registry_links`
(table write gate remains `can_access_project` — note for WRITE-01).

**Discriminator:** unpublish then reload incognito — items must disappear. A missing anon policy
passes the happy path and still leaks drafts.

#### REG-03 — guest claims. Migration **0036**.

Public `submitRegistryClaim` (`app/w/registry-claim-actions.ts`): anon INSERT; `project_id` derived
from the item row (never client-trusted); honeypot **rejects** (unlike RSVP's silent-ok); soft
throttle mirrors RSVP. Buy click → interstitial Reserve & continue / Just browsing; secondary
"I already bought this" → `purchased`. Availability from `registry_item_availability` RPC;
remaining derived. Couple sees claimer names + flip reserved↔purchased + remove. No anon
reserve→purchase upgrade in v1.

**Privacy discriminator:** anon `select * from registry_claims` must return denied / zero rows.

**Files (registry):** `0034_registry_items.sql`, `0035_registry_public.sql`,
`0036_registry_claims.sql`, `0037_registry_legacy_links_backfill.sql`, `lib/registry.ts`,
`app/(app)/projects/[projectId]/registry/*`, `app/w/[slug]/registry/page.tsx`,
`app/w/registry-claim-actions.ts`, `components/website/registry/*`, template `pageSlot` /
`SiteNav` wiring.

### v24 — RSVP meals + guest members (MEAL-01 → MEAL-03)

#### MEAL-01 — couple meal config. Migration **0038**.

Couples define catering style and entrée options before any guest-facing change. Guests tab
`MealConfigCard`: service-style selector (5 values; `none` = "No meal selection"); meal-options
CRUD (name, description, kids). Style lives on `wedding_websites` — if no website row, show
"set up your wedding website first" and do **not** insert a website. Options are always editable.
Plated + zero options → inline nudge, not an error. No public form change in this slice.

#### MEAL-02 — per-person RSVP + atomic RPC. Migration **0039**.

Public form (`app/w/[slug]/RsvpForm.tsx`) adapts to style:
- `none` / plated-with-zero-options → classic headcount (never block guests on misconfig)
- `plated` + options → per-attendee name + meal select + optional dietary; `party_size` derived
  server-side from attendee count
- `buffet` / `family_style` / `stations` → headcount + optional names/dietary (no meal select;
  RPC forces `meal_option_id` null)

`submitRsvp` keeps honeypot silent-ok + soft throttle; writes only via `.rpc('submit_rsvp', …)`.
`components/website/` stays free of Supabase. Couple inbox lists attendees; project-wide caterer
tally later supersedes submission-local tallies (MEAL-03).

#### MEAL-03 — guest members + RSVP→guest match. Migration **0040**.

`guest_members` is the per-person authored grain (manual CRUD or promoted from a matched
submission). `matchSubmissionToGuest` (couple action only): sets `matched_guest_id`, updates guest
`rsvp_status` from response, copies attendees → members; **idempotent** (already-matched → no
duplicate members). `unmatchSubmission` clears the pointer only — leaves members (couple may have
edited them). Name-similarity hint is offered; **no auto-match**.

**Authoritative catering number:** attending `guest_members` grouped by `meal_option_id`
(`lib/caterer-tally.ts`). `guests.party_size` = invited cap ("Invited: up to N"). Display headcount
= attending members if any, else `party_size`. **Match / `applyMatchedSubmission` creates members
from named attendees, or from submission `party_size` placeholders when attendees are empty**, so
Attending tracks people who RSVP'd yes. Members may exceed the cap (soft note, never block).
Seating stays on `guests.id` — do not seat members in this slice.

**`guests.meal_choice`:** backfilled into `dietary_note`; app code stops reading/writing it.
**Drop is MEAL-03a / 0045+** after live verification — not 0040 (0041 was RSVP-01; 0042–0043
were website media + full-name lookup; **0044 is archive**).

**Files (meals):** `0038_meal_options.sql`, `0039_rsvp_attendees.sql`, `0040_guest_members.sql`,
`app/(app)/projects/[projectId]/guests/{MealConfigCard,GuestRow,guest-member-actions,meal-actions,
meal-types,rsvp-submissions}.*`, `lib/caterer-tally.ts`, `app/w/[slug]/{RsvpForm,actions,page}.tsx`.

### v24 — Guest-gated RSVP (RSVP-01)

#### RSVP-01 — household gate. Migration **0041**.

`guests.rsvp_token` (unique, opaque hex) + `wedding_websites.rsvp_access_mode` (`open` | `gated`,
default `open`). Anon surface #6: `lookup_rsvp_household` returns token/label/cap only (label =
`full_name`). **No anon SELECT on guests.**

`submit_rsvp` gains trailing `p_household_token`. Open mode ignores it. Gated mode requires a
token that resolves in-project or RAISES (zero submissions). Success sets `matched_guest_id`
pointer only — never mutates the guests row (promotion stays couple-only).

Public form: open = adaptive meal form; gated = QR `?g=` auto-resolve or **full-name** search
(see RSVP-01a) → disambiguation picker → form. Couple Guests tab: Open/Gated toggle + per-guest QR
(`/w/[slug]/rsvp?g=<token>`) with regenerate.

**Files:** `0041_rsvp_household_access.sql`, `app/w/[slug]/{actions,RsvpForm,page,rsvp/page}.tsx`,
`app/(app)/projects/[projectId]/guests/{rsvp-access-actions,RsvpAccessCard,GuestRsvpQr,GuestRow,page}.*`.

### v25 — Website media + sections (WEB-IMG-01 / WEB-LAYOUT / WEB-EDITOR)

#### WEB-IMG-01 — public website-media bucket + hero image. Migration **0042**.

Photo foundation for the Tier 3 site. Public bucket `website-media` (25MB, image mimes); writes
gated `can_edit_project` on path folder 1 = `project_id`; **public SELECT with no published gate**.
Client upload helper `website-media.ts` returns a public URL; couple actions
`setHeroImage` / `clearHeroImage` persist `content.hero.imageUrl`. Clear removes the URL only —
storage orphan cleanup deferred. `components/website/` stays Supabase-free; templates receive the
URL string. Gallery / party reuse the same helper with subfolders `gallery/` / `party/`.

#### WEB-LAYOUT — shared section vocabulary + five-template overhaul. NO SCHEMA.

Extends `WeddingWebsiteContent` with:
- `gallery: { visible, images: { url, caption? }[] }`
- `party: { visible, heading?, members: { name, role?, imageUrl? }[] }`
- `faq: { visible, heading?, items: { question, answer }[] }`
- `travel.places: TravelPlace[]` (`kind: stay | getting_there | other`, name, detail?, url?, note?)
  — `travel.body` remains the intro / legacy freeform field

`parseWeddingWebsiteContent` never throws; missing sections default hidden + empty. Shared render
pieces under `components/website/sections/` (`SectionStack`, Story/Details/Schedule/Gallery/Party/
Travel/Faq, `PhotoTile`, `MonogramMark`, `SectionHead`) + `HeroPhotoBackdrop`, `OverlayNav`,
`RegistryCta`, `SiteFooter`. All five templates consume the shared vocabulary; `--ws-*` only
(no Soft stack chrome tokens). Nav anchors derive from `buildSectionAnchors` (visible + non-empty).
`pageSlot` still suppresses body sections on `/registry`.

#### WEB-EDITOR — LookStep + section authoring. NO SCHEMA.

Couple Website tab: **LookStep** (template + four palette swatches), **HeroImageField**,
**GalleryEditorFields** / **PartyEditorFields** / **TravelEditorFields** / **FaqEditorFields**,
**ReorderButtons** (up/down — do not pull @dnd-kit into this surface). Full-blob
`updateWeddingWebsite` + `revalidatePath` on each content edit. Registry section on the builder
is visibility + deep-link to the Registry tab / public sub-page (no parallel link entry —
REG-04).

**Files (website):** `0042_website_media.sql`,
`app/(app)/projects/[projectId]/website/{website-media,HeroImageField,LookStep,GalleryEditorFields,
PartyEditorFields,TravelEditorFields,FaqEditorFields,ReorderButtons,WebsiteEditor,actions}.*`,
`components/website/{types,HeroPhotoBackdrop,OverlayNav,RegistryCta,SiteFooter,layout,sections/*,
templates/*}.*`.

### v25 — Gated RSVP full-name lookup (RSVP-01a)

#### RSVP-01a — full-name match. Migration **0043**.

Replaces last-name tokenization on anon surface #6. Public gated UX asks for **full name**; RPC
arg is `p_full_name`; match is exact after normalize. Collisions still cap at 25 with a picker.
QR token resolve unchanged. Guests card copy: "QR or full-name match."

**Files:** `0043_rsvp_partial_name_lookup.sql` (full-name behavior),
`app/w/[slug]/{actions,RsvpForm}.tsx`,
`app/(app)/projects/[projectId]/guests/RsvpAccessCard.tsx`.

### v25 — Guest member authoring (GST-01)

#### GST-01 — per-member add + attending persist. NO SCHEMA.

`addGuest` accepts additional names when party size > 1 and inserts `guest_members` for each
(household primary + extras). Bulk add creates one member per guest. Member **Attending** checkbox
calls `updateGuestMember` so headcount tracks without re-adding. Cap semantics unchanged:
`guests.party_size` = invited max; attending members drive responded headcount.

**Files:** `app/(app)/projects/[projectId]/guests/{actions,AddGuestForms,GuestRow,guest-member-actions}.*`.

### v26 — Collaborator invites + create fix + marketing pricing

#### INV-07 — per-wedding collaborator invites. NO SCHEMA.

Planners invite an associate to **one** wedding as `project_members.role = 'collaborator'`. Same
`project_invitations` row + `/invite/[token]` accept path as couples — **one writer, role argument**,
not a second mechanism and not account-level seats.

Step 0 found `project_invitations.role` and `accept_project_invitation` → `v_inv.role` already shipped
in **0028**; INV-07 skipped migration and left the RPC alone. Live enum probe:
`couple | collaborator | viewer`.

`createProjectInvitation(projectId, email, role = "couple")` allowlists `{couple, collaborator}` and
rejects `viewer`. Access tab: distinct couple vs collaborator cards; lists show role; revoke/remove
reuse INV-02. Collaborators land in the couple workspace for that project only (no CRM —
`plannerOnly` is account-kind gated).

**Files:** `lib/invitations/actions.ts`, `lib/invitations/{constants,types}.ts` (non-async exports
moved out of the `'use server'` file — Next forbids them),
`app/(app)/projects/[projectId]/access/{page,InviteForm}.tsx`.

#### CREATE-01 — planner New wedding create under projects RLS. NO SCHEMA.

`createProject` was failing for planners because INSERT…RETURNING re-read the row under
`can_access_project` before the insert was visible to that policy path. Fix: client-generated
`projectId`, insert without `.select()`, resolve the **business** account explicitly when present,
surface errors in `NewWeddingForm`. No RLS / migration change.

**Files:** `app/(app)/projects/actions.ts`, `components/projects/new-wedding-form.tsx`,
`app/(app)/projects/page.tsx`.

#### LAND-02 — marketing header + capabilities. NO SCHEMA.

Sticky marketing topbar with home section anchors (`/#features`, `/#couples`, `/#planners`), Pricing
nav to `/pricing`, chunkier CTAs. Landing gains a static capabilities checklist panel
(`capabilities-panel.tsx`).

**Files:** `components/marketing/{marketing-topbar,landing-page,capabilities-panel,landing-hero,
feature-grid}.tsx`, `components/ui/{button,topbar}.tsx`. *(audience-split / how-it-works removed by
LAND-03.)*

#### PRICE-01 — `/pricing` presentation. NO SCHEMA.

Public pricing page with couple plans (Free / The full plan $99 one-time with $7-week CTA copy) and
planner plans (monthly $59 / annual $590 in-card cadence + Agency). **Stripe Price objects and
checkout routing are PRICE-02** — CTAs still go to `/signup` where noted.

**Files:** `app/pricing/page.tsx`, `components/marketing/pricing-plans.tsx`.

### v27 — Archive + invite cookie + landing toggle + checklist hygiene

#### ARCH-01 — planner archives finished weddings. Migration **0044**.

`projects.archived_at` + `set_project_archived` (definer, `can_manage_project_access`). Planner
dashboard Active/Archived toggle (`DashboardWeddingList`); sidebar lists active only. Archive is
reversible; does not delete project data or revoke memberships.

**Files:** `supabase/migrations/0044_project_archive.sql`,
`app/(app)/dashboard/{page,actions}.ts`, `app/(app)/layout.tsx`,
`components/dashboard/{account-dashboard,dashboard-wedding-list}.tsx`.

#### ARCH-01a — archived projects drop out of dashboard aggregates. NO SCHEMA.

Dashboard `tasks` / `project_vendors` reads for Urgent, vendors-needing-action, and tasks-due use
`.in("project_id", activeProjectIds)` (skip queries when empty). List/count paths already filtered
by ARCH-01.

**Files:** `app/(app)/dashboard/page.tsx`.

#### INV-08 — pending-invite cookie in middleware. NO SCHEMA.

On Next 16.2.9, `InvitePage` calling `cookies().set` during render threw. Middleware now sets
`pending_invite_token` on `/invite/*` when logged out; page is static. Cookie options shared via
`pending-invite-config.ts`. Closes the §13 Server Component cookie-write caveat.

**Files:** `middleware.ts`, `lib/invitations/pending-invite-config.ts`,
`lib/invitations/pending-invite.ts`, `app/invite/[token]/page.tsx`,
`utils/supabase/middleware.ts`.

#### LAND-03 — audience toggle + marketing copy sweep. NO SCHEMA.

Replaces two-card `audience-split` + How-it-works with interactive Couples/Planners tabs + unify
band under the hero (`audience-section.tsx`). Topbar hash targets `/#couples` `/#planners` sync the
tab. **Copy policy:** marketing must not promote or lead with "AI"; frame as the app /
"automatically" / "the assistant." No "Soft stack" in user-facing marketing.

**Files:** `components/marketing/{audience-section,landing-page,marketing-topbar,capabilities-panel,
landing-hero,website-preview-thumb,final-cta,marketing-footer,pricing-plans}.tsx`
(deleted: `audience-split.tsx`, `how-it-works.tsx`).

#### CHK-02 — delete checklist tasks. NO SCHEMA.

`deleteTask(taskId)` mirrors `toggleTask` (delete by id, RLS `FOR ALL` on `can_access_project`).
Step 0 confirmed `tasks` has the 0002 `for all` policy so DELETE is already covered (same shape as
`project_vendors`) and nothing FKs `tasks.id` (clean delete, no cascade). Per-row trash in `TaskRow`
— muted at rest, rosewood on hover/focus, spatially away from status (VND-05b lesson). No confirm
(a task carries no cascade; worst case is re-adding); works for any status including done and
overdue. No assistant delete tool (additive-only contract stands).

**Verification:** delete DB-confirmed by rowcount inference this cycle — after clearing and
rebuilding, a fresh assistant build produced 40 rows not 55, proving the removed set genuinely left
the table (not merely hidden). On-record checkpoint is the literal per-row `select id … → 0`.

**Files:** `app/(app)/projects/[projectId]/checklist/actions.ts`,
`components/checklist/TaskRow.tsx`.

#### CHK-03 — assistant task writes canonical phase + clamped date. NO SCHEMA.

**Problem:** the assistant's `add_task` (`lib/assistant/write-tools.ts`) let the **model author**
both `phase` (free string) and `due_date` (format-validated only, passed straight to `addTask`). As
the **third** `tasks` writer — never routed through the shared floor — it wrote non-canonical phases
(`"1 Month Out"` vs canonical `"1 month"`, forking the checklist into duplicate lowercase/title-case
bands) **and** past dates (Jun 2026, a valid `YYYY-MM-DD` the validator accepted). Two on-screen
bugs, one cause: model-supplied values with no enforcement at the write boundary.

**Fix (chosen: sanitize at the boundary + derive phase, NOT convert the tool to an offset — `add_task`
is general-purpose and must still handle single ad-hoc "add X due next Tuesday"):**
- `phase` **removed from the tool schema**; description states phase is derived, not authored. Model
  `phase` ignored.
- With `due_date`: clamp via `clampDueDateToToday`; fetch `wedding_date`; derive canonical phase via
  `wholeMonthsBetween(clampedDue, weddingDate)` → `phaseFromMonthsBefore(...)`. Phase follows the
  **clamped** date, so phase and date cannot disagree and the model cannot invent a phase string.
- Without `due_date`: `due_date: null`, `phase: null` (ad-hoc task, no basis for a phase — Other
  bucket handles it). Format validation retained.

**Shared floor extracted:** `clampDueDateToToday` now lives in `lib/date-months.ts` and is called by
**all three** `tasks` writers — `toWeddingPlan` (`onboarding/plan-actions.ts`, its inline runway-
month cap retained as a scheduling heuristic — the floor is the guarantee, the cap is a nicety),
`generateStarterChecklist` (`checklist/actions.ts`), and `add_task`. This closes the ONB-01 floor as
a shared, single-owner helper rather than inline logic one writer skipped.

**Verified (DB):** cleared, rebuilt via assistant → group-by all-canonical phases, zero
`due_date < current_date`, one band per phase; single ad-hoc "due next Tuesday" derives the correct
single phase. **Distribution, not absence** is the pass condition (a floor that flattens all tasks
onto today also shows zero overdue).

**Files:** `lib/assistant/write-tools.ts`, `lib/date-months.ts` (`clampDueDateToToday`),
`app/(app)/onboarding/plan-actions.ts`,
`app/(app)/projects/[projectId]/checklist/actions.ts`.

#### INV-02b — Has access = live membership. NO SCHEMA.

Access "Has access" reads `project_members` (join email from accepted invites when present).
`removeProjectMember` still deletes the membership row (that revokes `can_access_project`) and
best-effort soft-revokes matching invitations so history stays aligned; UI refreshes after revoke/
remove.

**Files:** `app/(app)/projects/[projectId]/access/{page,AccessActions}.tsx`,
`lib/invitations/actions.ts`.

**The reported problem, and what it actually was.** Dom's report: *couples can't add vendors they've
already booked off-platform; can't link them to a category; duplicates aren't prevented; and nothing
can be removed.* Step 0 found the first two already existed — **`addVendor` and
`AddVendorForm.tsx` had been there all along.** The initial Step 0 question missed them because it
asked for "the action that inserts a **discovered** vendor," and got exactly that. See §11.

Corrected picture:

| Reported as | Actually |
|---|---|
| Can't add manually | Exists — but always landed at `to_contact`, so an already-booked vendor sat in the outreach pipeline as someone you hadn't contacted |
| Can't link to a category | Exists — but the control was a free-text `<Input>` wired to nothing, storing whatever was typed |
| Duplicates not prevented | Same-vendor re-add was guarded in app code for discovered only; **near-duplicates across sources are structurally unpreventable** (§3) |
| Can't remove | Genuinely missing — no action, no UI. The RLS `ALL` policy already permitted DELETE |

#### VND-04 — migration 0030. Detail in §5.

#### VND-05 — category picker, booked-at-add, removal. NO SCHEMA.

`app/(app)/projects/[projectId]/vendors/actions.ts`:
- `addDiscoveredVendor` — now writes `category.id`, not `category.label`.
- `addVendor` — validates the submitted category **id** server-side against `VENDOR_CATEGORIES` and
  rejects unknown ids (no free-text storage). Accepts a status argument constrained to
  `'to_contact' | 'booked'`, defaulting to `'to_contact'`.
- **`removeProjectVendor(projectVendorId)`** — deletes the `project_vendors` row by id +
  `revalidatePath`. **Deletes the LINK ONLY.** RLS authorizes via the existing `ALL` policy; no
  manual ownership filter.

UI:
- `components/vendors/AddVendorForm.tsx` — category is now a select fed by `VENDOR_CATEGORIES`
  (value = id, display = label); new **Status** radio pair, "Still to contact" / "Already booked".
- **Soft duplicate warning** — originally same-category + close name → "Add anyway" (VND-05).
  **Superseded by VND-07a:** match is **project-wide**; primary offer is connect existing to the
  chosen category via `linkVendorToTarget`; Add anyway is secondary. Still soft; never blocks.
- `OutreachShortlistRow` — category now rendered through `vendorCategoryLabel`; per-row **Remove**
  with a confirm that states it removes the vendor from this project, permanently deletes its
  outreach message history, and unlinks it from any budget item or task.

> **Remove acts on its own row and ignores the checkbox selection.** Live-verified with both rows
> checked and "Draft outreach (2)" active. The selection belongs to outreach drafting only.

> **Remove must never delete the `vendors` row.** `vendors` is account-scoped and may serve other
> projects. Live-verified: after removing "Ocassions at Laguna", the `vendors` row count was **1**
> and the `project_vendors ⋈ vendors` count was **0**. Note the side effect — **the vendors row is
> now orphaned with zero project links, and nothing garbage-collects it.** Expected, not a bug, but
> account-level vendor lists will accumulate these. See §13.

#### VND-05a — remaining category read sites. NO SCHEMA.

0030 changed what `vendors.category` contains, so every reader changed meaning. Cursor's Step 0
listed **eight** read sites; VND-05 fixed one. VND-05a fixed the five that needed it:

| Site | Was | Now |
|---|---|---|
| Vendor detail header (`vendors/[vendorId]/page.tsx`) | raw id shown to user | `vendorCategoryLabel` |
| Planner dashboard table (`components/dashboard/planner-dashboard.tsx`) | raw id shown to user | `vendorCategoryLabel` |
| Outreach page (`outreach/page.tsx` → `OutreachDraftEditor`) | raw id shown to user | label assigned to `vendorCategory` |
| `outreach/actions.ts` → `generateOutreachDraft` | raw id **into an AI prompt** | label resolved at the call site |
| `vendor-enrichment` | raw id **into an AI prompt** | label resolved at the `extractWithModel(...)` call site |

**`lib/generate-outreach-draft.ts` was NOT modified** — signature and prompt string unchanged. That
is the §3 call-site rule.

**Deliberately left alone:**
- `lib/assistant/read-tools.ts` — `getVendors` trims category out before returning and
  `getBudget`'s `bookedVendors.top` is name/amount only. A dead read; harmless.
  (`getVendorTargets` does use `vendorCategoryLabel`, but on `vendor_targets.category`.)
- `search/page.tsx` → `buildOnListByCategoryId` — already id-based, and labels downstream via
  `vendorCategoryLabel` in `VendorSearchRail`. Its legacy label→id fallback is now **dead code**
  (0030 normalized everything) but is harmless defensive code. See §13.

> **The prompt sites are the reason this slice existed.** A raw `hair-makeup` interpolated into an
> outreach prompt throws nothing, errors nothing, and simply generates a slightly worse email. It is
> the silent-no-op failure shape in a non-database costume, and no checkpoint would have caught it
> except reading the generated text — which is why checkpoint (g) exists.

#### VND-05b — Remove affordance legibility. NO SCHEMA. **DONE (v20).**

The Remove control shipped rendering as low-contrast muted text immediately left of the status pill,
with no icon and no separation — it read as part of the status cluster rather than as an action.
**It was on screen and the person who wrote the spec could not find it.** Fix (shipped Jul 22): keep
it as text (an icon-only trash button in a row this wide is worse), separate it from the status pill
(`gap-6` + hairline) so the pill and the action read as distinct clusters, muted at rest,
`--rosewood` on hover/focus, visible focus ring. Rosewood is correct here — destructive action, not
a status colour. Still lives in `OutreachVendorRow.tsx` (`destructiveControlClass`).

### v20 — Booked slots, outreach in-flight, multi-owner run sheets (VND-06 … TL-04)

#### VND-06 — booked vendor owns the category slot. Migration **0031**.

**Problem:** "Already booked" on `project_vendors` and "booked" on a `vendor_targets` category slot
were independent. A couple could mark a florist booked in outreach and still see Florist under Still
to book, or book a slot with no vendor record attached.

**Schema (0031):** see §5. Slot FK + link-requires-booked CHECK + `replied` in status CHECK +
`vendors.address`.

**Actions** (`vendors/actions.ts`):
- `linkVendorToTarget(targetId, projectVendorId)` / `unlinkVendorFromTarget(targetId)`
- `removeProjectVendor` — before deleting the link, resets **all** matching targets to
  `{ project_vendor_id: null, status: 'needed' }`
- `updateVendorContactDetails` — phone + address only (never Places)

> **v21 note:** VND-07 changed **unlink** to leave `status = 'booked'` (empty recorded slot). Remove
> still resets to `needed`. See §7 VND-07.

**UI:** `BookedVendorsSection.tsx`, `LinkVendorToTargetControl.tsx`, `VendorContactFields.tsx`.
Page order: Booked → Still to book → Outreach → Declined. **(v21 reshapes Booked — see VND-07.)**

#### VND-06a — Outreach = in-flight only. NO SCHEMA.

Builds on verified VND-06.

| Rule | Detail |
|---|---|
| Outreach band | Only `to_contact \| contacted \| replied` (`IN_FLIGHT_STATUSES`) |
| Pipeline cycle | `to_contact → contacted → replied → booked → to_contact`; **Decline** is a separate exit |
| Drawn stops | `VENDOR_PIPELINE_STEPS` = To contact → Contacted → Replied → Booked; declined is not a stop |
| Declined | Collapsed `DeclinedVendorsGroup`; rosewood; restore → `to_contact` |
| Booked | Not listed in Outreach; lives in Booked band (package / unslotted / empty-slot wells — VND-07) |

Closes v19 B2: drawn set and stored set agree; `replied` is reachable.

#### TL-04 — multi-owner run sheets. NO SCHEMA.

**Problem:** `owner = "DJ, Officiant"` was one distinct dropdown value and matched neither the DJ nor
Officiant sheet.

**Fix (read-layer only):** `lib/timeline-owners.ts` — `parseOwners` / `eventHasOwner` /
`collectOwners`. Comma is the only separator. Aggregates + `filterEventsByOwner` call the helper.
Form hint on add/edit. No write normalization; assistant write tools untouched; `get_timeline`
returns the raw owner string. `sameOwner` conflict detection still uses full-string equality
(deliberate). Stale `?owner=DJ,%20Officiant` yields the empty state, not the master sheet.

### v21 — One vendor, many category slots (VND-07 … VND-07b)

#### VND-07 — venue package / multi-slot link. NO SCHEMA.

**Problem:** A venue package covers DJ, catering, baker, etc. After VND-06, (1) marking a slot
booked left an empty booked card that only offered "add them" (new vendor), not attach existing;
(2) `LinkVendorToTargetControl` hid once a vendor was already on one slot (`alreadySlotted`);
(3) the Booked band rendered **one card per `vendor_targets` row**, so one venue on four slots
looked like four vendors.

**Decision:** no junction table. Shared `vendor_targets.project_vendor_id` across N targets **is**
the package. Confirmed no unique on that column (live introspection).

**Actions (same writers; semantics tightened):**
- `linkVendorToTarget` — sole SET of `project_vendor_id` (one update: `{ status: 'booked',
  project_vendor_id }`). Attaching to a `needed` slot books it in the same write.
- `unlinkVendorFromTarget` — clears `project_vendor_id`, **leaves `status = 'booked'`** (empty
  booked slot / "vendor not recorded").
- `removeProjectVendor` — already filtered all matching targets; **must** keep
  `.eq('project_vendor_id', …)` so N slots reset to `needed` (discriminating live check).

**UI:**
- `ConnectExistingVendorControl` on empty booked slots (primary); Add new secondary.
- Booked band regrouped in `vendors/page.tsx` → one card per `project_vendor`.
- Replace occupied slot allowed with confirm naming the outgoing vendor.
- No "Also covers…" picker on the vendor/package side this slice — readout / Connect-from-slot
  only.
- Package card gained **Remove** (calls `removeProjectVendor`) so the N-slot reset is reachable
  from Booked (Remove previously lived only on outreach rows).

**Known residual (reported, not fixed in 07a as a Mark-booked bug):** when
`connectableVendors.length === 0`, Connect returns null; **Add new** sibling still renders — card
is not actionless. Optional empty-state copy ("No existing vendors to connect yet") does not exist.

#### VND-07a — package card legibility + project-wide duplicate guard. NO SCHEMA.

**Problem (live):** three `vendors` rows all named "Ocassions at Laguna Village" — one added per
category — because (1) soft dup filtered **same category only**, and (2) truncated names + category
eyebrows / `PACKAGE` label made three duplicate vendors look like one package.

**Vendor card (has `project_vendor`):**
- Remove category eyebrow and hardcoded `PACKAGE` label.
- Vendor name = card identity; full name, wrapping, **never truncated**.
- Covered categories as **chips** (`Pill` + `vendorCategoryLabel`). Chips are readouts, not
  controls.
- Zero linked targets: "Not linked to a category" + existing first-slot link control (raised card).

**Empty booked slot:** recessed well (not raised card); title = category label; body =
"Booked · vendor not recorded"; Connect primary, Add new secondary. Category must not occupy the
vendor-name position.

**`AddVendorForm` soft dup:**
- Name match is **project-wide** (all categories).
- Primary CTA: **Connect the existing vendor to this category instead** → `linkVendorToTarget`
  (needs a `vendor_targets` row for that category; otherwise an error asks to add the category
  first).
- **Add anyway** demoted to secondary. Still soft — never blocks.

#### VND-07b — always render category chips. NO SCHEMA.

VND-07a suppressed chips when cover count === 1 (to avoid repeating a removed eyebrow). With no
eyebrow, single-category vendors showed **no category at all** ("Ryland" with no Officiant signal).

**Fix:** chips render whenever linked slots ≥ 1. Same chip component for one or many — do not style
a single chip as a "primary category." No label word above the chips. Unslotted (zero slots)
unchanged.

### v21 — Many budget lines per vendor (BUD-04)

#### BUD-04 — one project_vendor → many budget_items. Migration **0032**.

**Problem:** 0026 enforced one budget line per `project_vendor` (`budget_items_project_vendor_uidx`
— "a quote maps to one line"). A venue package that covers catering, cake, DJ, etc. could not be
linked to each planned line.

**Schema (0032):** drop that partial unique; keep non-unique `budget_items_project_vendor_id_idx`.
Still **at most one vendor per budget item** (nullable FK). Linking is metadata — moves no money.

**Math** (`lib/budget-aggregates.ts`, read-time only): per linked vendor expose `quotedPrice`,
`sumPlanned`, `variance` (= quote − sum of linked planned), `linkedItemCount`. **No branch on
`linkedItemCount` inside the math** — only in rendering. Coerce with `Number(...)`. Headlines
(Allocated / Spent / Committed / Unallocated) remain **items-only**; vendor link does not change
them. `bookedUnlinkedQuotedTotal` unchanged.

**UI:**
- `VendorVariance`: count === 1 → BUD-01a over/under; count > 1 → neutral
  `Part of {name} package · covers N lines`
- Rail `PackageVarianceCard`: only vendors with count > 1; rosewood when over plan
- Picker: all vendors offered; soft clay warning when already on another line; never blocks
- Removed action `23505` "already linked to another budget item" path

**Files:** `0032_budget_item_vendor_many.sql`, `lib/budget-aggregates.ts`, `BudgetItemRow.tsx`,
`BudgetBoard.tsx`, `budget/actions.ts`.

---

## 8. Onboarding → AI starting plan

3-step wizard captures `wedding_profile` + `wedding_date` + `total_budget`;
`generate-wedding-plan.ts` returns strict JSON (defensive parsing); editable preview; **Approve**
(`commitPlan`) inserts tasks/budget_items/vendor_targets, stamps `onboarded_at`, guards
double-commit. (`saveOnboarding` remains the ONLY onboarding-path write of `wedding_date`;
post-onboarding edits go through SET-01's `updateWeddingDate`.) **Computed task due dates floor
through `clampDueDateToToday` (CHK-03 shared helper) and `phase` is derived, never authored.**

> **⚠️ `onboarded_at` lives on `wedding_profile`, NOT on `projects`.** `lib/onboarding-gate.ts` reads
> `wedding_profile.onboarded_at` for a given `project_id`. **A planner-created project has no
> `wedding_profile` row at all** — which is why Mila & Griffin reads null, and why that's correct
> rather than a bug. Any query joining `projects` for `onboarded_at` errors with `42703`.

> **Invited couples never see the wizard.** `coupleOnboardingRedirect` returns null for a null
> account (§6), and the discriminator is deliberately NOT `wedding_profile.onboarded_at` — it is
> whether the user owns the account that owns the project.

**The generator's response shape (ONB-01; still current):**
```json
{
  "checklist":        [ { "title": string, "monthsBeforeWedding": number } ],
  "budget":           [ { "category": string, "plannedAmount": number } ],
  "vendorCategories": [ { "category": string, "note": string } ]
}
```
**`phase` is NOT in this shape and must not be added back.** It is derived from the clamped offset
via `phaseFromMonthsBefore`. `vendorCategories[].category` MUST be one of `VENDOR_CATEGORIES`' ids.

---

## 9. AI assistant

Unchanged. Reactive tool-use agent in `lib/assistant/` + `components/assistant/`, per-project history
in `assistant_messages`, account-kind-aware system prompt, RLS-protected actions, plain prose.

**Tools: read + additive-write only. No delete tools.** A system-prompt **honesty rule** requires the
assistant to say plainly when it has no tool for something.

**Loop semantics:** capped at `MAX_TOOL_ITERATIONS = 8`. Cap-hit WITH committed writes → `ok:true` +
honest summary, exchange persisted; cap-hit with NO writes → persists nothing.

**Cost controls:** static tools+system prefix prompt-cached; history windowed to
`ASSISTANT_HISTORY_WINDOW = 10`; read-tool payloads compacted; state derived from LIVE tool reads.

> **Read coverage is complete for project-scoped planning entities but NOT for account-scoped
> entities (leads, proposals), seating, or invitations.** Website has a narrow write
> (`set_website_travel` — fill empty Travel & Stay with intro + structured `places`; refuses
> overwrite) plus travel `placeCount` on read; RSVP / full website authoring remain out of scope.
> The assistant also has no vendor-removal tool and should not get one — it is a destructive action
> with a cascade.

> **Assistant write-tool canonical audit (v27 / CHK-03 follow-up). COMPLETE — closed, not
> deferred.** 12 write tools (all in `lib/assistant/write-tools.ts`); **zero** pass an unvalidated
> canonical value to the DB.
> - **Enforced (canonical / derivation):** `add_task` phase (derived) + due_date (clamped);
>   `update_task_status` (`todo|in_progress|done`); `update_guest_rsvp`
>   (`pending|attending|declined`); `add_vendor_target` category (schema enum + action rejects
>   unknown via `getVendorCategoryById`); `set_website_travel` kind (`stay|getting_there|other`,
>   action coerces unknown → `other`).
> - **Free-text by design (correct, NOT a gap):** `add_budget_item` category; `add_timeline_event` /
>   `add_timeline_events` owner + section; note/guest text fields; website schedule item text. These
>   columns are free-text in the app itself; the assistant matching that is the right non-action.
>   Do not harden them to enums (see §3 corollary).
> - **Two soft notes, both fine:** `add_vendor_target` enforces at the *action* not the tool body
>   (still a hard reject before DB — enforcement at the action boundary is enforcement);
>   `set_website_travel` **coerces** rather than rejects an invalid kind (correct for a low-stakes
>   display enum — degrade the place to `other`, don't throw away the write; contrast task phase,
>   where derive-from-truth is correct).
>
> The property this confirms: the assistant write layer is *consistent with the app's own
> enforcement* — canonical where the app is canonical, free where the app is free. Re-run this audit
> when a new write tool ships (esp. leads/proposals/RSVP/seating tools).

---

## 10. Design system — Soft stack (C1)

> **This section is a POINTER.** Token VALUES live in `app/globals.css`. RULES live in
> `.cursor/design.mdc`. If they disagree with this file, those two win. `design/reference.html` is
> **stale** (still Modern romantic); regenerate. `design/theme-direction.html` is superseded — delete.

**Direction:** Soft stack (C1) — calm tool organized by **depth**. Mauve-tinted canvas; raised white
cards; recessed wells for rows/tracks. Hierarchy = raised-contains-recessed.

### Three-tier surface taxonomy

| Tier | Where | What it gets |
|---|---|---|
| **1 — App chrome** | `app/(app)/`, most of `components/`, planner, forms, seating canvas, assistant, settings, Access tab | Soft stack palette + Figtree; two depth levels; three radii; **no** accent flood; **no** Cormorant/Great Vibes |
| **2 — Emotional** | Landing, onboarding hero/welcome, empty-state heroes, `/invite/[token]` | Same palette + Figtree; larger display scale; **exactly one** deep field `--deep` per surface |
| **3 — Website + print run sheet** | `components/website/`, public `/w/[slug]`, `RunSheetDocument.tsx` print header | `--ws-*` colour only; Cormorant + (Romance) Great Vibes; Hanken via `--ws-font-sans` |

**Serif / script location rule:** Cormorant Garamond and Great Vibes may appear **only** in
`components/website/` and the run-sheet print header.

**Status-colour meaning:** sage = settled/done/booked/signed/rsvp-yes; clay = in flight; rosewood =
wrong/overdue/over-plan/declined/rsvp-no; well/muted = neutral. **Kind is never encoded in a status
colour** (esp. seating table kinds).

> **NEW (v19) — rosewood is also the DESTRUCTIVE-ACTION colour**, not only a status colour. Remove /
> delete controls are muted at rest and rosewood on hover/focus. This does not conflict with the
> status vocabulary because a destructive control is an action affordance, not a state readout.

> **NEW (v19) — an action rendered as muted text adjacent to a status pill will be read as part of
> the pill.** Row-level actions need spatial separation from status readouts and a real hover/focus
> affordance. Shipped once, failed live, fixed in VND-05b (**done**).

**Budget:** no pie/donut/circular progress; bars reuse checklist progress-band vocabulary; Allocated
is items-only; quote money never enters a headline figure.

**Seating canvas:** tables raised `--surface` on `--canvas`; outlines `--ring`; selection `--accent`;
full occupancy `--sage`; kind = form + text only. **Dance floors (SEAT-11):** dashed `--well` fill +
ring/accent stroke — still form, never a status colour.

**Date formatting (LAND-01a):** public/couple-identifying long wedding dates → shared
`formatWeddingDate` in `components/website/template-utils.ts`, locale **`en-US`**.

### Open design items

| Item | Status |
|---|---|
| Legacy CSS aliases (`--plum`, `--stone`, …) in `globals.css` | **Open** — temporary; do not add new alias consumers |
| `design/reference.html` regenerate | **Open** |
| `design/theme-direction.html` delete | **Open** |
| Font-load scoping (Great Vibes only on `/w/`, etc.) | **Open** (optimisation) |
| Dom live Soft stack + LAND-01 / LAND-01a visual checkpoint | **Open** — the standing human gate |
| Tier 1 date locale policy after LAND-01a sweep | **Open** |
| Run sheet legacy classnames | **Accepted for now** |
| `/styleguide/date-check` harness | Delete after Dom's five-template date pass |

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

**The checkpoint is a LIVE run, not a typecheck.** **Cursor cannot authenticate to the app — Dom runs
every live checkpoint.** Cursor's "code-level ✅" is narration, not verification.

**Design the checkpoint to fail.** Ask every time: *what would this checkpoint look like if the fix
silently didn't work?* If the answer is "the same," the checkpoint is decoration.
- ONB-00: "fresh signup works" passes on the *broken* code. Only the deliberate double-click tests it.
- ONB-01: "nothing is overdue" passes on a clamp-flattened plan. Only the distribution query tests it.
- INV-01: accepting with the right email passes on code with no email guard at all. Only the
  **forwarded-link refusal** tests it.
- INV-02: a revoke that merely hides a row in the UI looks identical to a working one. Only
  **revoke-then-open-the-link** tests it.
- **VND-05: a Remove that deleted the account-level `vendors` row looks IDENTICAL in the UI to one
  that correctly deleted only the link.** Only the two-count SQL pair (`vendors` = 1,
  `project_vendors ⋈ vendors` = 0) discriminates.
- **VND-05a: a raw category id in an AI prompt throws nothing and renders nothing wrong.** Only
  reading the generated outreach email discriminates.
- **CHK-03: a due-date floor that flattens all tasks onto today shows zero overdue, same as a
  correct floor.** Only the DISTRIBUTION (front floored, tail spread to real offsets) discriminates.

**Verification lessons (v18):**
1. **Confirm the migration landed before believing any checkpoint.** One error rolls back the whole
   paste. Use `to_regclass` / `to_regprocedure` / `pg_policies` first.
2. **Absence-shaped assertions pass trivially when the feature doesn't exist.** `count(*) = 0` proves
   nothing unless you know the code path ran.
3. **Reproduce the defect BEFORE applying the fix, or you lose the ability to.**

**NEW verification lessons (v19):**

4. **Scoped Step 0 questions return scoped answers. Ask for EVERY writer, not the writer you have in
   mind.** The v19 Step 0 asked for "the action that inserts a **discovered** vendor." Cursor
   answered exactly that and never mentioned `addVendor` — so two rounds of planning proceeded on
   the false belief that manual add didn't exist, and were only corrected because Dom said *"I added
   it manually through the add vendor area."* **Phrase enumeration questions as "list EVERY code
   path that inserts into X" and require a count.** *(Re-confirmed v27: the ONB-01 floor fix touched
   only the two writers it enumerated; the assistant `add_task` — a third `tasks` writer — stayed
   unclamped until CHK-03 enumerated ALL writers by count.)*
5. **Cursor answering a Step 0 question is not Cursor acting on it.** VND-05's Step 0 dutifully
   listed **eight** read sites of `vendors.category`; the shipped summary reported fixing **one**.
   The other seven silently changed meaning. **Enumeration is not remediation — when Step 0 produces
   a list, the slice must say explicitly what happens to every item on it, including "left alone,
   and why."**
6. **A control the spec author cannot find on the page has not shipped.** Remove was rendered,
   functional, and invisible. Treat "I don't see it" from someone who wrote the requirement as a
   design defect, not a user error.

**NEW verification lessons (v27):**

7. **An insert-only writer looks broken after a clear-and-rebuild unless you separate stale from
   fresh.** A phase/date fix verified against a rebuilt checklist is unreadable if old rows remain
   (two vocabularies mix in the group-by). Clear first, rebuild, then read — and read the group-by,
   not the header labels (phase headers are derived from offset and are correct even when a due date
   was floored).
8. **A guard that silently no-ops and a broken guard that doubles rows look identical in the UI —
   count the rows.** `generateStarterChecklist`'s double-insert guard (`if count>0 return`) was
   confirmed only by asserting the row count stays put on a second click; "it looks fine" would have
   passed a broken guard too.

**Verify schema claims by introspection, not narration.** Run introspection **one statement at a
time** and coerce long definitions to booleans so they cannot truncate. **This bit again at 0030** —
the status CHECK definition clipped mid-array.

**Checkpoint reports must be literal.** Paste actual output — rows, counts, error codes, generated
text. "All set" is not a checkpoint report; it is a summary of one, and the bible records the
difference (see the v19 header).

**Step 0 is load-bearing. When Step 0 contradicts the prompt, Step 0 wins.** During the VND build
Step 0 correctly caught: that `project_vendors` already had DELETE coverage via an `ALL` policy (so
removal needed no migration); that no column was needed for manual vendors; that `'lead'` was dead;
and that `vendors.category` had three vocabularies. Every one changed the slice. **CHK-02's Step 0
likewise caught the `tasks` `for all` policy (DELETE already covered, no migration).**

**Don't diagnose from a screenshot.** Get the rows. *(v27: three checklist bugs in a row were each
resolved by a group-by / rowcount query, never by the screenshot.)*

**Documentation discipline (v27):** the bible is written from the reasoning in the working session,
not from a code scan. A code scan reliably catches **factual drift** (migration numbers, file paths,
whether a file exists) — use it for that, as a findings list, not as bible prose. But it cannot
reconstruct *why* (a deliberate deferral, a "closed not deferred," a derive-vs-coerce choice), and a
scan reconciling the bible TO the code will silently overwrite exactly those decisions. Principles
and audit conclusions come from the conversation; Cursor does not author the bible.

**Drift watchlist:**
- Manual permission filters; naive first-membership lookups
- A new user class gaining read access without auditing every write policy on that table
- Assuming a missing policy errors — it silently succeeds and writes nothing
- Non-idempotent migrations (`create policy` / `create trigger` without `if exists` drops)
- **Adding a CHECK without reconciling the column's DEFAULT against it**
- **A free-text input wired to nothing where a canonical list exists**
- **A writer (form, action, OR assistant tool) that authors a value with a canonical derivation
  instead of deriving/clamping it at the write boundary** (§3 — three `tasks` instances)
- **Changing what a column CONTAINS without enumerating every reader of it**
- **Promising a constraint that has no shared key to act on**
- **Deleting the account-scoped parent when the user meant to remove the project-scoped link**
- **Writing `projects.archived_at` directly instead of via `set_project_archived`**
- Cormorant / Great Vibes outside Tier 3; Tier 1 accent floods; raised-inside-raised; ad-hoc radii
- Kind encoded in status colour; trusting client-sent totals/entitlement/ids/angles
- Reaching for service-role; hardcoded lists instead of single sources
- Importing Supabase/auth into `components/website/`
- Adding anon SELECT on `registry_claims` (leaks claimer names) or `rsvp_attendees` /
  `guest_members` / `rsvp_submissions`
- Restoring anon INSERT on `rsvp_submissions` (intake is `submit_rsvp` only)
- Auto-matching RSVP submissions to guests
- Deriving or overwriting `guests.party_size` from members / attendees
- Mapping free-text `meal_choice` to `meal_option_id` in backfill
- Bare `ON DELETE SET NULL` on a composite FK (must be parenthesized column list — 0026)
- Storing a registry claimed-count column instead of deriving availability
- Feeding registry `price` into budget headlines / aggregates
- Seating `guest_members` (seating stays on `guests.id`)
- Skip-revalidate where a discrete write would do; numeric string coercion on arithmetic paths
- Sliding a *feature* (new stored field) into a *layout* polish slice
- Suggesting `supabase db push`
- Summing two different things into one headline figure
- Duplicating date math instead of `lib/date-months.ts`
- Storing two fields that can disagree when one could be derived
- Hardening a deliberately-free-text column (`budget_items.category`, `timeline_events.owner`) to an
  enum
- Setting the pending-invite cookie from a Server Component render (middleware only — INV-08)
- Leading marketing copy with "AI"
- Reintroducing Modern romantic chrome; using Soft stack tokens as public website colour
- Hiding a tab and calling it authorization — gate the ROUTE

---

## 12. Compliance & security notes

- **Stripe:** webhook verifies raw-body signature; service-role only in webhook (+ billing/admin);
  entitlement read only from the `subscriptions` row. **Stripe Tax NOT set up.**
- **Public website read:** anon `using (published = true)`; self-contained snapshot.
- **Public registry read:** anon `SELECT` on `registry_items` gated to a published wedding site
  (0035). External link-outs ride `wedding_websites.external_registry_links` (surface #1).
- **Public meal-options read:** anon `SELECT` on `meal_options` gated to a published wedding site
  (0038). Style rides `wedding_websites.meal_service_style` (surface #1).
- **Public registry claim write:** anon `INSERT` only on `registry_claims` (0036), gated to published
  sites; `project_id` derived server-side; honeypot + soft throttle. No anon SELECT (names stay
  couple-only). Availability via `registry_item_availability` aggregates.
- **Public RSVP write:** `submit_rsvp` RPC only (0039); honeypot silent-ok + soft throttle in the
  action; `project_id` / published / style resolved from slug inside the definer. **No direct anon
  INSERT on `rsvp_submissions` or `rsvp_attendees`.** **Collects guest PII** → privacy policy.
- **RSVP→guest promotion** is couple-only (`matchSubmissionToGuest`); never anon.
- **Invitations:** raw tokens are 32 random bytes, base64url, **stored only as sha256 hex**.
  Acceptance is bound to `auth.email()`. Expiry 14 days; revocation immediate. No anon RLS policy,
  no service-role path, no user created on the couple's behalf. Pending-invite cookie is httpOnly,
  `sameSite: lax`, secure in production, 30-minute lifetime, consumed once, **set in middleware**
  (INV-08).
- **Archive:** `set_project_archived` is definer, `can_manage_project_access`-gated, `authenticated`
  only (anon revoked). Reversible; deletes no data and revokes no membership.
- **Vendor removal (v19):** deletes the project link only. **It hard-deletes `outreach_messages` for
  that link via FK cascade** — sent-email history for that vendor is unrecoverable. The confirm copy
  names this. If outreach history ever needs to be retained for compliance or dispute purposes,
  the cascade is the thing to change (soft-delete or `ON DELETE SET NULL` + retention), not the UI.
- **Gmail OAuth:** `gmail.send` is a **sensitive** scope → needs sensitive-scope verification.
  Testing mode: 7-day test-user token expiry, 100-test-user cap — planner + pilot couples only.
- **Signup:** `auth.signUp` only, then email confirmation. **No account/project is created at
  signup** — bootstrap happens on the OnboardingForm submit, behind the `already_bootstrapped` guard.
- **Google Places / Files / Assistant / Seating / Budget:** store only `place_id`; private bucket +
  signed URLs gated by `<projectId>/`; assistant can't exceed RLS.
- **Production infra:** prod belongs in a **separate Supabase org on Pro**. Fresh prod project,
  migrations **0001–0044** applied by hand once each in order (NEVER `db push`), storage buckets
  (`project-files` + **`website-media`**) + policies recreated, real SMTP, prod domain in auth
  redirect URLs. See the Launch Prep Runbook.
- Set Anthropic + Google Cloud + Stripe + Supabase billing/spend alerts.

---

## 13. Known caveats / things to verify

**Closed by v10:** BUD-02 rail + BUD-01a variance; 0026 introspection; signup dead-end (ONB-00);
plans born overdue (ONB-01); `setMonth` day-overflow; the `projects.onboarded_at` misclaim.

**Closed by v11 (design):** Soft stack tokens live; Figtree chrome; three-tier taxonomy.

**Closed by v16–v18 (invitations):** `projects` UPDATE RLS asymmetry (0029); `createProject` naive
first-membership; `project_members` recursive-policy flag (investigated, safe — **do not re-flag**);
`project_members` missing DELETE policy (0028).

**Closed by v19 (vendors):**
- **No way to record an already-booked off-platform vendor** — `addVendor` now accepts a status.
- **Category stored in three vocabularies** — normalized to ids at rest (0030), enforced at both
  write paths, and resolved to labels at all five remaining read sites (VND-05a).
- **No vendor removal** — `removeProjectVendor`, live-verified to delete the link only.
- **Duplicate discovered-vendor links** — structurally closed by
  `project_vendors_project_vendor_key`.
- **Dead `'lead'` default on `project_vendors.status`** — retired in 0030.

**Closed by v20:**
- **VND-05b Remove affordance** — shipped (spatial separation + rosewood hover).
- **`replied` unreachable (v19 B2)** — 0031 widens the CHECK; VND-06a aligns Outreach with
  `IN_FLIGHT_STATUSES` / `VENDOR_PIPELINE_STEPS`. Drawn set and stored set agree.
- **Booked vendor vs category slot were independent** — `vendor_targets.project_vendor_id` (0031)
  + Booked band UI (VND-06 / 06a).
- **Multi-owner run sheet string-equality bug** — TL-04; owner is a SET at read via
  `lib/timeline-owners.ts`. Column still free text at rest.

**Closed by v21 (VND-07 family):**
- **One vendor could not cover multiple category slots in the UI** — VND-07: shared
  `project_vendor_id`, package cards, Connect existing, multi-slot remove reset.
- **Unlink left slots in Still to book** — unlink now leaves `status = 'booked'` (empty recorded
  slot).
- **Duplicate manual vendors per category (Ocassions ×3)** — VND-07a: project-wide soft dup +
  connect-primary; full wrapping names + chips so packages are distinguishable from duplicates.
- **Single-category vendor showed no category** — VND-07b: chips always when ≥1 linked slot.
- **One budget line per vendor (0026 unique)** — BUD-04 / **0032** dropped
  `budget_items_project_vendor_uidx`; package variance is quote vs sum of linked planned.

**Closed by v22 (SEAT-11):**
- **No dance floor on the seating floor plan** — `kind = 'dancefloor'` + `seat_count = 0` on
  `seating_tables` (0033); place/move/rotate/delete; assignment and seat-count rejected; excluded
  from By-table breakdown.

**Closed by v23 (REG-01…03):**
- **No in-app gift registry** — couple CRUD (0034), public sub-page + external link-outs (0035),
  guest reserve/purchase claims with privacy-safe availability RPC (0036).

**Closed by v24 (MEAL-01…03 + REG-04 + RSVP-01):**
- **RSVP → guest matching NOT built** — `matched_guest_id` + `matchSubmissionToGuest` /
  `unmatchSubmission` (0040); attendees promote to `guest_members` on couple confirm only.
- **No per-person meal RSVP** — `rsvp_attendees` + adaptive form + `submit_rsvp` (0039).
- **No couple meal / service-style config** — `meal_options` + `meal_service_style` (0038).
- **Anon surface count** — exactly **six** (website read, meal_options read, registry items read,
  registry claims insert, `submit_rsvp` execute, `lookup_rsvp_household` execute). Direct RSVP
  INSERT removed. **No anon SELECT on guests.**
- **Legacy website registry links** consolidated into `external_registry_links` (0037).
- **Open RSVP only** — household gate via `rsvp_token` + `rsvp_access_mode` (0041).

**Closed by v25 (WEB + RSVP-01a + GST-01):**
- **No website photos** — public `website-media` bucket + hero/gallery/party URLs in content
  jsonb (0042 / WEB-IMG-01). **Reverses the v24 "Photos: declined permanently" decision.**
- **Flat five-template duplication / no Gallery·Party·FAQ** — shared `SectionStack` vocabulary
  (WEB-LAYOUT) + LookStep / section editors (WEB-EDITOR).
- **Gated RSVP last-name search** — exact normalized full-name match (0043 / RSVP-01a).
- **Add guest with party size > 1 forced member-editor follow-up** — GST-01 collects additional
  names at add time; attending checkbox persists via `updateGuestMember`.

**Closed by v26 (INV-07 + CREATE-01 + LAND-02 / PRICE-01):**
- **No collaborator invite** — Access issues `collaborator` via the same invitation mechanism
  (INV-07); accept copies `project_invitations.role`. **`viewer` still not issued.**
- **Planner New wedding create silent-fail under projects RLS** — CREATE-01 (no RETURNING;
  explicit business account; form errors).
- **No public pricing page / thin marketing nav** — LAND-02 capabilities + PRICE-01 `/pricing`
  (Stripe wiring deferred to PRICE-02).

**Closed by v27 (ARCH-01/01a + INV-08 + LAND-03 + CHK-02/03 + INV-02b):**
- **No planner archive** — `archived_at` + `set_project_archived` (0044); Active/Archived UI;
  aggregates exclude archived (ARCH-01a).
- **Invite cookie write crashes on Next 16** — middleware sets the cookie (INV-08).
- **Weak audience-split / How-it-works / AI marketing leaks** — LAND-03 toggle + copy policy.
- **No checklist delete** — CHK-02 hard delete by id.
- **Assistant writes invented phases / past due dates** — CHK-03 clamp + derive canonical phase;
  shared `clampDueDateToToday` now on all three `tasks` writers (couple plan, starter button,
  assistant). Closes the ONB-01 floor as a single-owner helper.
- **Has access lists removed members** — INV-02b reads live `project_members`.
- **Assistant write-tool canonical coverage unverified** — §9 audit: 12 tools, zero unvalidated
  canonical writes to DB. Closed, not deferred.

**Open — from the v19/v20/v21/v22/v23/v24/v25/v26/v27 build:**
- **VND-05 checkpoints a, c, e, f, g reported as "all set" without pasted output.** Believed good.
  (d) was the silent `replied` → 23514 case — closed by 0031. (g) remains the one to spot-check if
  outreach quality looks off (raw category id in a generated email).
- **Orphaned account-level vendors.** Removing the last project link leaves the `vendors` row with
  zero links and nothing collects it. "Ocassions at Laguna" was in this state after the VND-05 pass.
  Harmless today; an account-level vendor library UI would need to handle it.
- **`search/page.tsx` → `buildOnListByCategoryId` legacy label→id fallback is now dead code.**
  Harmless defensive code; deliberately left in place.
- **TL-04 live Dom checkpoint** optional — discriminating pair is DJ / Officiant sheets both showing
  the shared `"DJ, Officiant"` event, with `group by owner` still showing the combined string at rest.
- **Empty booked slot with zero project vendors:** Connect control returns null; Add new remains.
  No "No existing vendors to connect yet" copy (optional polish).
- **Website-media storage orphans** after clear/remove — content URL cleared; object not deleted.
- **WeddingCountdown hydration** — SSR vs client day-boundary can mismatch the days numeral
  (observed 44 vs 45). Prefer a client-only mount or a shared truncated "days until" calc if it
  reappears in Dom visual QA.

**Open — security / schema:**
- **`viewer` can write on every project-scoped table except `projects` and the WRITE-01 exemplars
  already on `can_edit_project` (`registry_items`, `registry_claims` editor mutations,
  `meal_options`, `guest_members`, **`website-media` storage writes**).** `project_vendors`,
  `tasks`, `budget_items`, `guests`, `notes`, `timeline_events`, `seating_*`, `rsvp_submissions`
  member writes, and most of the rest still gate writes on `can_access_project`, which a `viewer`
  passes. **`removeProjectVendor` is the sharpest remaining example — a viewer can delete a vendor
  link and cascade its outreach history.** `deleteTask` (CHK-02) is the same class — a viewer could
  hard-delete tasks. Unreached today because Access **still does not issue `viewer`** (INV-07
  allowlist is `{couple, collaborator}` only). Collaborators are intended editors (`can_edit_project`
  includes them). **WRITE-01 before any `viewer` invite.** See §15.
- **`projects` has NO DELETE policy.** Silent-no-op shape, currently unreached.
- **`vendors.category` / `vendor_targets.category` have NO CHECK.** After the v27 write-tool audit
  this is the **sole remaining place a canonical value lacks a *DB-level* constraint** — the form is
  a picker, the `addVendor` action validates ids, and the assistant `add_vendor_target` action
  rejects unknowns, so nothing writes garbage in practice; the gap is structural (belt behind the
  suspenders), not behavioral. **ONB-02 (next-free / 0045+) owns the category-constraint decision**
  and should apply it to both columns against one canonical list, or decide deliberately not to and
  record why. When it lands, vendor category matches task status (code + DB CHECK) as fully enforced.
- **`guests.meal_choice` still present (inert).** Drop in **MEAL-03a / 0045+** after Dom verifies
  backfill fidelity. Until then do not reintroduce app reads/writes.
- **`website-media` public SELECT has no published gate.** Draft photos are fetchable by URL.
  Intentional; do not "fix" by adding a published join without a deliberate product decision.
- **`project_invitations.invited_by` / `accepted_by` have no FK to `auth.users`.** Cosmetic.
- **`budget_items.category` free-text/nullable** — Uncategorized bucket handles it. Free-text is
  deliberate; do not enum it (§3 corollary).
- **`tasks.phase` still free-text**; past `wedding_date` still permitted. Phase is derived by every
  writer (§3) but the column carries no CHECK — a future non-derived writer could fork it, which is
  why §3's write-boundary rule is the guard, not the column type.

**Open — invitation feature (deliberate gaps):**
- A user who ALREADY has a personal account can accept an invitation, but routing sends personal
  users to `getCoupleDestinationPath` — **their direct project stays invisible.** Test with an
  account-less fixture.
- Dual-account is foreclosed by 0027, deliberately. Reversible in one `create or replace`.
- No email delivery (INV-06). **`viewer` invite still deferred** (WRITE-01). Collaborator invite
  shipped (INV-07). Pending-invite cookie lives in **middleware** (INV-08) — do not restore a
  Server Component `cookies().set` on `/invite/[token]`.

**Open — Soft stack / design (the standing human gate):**
- **Dom live Soft stack + LAND-01 / LAND-01a visual checkpoint** across couple tabs, planner,
  landing, login, leads, billing, Access tab, `/invite/[token]`, and `/w/[slug]` date hydration.
- Tier 1 date locale policy; `design/reference.html` stale; `design/theme-direction.html` to delete;
  legacy CSS aliases; font-load scoping; `/styleguide/date-check` harness to delete.

**Open — other:**
- Assistant QA slices typecheck clean; not all live-verified in one session.
- Seating occupancy action-enforced; seats all guests regardless of RSVP; timeline `owner` free text
  at rest (SET at read — TL-04). Dance floors are seatless layout markers (SEAT-11), not assignable.
  **Seating is still per `guests.id` — per-member seating is a future slice.**
- RSVP throttle soft (anon cannot SELECT submissions, so the count is best-effort).
- Lead→project conversion NOT built (Phase 4).
- Currency helpers duplicated — prefer `lib/format-currency.ts`.
- **Apply + Dom-checkpoint 0037–0044 live** if not yet pasted (especially **0040** — without it,
  `guest_members` is missing and Add person fails with PGRST205; **0042** for website photos;
  **0043** for gated full-name lookup; **0044** for planner archive).

**Dev DB state (v20 baseline + v27 additions — EXPECTED; re-introspect before relying on vendor/task rows):**
- `dominicciccaglione@gmail.com` (`6bf62d70-ae1c-47cf-aff1-2125bc90f444`) — **personal**,
  "Dom & Jordyn 2027" (`1c7878d1-c7dd-4c48-b355-d2d9f1e944bb`), wedding 2027-02-13.
- `d.ciccaglione1@gmail.com` (`1779eba2-c4b4-456e-a95f-ba15661f5662`) — **business**,
  "Events by Jordyn". Planner projects:
  - **Mila & Griffin** (`1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9`, planner-created, no `wedding_profile`,
    `wedding_date = 2027-02-15`, `total_budget = 40000.00`, 0 project_members). **Must remain at these
    values.**
  - **Matt & Courtney** (`b7c32347-722a-4c6d-8ba4-c98cd2eb77e8`, planner-created, `wedding_date =
    2027-06-13`) — the v27 checklist test project. Its `tasks` were cleared/rebuilt during CHK-01a /
    CHK-03 verification; after the fix the two earliest tasks floor to today and phases are canonical.
    Task rows here are churn, not fixtures — re-introspect, don't rely on a specific set.
- `d.ciccaglione@icloud.com` (`ed4c4b9b-b6b3-41ad-8764-aad854046841`) — **orphaned auth user, 0
  memberships.** The invited-couple fixture.
- Timeline owners on Dom & Jordyn (post TL-04 setup): includes `DJ`, `Officiant`, `DJ, Officiant`,
  `Hair lady`, `Photographer, Videographer`, plus nulls — combined strings must remain at rest.

---

## 14. Roadmap

**Done (v1–v15):** unified shell + routing; shared primitives; timeline; couple onboarding → AI plan;
AI assistant; Contracts; lead pipeline; proposals → printable contract; Stripe billing; website
builder + 5-template gallery; public RSVP; assistant QA; seating through SEAT-10; polish pass;
signup + plan-generation repair (ONB-00 **0027**, ONB-01); Soft stack chrome (v11); landing overhaul.

**Done (v16–v18 — planner invites couples):** INV-01 (**0028**), INV-03, INV-04 (**0029**), INV-05,
INV-02. INV-06 deliberately not built.

**Done (v19 — vendor category, status, and removal):**
- **VND-04** — Migration **0030**. `vendors.category` label→id backfill;
  `project_vendors_project_vendor_key`; status default `'to_contact'`; status CHECK (without
  `replied` yet).
- **VND-05** — No schema. Category picker, booked-at-add, `removeProjectVendor`, soft dup warning.
- **VND-05a** — No schema. Five category read sites routed through `vendorCategoryLabel`, prompt
  sites resolved at the call site.

**Done (v20 — booked slots, outreach in-flight, multi-owner run sheets):**
- **VND-05b** — No schema. Remove affordance legibility. **Confirmed shipped.**
- **VND-06** — Migration **0031**. Slot FK on `vendor_targets`; link-requires-booked CHECK;
  `replied` added to `project_vendors` status CHECK; `vendors.address`.
- **VND-06a** — No schema. Outreach = in-flight only; Decline as exit; declined group.
- **TL-04** — No schema. Owner comma-SET at read (`lib/timeline-owners.ts`).

**Done (v21 — one vendor, many slots + many budget lines):**
- **BUD-04** — Migration **0032**. Drop `budget_items_project_vendor_uidx`; package variance UI;
  soft multi-link warning. **Applied live.**
- **VND-07** — No schema. Multi-slot package via shared `project_vendor_id`; Connect existing;
  package cards; unlink leaves booked-empty; remove resets all N slots.
- **VND-07a** — No schema. Card legibility (no PACKAGE eyebrow; full names; chips; recessed empty
  wells); project-wide soft dup with connect-primary.
- **VND-07b** — No schema. Chips always when ≥1 linked category.

**Done (v22 — seating dance floor):**
- **SEAT-11** — Migration **0033**. `kind = 'dancefloor'` + `seat_count = 0`; placeable dashed
  floor marker; no assignment. **Applied live.**

**Done (v23 — gift registry):**
- **REG-01** — Migration **0034**. `registry_items`; couple Registry tab; writes on
  `can_edit_project`.
- **REG-01a** — No schema. Paste-a-link OG/JSON-LD prefill; never blocks manual add.
- **REG-02** — Migration **0035**. Public `/w/[slug]/registry`; anon item read when published;
  `external_registry_links` on `wedding_websites`.
- **REG-03** — Migration **0036**. `registry_claims` anon INSERT-only; couple override;
  `registry_item_availability` aggregates.

**Done (v24 — meals + RSVP reconciliation):**
- **REG-04** — Migration **0037**. Legacy `content.registry.links` → `external_registry_links`.
- **MEAL-01** — Migration **0038**. `meal_options` + `meal_service_style`; couple Catering card;
  anon meal_options read when published.
- **MEAL-02** — Migration **0039**. `rsvp_attendees` + `submit_rsvp`; adaptive public form; drop
  direct anon RSVP INSERT.
- **MEAL-03** — Migration **0040**. `guest_members` + `matched_guest_id`; match/promote;
  caterer tally; `meal_choice` inert (drop deferred to MEAL-03a / 0045+).
- **RSVP-01** — Migration **0041**. Household-gated RSVP (`rsvp_token`, `rsvp_access_mode`,
  `lookup_rsvp_household`, gated `submit_rsvp` pointer-only).

**Done (v25 — photo-led website + RSVP full-name + guest polish):**
- **WEB-IMG-01** — Migration **0042**. Public `website-media` bucket; hero `imageUrl`; WRITE-01
  storage exemplar; no published gate on object SELECT.
- **WEB-LAYOUT** — No schema. Shared section vocabulary + Gallery / Party / FAQ + structured
  travel places; five templates on `SectionStack` / `HeroPhotoBackdrop` / `OverlayNav`.
- **WEB-EDITOR** — No schema. LookStep + hero/gallery/party/FAQ/travel authoring + reorder.
- **RSVP-01a** — Migration **0043**. Gated lookup matches normalized full name.
- **GST-01** — No schema. Add-guest additional names; attending checkbox persists.

**Done (v26 — collaborator invites + create fix + marketing pricing):**
- **INV-07** — No schema. Access invites `collaborator` via existing `project_invitations.role`;
  writer allowlist `{couple, collaborator}`; same `/invite/[token]` path. **`viewer` still blocked.**
  Non-async exports live in `lib/invitations/{constants,types}.ts`.
- **CREATE-01** — No schema. Planner New wedding create without INSERT…RETURNING; explicit
  business-account resolve; form error surfacing.
- **LAND-02** — No schema. Marketing topbar anchors + capabilities checklist.
- **PRICE-01** — No schema. `/pricing` presentation (Stripe objects → PRICE-02).

**Done (v27 — archive + invite cookie + landing toggle + checklist hygiene):**
- **ARCH-01** — Migration **0044**. `projects.archived_at` + `set_project_archived`; planner
  Active/Archived UI; sidebar filters active only.
- **ARCH-01a** — No schema. Dashboard child aggregates scoped to active project IDs.
- **INV-08** — No schema. Pending-invite cookie set in middleware (closes Next 16 render crash).
- **LAND-03** — No schema. Couples/Planners audience toggle + unify band; marketing copy policy
  (no leading "AI").
- **CHK-02** — No schema. Per-task hard delete + row trash.
- **CHK-03** — No schema. Assistant `add_task` clamps due date and derives canonical phase;
  shared `clampDueDateToToday` on all three `tasks` writers (plan, starter checklist, assistant).
- **INV-02b** — No schema. Has access = live `project_members`; remove soft-revokes invites.

Current through **0044**; next-free **0045** (MEAL-03a drop preferred; ONB-02 may take it — see
header numbering note).

**In progress:** Dom Soft stack + LAND-01 live visual checkpoint (human). Not a Cursor slice.
Dom apply + checkpoint REG + MEAL + RSVP + WEB + ARCH migrations (**0034–0044**) if not yet pasted.
Dom INV-07 live checkpoint (collaborator `project_members.role` row). Dom ARCH-01 archive round trip.

**Remaining couple side:** moodboard; optional seating depth (per-seat UI / SEAT-07); **MEAL-03a
(0045+ — drop `guests.meal_choice`)** after backfill verification; **ONB-02 (next-free /
0045+)**; **BUD-03 (pre-launch)**; optional website-media orphan GC.

**Remaining planner side:** invoicing accepted proposals; deeper CRM; INV-06 (email delivery);
**`viewer` invite (after WRITE-01)**; PRICE-02 (Stripe Price objects + checkout for pricing CTAs).

**Phase 4 — bridge:** lead→project conversion. **Re-audit every write policy when this ships.**

**Phase 5 — automation:** PROACTIVE assistant.

**Decided:**
- AI = Claude (`claude-sonnet-4-6`). Outreach = couple's Gmail. Payments = Stripe (flat monthly).
  Website = curated template gallery via dispatcher. Prod = separate Supabase org on Pro.
- Seating = SVG pointer interactions; not @dnd-kit. Rotation step = **45°**. SEAT-06 deferred.
  **Dance floors live on `seating_tables` as `kind = 'dancefloor'` with `seat_count = 0` (SEAT-11 /
  0033)** — not a separate floor-elements table; not assignable. **Seating stays per `guests.id`
  (not `guest_members`).**
- **Budget: Allocated is items-only; quote money never enters a headline figure.** No pie/donut.
  **One `project_vendor` may link many `budget_items` (BUD-04 / 0032)**; variance is quote vs sum
  of linked planned (derived at read). Still at most one vendor per budget item.
- **Chrome = Soft stack (C1).** Do not reopen Modern romantic. Tier 3 websites stay on `--ws-*`.
- **Public wedding long dates = shared `formatWeddingDate`, locale `en-US`.**
- **Signup creates NO tenant.** Bootstrap once on OnboardingForm, guarded in DB (0027).
- **Invited members (couple or collaborator) get project membership and NO account of their own.**
  Per-wedding only — not whole-book seats.
- **No planner-set passwords. No service-role user creation. No anon read on invitations.**
- **Invitation tokens are hashed at rest and shown exactly once.**
- **Access may invite `couple` and `collaborator` only (INV-07).** `viewer` stays off the UI until
  WRITE-01.
- **`viewer` cannot edit PROJECTS** (0029) — but see WRITE-01 for every other table.
- **`projects.account_id` is immutable** (trigger).
- **`projects.archived_at` is written ONLY via `set_project_archived`** (ARCH-01) — owning-account
  only; reversible; not a delete.
- **`vendors.category` stores canonical ids.** Labels are a display concern, resolved via
  `vendorCategoryLabel` at the read site or call site — never stored.
- **`vendors` is account-scoped; "remove vendor" always means remove the `project_vendors` link.**
  A vendors-row delete is not exposed anywhere and should not be added casually.
- **Near-duplicate vendors are a soft UI warning, never a constraint.** Cleanup is deletion.
  **Match is project-wide (VND-07a), not same-category.** Primary soft remedy is connect-to-slot
  via `linkVendorToTarget`; Add anyway remains.
- **A booked category slot may own a `project_vendors` row via `vendor_targets.project_vendor_id`
  (0031).** Linking requires `status = 'booked'` on the target. **One `project_vendor` may own many
  slots (VND-07)** — that shared FK is the package; no junction table.
- **Unlink clears the link and leaves the slot booked; remove clears all matching links and sets
  those slots to needed (VND-07).**
- **Outreach lists in-flight statuses only** (`to_contact | contacted | replied`). Declined is an
  exit; booked lives in the Booked band.
- **`timeline_events.owner` is free text at rest and a comma-separated SET at read (TL-04).**
  `lib/timeline-owners.ts` is the sole parser. Owner/section are deliberately free-text — do not
  enum them.
- **Every writer of `tasks` derives `phase` (never authors it) and floors computed `due_date` via
  `clampDueDateToToday` (CHK-03).** The free-text `tasks.phase` column and any tool schema are NOT
  authoring surfaces. Applies to onboarding plan, starter checklist, assistant, and any future
  writer (e.g. Phase-4 lead conversion).
- **ONB-02 takes next-free migration at build time (0045+)** (`commitPlan` atomicity +
  `vendor_targets.category` / `vendors.category` CHECK decision). **BUD-03** takes next-free after
  that (or concurrent if no schema conflict). Coordinate with **MEAL-03a** if both need a number.
- **Registry price is display-only** — never feeds budget headlines or `lib/budget-aggregates.ts`.
- **Registry claim names never reach anon** — availability is aggregate-only via
  `registry_item_availability`.
- **RSVP public write is `submit_rsvp` only** — never restore direct anon INSERT on
  `rsvp_submissions`.
- **`guests.party_size` is the invited cap**; attending headcount for catering =
  attending `guest_members`. Never derive/overwrite the cap from members.
- **Anon→guest-list promotion is couple-only** via `matchSubmissionToGuest` (idempotent).
- **Website photos are in-product** via public `website-media` + content jsonb URLs (WEB-IMG-01).
  Public object read has **no published gate** — deliberate. Clear/remove does not delete storage
  objects (orphan GC deferred).
- **Gated RSVP name search is exact full-name** after normalize (RSVP-01a) — not fuzzy, not
  last-name, not prefix.
- **Marketing pricing copy is presentation-first (PRICE-01).** Live Stripe Prices / trial checkout
  are PRICE-02 — do not invent Price IDs in the marketing page.
- **Marketing copy must not lead with "AI"** (LAND-03) — frame as the app / automatically / the
  assistant.
- **Pending-invite cookie is set in middleware**, never during InvitePage render (INV-08).
- **A value with a canonical vocabulary/derivation is enforced at the write boundary on EVERY writer
  (form, action, or assistant tool); a free-text column, a CHECK-less column, or a model-supplied
  tool arg is not a license to author it. Where the app's column is deliberately free-text, the
  assistant matching that is correct, not a gap** (§3 / §9 audit).

---

## 15. Start here next (pick-up point)

The couple product is feature-complete, shareable, payable, shareable with a planner's couples **and
collaborators**, and maintains booked slots (including **venue packages** — one vendor, many
categories) + many budget lines per vendor (BUD-04) + an in-flight outreach pipeline + multi-owner
run sheets + seating dance floors (SEAT-11) + a **gift registry** (couple manage → public page →
guest claims) + **meal-aware RSVP with guest-member reconciliation** + **guest-gated RSVP
(RSVP-01 / 01a)** + a **photo-led wedding website** (hero / gallery / party / FAQ / structured
travel) + marketing **`/pricing`** + planner **wedding archive**. Plan is **couples-first launch**.
Bible is at **v27**. Schema through **0044**; next-free **0045**.

**Do not resume a Modern romantic / VND-01 layout polish pass.** Vendors chrome is Soft-stacked.
**Do not reintroduce category eyebrows or a `PACKAGE` label on Booked cards** (VND-07a). **Do not
suppress single-category chips** (VND-07b).
**Do not store a registry claim counter column** — derive from `registry_item_availability`.
**Do not add anon SELECT on `registry_claims` / `rsvp_attendees` / `guest_members` / `guests`.**
**Do not restore anon INSERT on `rsvp_submissions`.**
**Do not drop `guests.meal_choice` until MEAL-03a after live backfill verification.**
**Do not auto-match RSVPs to guests** (gated token → `matched_guest_id` is asserted, not inferred).
**Do not put Supabase imports inside `components/website/`.**
**Do not add a published gate to `website-media` SELECT without a deliberate product decision.**
**Do not pull @dnd-kit into the website editor** for gallery reorder (up/down is fine).
**Do not offer `viewer` from Access until WRITE-01.** Collaborator invites are INV-07 — done.
**Do not fork a second invitation mechanism** for roles — extend `createProjectInvitation` only.
**Do not wire PRICE-01 CTAs to invented Stripe Price IDs** — that is PRICE-02.
**Do not lead marketing copy with "AI."**
**Do not write `archived_at` except via `set_project_archived`.**
**Do not let any writer author free-text task phases or unclamped due dates** — derive phase, floor
the date (§3 / CHK-03), on every `tasks` writer.
**Do not harden `budget_items.category` or `timeline_events.owner`/`section` to enums** — free-text
is deliberate.
**Do not set the pending-invite cookie from InvitePage render** — middleware only (INV-08).

**A. Dom Soft stack + LAND-01 / LAND-01a live visual checkpoint (still open).**
Walk couple tabs (Overview, Checklist, Budget, Timeline, Vendors, Guests, **Registry**, Seating,
Website editor, Notes), planner dashboard/leads/billing/Access, landing, **`/pricing`**, login,
`/invite/[token]`, and public `/w/[slug]` (+ `/registry`, `/rsvp`). Confirm no hydration mismatch
(watch countdown days). Fix only real regressions.
On Vendors, spot-check: package card (full name + chips), single-chip vendors, recessed empty-slot
wells, soft-dup connect. On Budget, spot-check multi-line package variance (BUD-04). On Guests,
spot-check Catering card, member expand, match control, caterer tally, gated QR + full-name copy.
On Website, spot-check LookStep, hero photo, gallery/party/FAQ, all five templates + palette switch.
On Access, spot-check couple vs collaborator invite cards + role pills; Remove drops Has access.
On Checklist, spot-check row delete (CHK-02) and canonical phase bands (no duplicate lower/title-case
bands; earliest tasks floored to today, tail spread — CHK-03).
On Dashboard, spot-check archive / unarchive + Urgent excluding archived (ARCH-01/01a).
On Landing, spot-check Couples/Planners toggle (LAND-03).

**A2. Invite Jordyn for real.** The honest end-to-end test, and the first time the design
collaborator sees her own view. Prefer an **INV-07 collaborator** invite on a planner project;
confirm `project_members.role = 'collaborator'` in SQL after accept.

**A3 (optional). TL-04 live checkpoint** on Dom & Jordyn if not already run — DJ / Officiant sheets
both include the shared event; `group by owner` proves strings unchanged at rest.

**A4. Apply + checkpoint REG + MEAL + RSVP + WEB + ARCH (0034–0044)** if not yet live. Without
**0040**, Guests → Add person fails with `PGRST205`. Without **0042**, hero/gallery uploads fail.
Without **0043**, gated full-name search still expects the old last-name RPC. Without **0044**,
archive UI will error on the RPC. Run Dom discriminators from the v25/v27 headers (plus v24
MEAL/RSVP discriminators for 0037–0041).

**A5. MEAL-03a — drop `guests.meal_choice`. Migration 0045+ (after A4 backfill verification).**
Confirm `count(guests where meal_choice is not null)` matched the backfill; grep confirms zero app
reads/writes; then drop the column. Do not fold into 0040.

**B. ONB-02 — `commitPlan` atomicity + category CHECKs. Migration next-free (0045+).**
Three sequential non-atomic inserts (tasks, budget_items, vendor_targets) with no transaction: a
failure on insert #2 leaves tasks, no budget, and `onboarded_at` unstamped. v10 proved onboarding is
where this product breaks. **Also owns the category-constraint decision** — apply it to
`vendor_targets.category` and `vendors.category` together against one canonical list, or decide
deliberately not to and record why. (After the v27 audit this is the only canonical value still
lacking a DB-level CHECK.)

**C. BUD-03 — budget payments + deadlines. DEFERRED BY CHOICE, BUT PRE-LAUNCH.**

**Why a `due_date` column is the WRONG model (settled — don't relitigate):** a deadline on an item
with a partial `actual_amount` cannot say whether the item is handled. Payments can:
"Balance · $16,000 · due Friday · unpaid" — and disappear when marked paid.

**The model:** `budget_payments` — child table, project-scoped, `budget_item_id` FK, `amount`,
`due_date`, `paid_at` nullable, `label`. Then `spent` = sum of paid, `committed` = planned − paid,
Upcoming box from `due_date where paid_at is null`.

**Step 0 decision:** derive-and-backfill `actual_amount` from paid payments (refuse dual sources of
truth). Report how many rows and every read site of `actual_amount`.

**Why pre-launch:** backfill is cheap now; post-launch it's a production money migration.

**UI:** separate **"Upcoming"** rail card ABOVE "Needs attention". Date math server-side via
`lib/date-months.ts`.

**D. WRITE-01 — project-scoped write policy audit. DO THIS BEFORE ANY `viewer` INVITE SHIPS.**
`can_edit_project` (0029) now gates projects UPDATE plus registry / meal_options / guest_members /
**website-media** exemplars. Every other project-scoped table still gates writes on
`can_access_project`, which a `viewer` passes — including `removeProjectVendor` (cascades outreach
history) and `deleteTask` (hard-deletes a task). Enumerate every project-scoped table, decide per
table whether the gate should be `can_access_project` (read-alike) or `can_edit_project` (write), and
migrate the ones that should change in one pass. **Collaborator invites (INV-07) are intentional
editors** and already pass `can_edit_project`. Unreached `viewer` writes remain the hazard.
**Sequence this before offering `viewer` from Access, and re-run it after Phase-4 conversion.**

**E. Launch (after ONB-02 + BUD-03 + visual QA).**
Follow the **Launch Prep Runbook**: separate prod Supabase org on Pro + migrations **0001–0044**
(+ 0045 if MEAL-03a shipped) by hand — **never `db push`** + storage (`project-files` +
`website-media`) + SMTP; Vercel + domain + env; Stripe live + webhook + Portal + Tax; prod Places
key; Gmail stays testing mode; privacy + ToS; monitoring; **full prod smoke — including real
signup, deliberate double-click, a real couple **and** collaborator invitation round trip, planner
New wedding create (CREATE-01), archive/unarchive (ARCH-01), a vendor add/remove + multi-slot
package link cycle (VND-07), multi-line budget vendor links (BUD-04), a seating dance-floor
place/move/delete (SEAT-11), a plated RSVP + match-to-guest cycle (MEAL), a gated QR + full-name
RSVP cycle (RSVP-01/01a), a hero/gallery upload + five-template public render (WEB), checklist
delete (CHK-02), an assistant-built checklist (canonical phases, no past dates — CHK-03), and a
registry claim.**

**F. Planner depth / revenue (after launch, or sooner if planner-led).**
- Invoicing accepted proposals (recommended first post-launch).
- INV-06 email delivery.
- **`viewer` invite** — **gated on WRITE-01** (collaborator already shipped in INV-07).
- PRICE-02 — Stripe Prices + checkout for `/pricing` CTAs (incl. $7 trial → $99).
- Lead→project conversion (Phase 4) — **re-audit write policies**.

**G. Seating — remaining (OPTIONAL).** SEAT-08/09/10/11 DONE. SEAT-06 deferred by choice.
**SEAT-07** assistant seating mock-up: no new schema. Per-member seating (seat `guest_members`) is
a separate future slice — do not sneak it into polish.

**H (other rounding-out):** moodboard; assistant tools for leads/proposals/RSVP/seating/
invitations (re-run the §9 write-tool canonical audit when any ship); per-seat assignment UI;
`projects` DELETE policy decision; personal-user-with-direct-project visibility; website caching;
website-media orphan GC; checklist Other/Unscheduled bucket polish; orphaned-vendor handling /
account vendor library; currency-helper consolidation; regenerate `reference.html` / delete
`theme-direction.html` / retire CSS aliases; font-load scoping; optional empty-state copy on empty
booked slots when no vendors exist to connect; countdown hydration harden.

**Recommended path:** **apply/checkpoint REG+MEAL+RSVP+WEB+ARCH (A4)** → **visual checkpoint + invite
Jordyn as collaborator (A/A2)** → **MEAL-03a (A5)** → **ONB-02 / 0045+ (B)** → **BUD-03 (C)** →
**Launch (E)** → WRITE-01 before `viewer` (D) → invoicing → INV-06 / PRICE-02 → conversion (F) →
remaining H.