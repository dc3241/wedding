# Wedding Planning SaaS — Project Bible (v29)

Canonical state document. **Supersedes v28.** Drop this into the Project's instructions/knowledge so
any new chat picks up cold. Lives in-repo at `PROJECT_BIBLE_v29.md`. The repo's `.cursor/design.mdc`,
`app/globals.css`, `design/reference.html` (stale — see §10), and `supabase/migrations/` remain the
live source of truth; this summarizes them and the decisions behind them. Current through migration
**0052**; **next-free migration is 0053**.

**v29 records the budget item money-tracking arc — the Budget page is now feature-complete.** Per-item
Estimate / Actual / Difference / Paid / Due-date model with a payment ledger (BUD-03 / 0051), a card
filter bar (BUD-FILTER-01), curated quick-add with multi-select (BUD-QUICKADD-01 / 02), per-item notes
(BUD-NOTES-01), and a dated payment schedule with waterfall past-due (BUD-SCHED-01 / 0052) — atop v28:

| Slice | What | Schema |
|---|---|---|
| **BUD-03** | Per-item money model: **Estimate** (`planned_amount`) · **Actual** (`actual_amount`, relabelled, now = cost not spent) · **Difference** (derived, sage/rosewood) · **Paid** (Σ ledger, derived) · **Due date**. New `budget_payments` ledger. Read rewire: `paidTotal = Σ payments`; `committed = planned-but-not-yet-paid`. | **0051** |
| **Row polish** | 5-column grid fix; optional due date on Add form; Difference suppressed to `—` when Actual absent | **NONE** |
| **BUD-FILTER-01** | Card filter bar: Status (All · Unpaid · Paid in full · Past due) + Category, ANDed; unpriced items match no status bucket; headline stays global | **NONE** |
| **BUD-QUICKADD-01 / 02** | Quick add curated categories → new empty **cards** (`planned_amount = 0`); multi-select checkbox menu + bulk insert; duplicates allowed | **NONE** |
| **BUD-NOTES-01** | Per-item free-text Notes surfaced from the existing `budget_items.notes` column | **NONE** |
| **BUD-SCHED-01** | `payment_schedule` — dated installments per item; **waterfall** past-due (ledger covers installments by date); `due_date` backfilled → "Balance" installment, then write-dead (drop in 0053+) | **0052** |

Everything in v28 that isn't touched by the above carries forward unchanged: DASH-01, VND-08/08a,
CAL-01, CON-01/01a/02, ARCH-01/01a, INV-08, LAND-03, CHK-02/03, INV-02b, and everything they carried
from v27 and earlier.

> **Numbering note:** **0051 is `budget_payments` (BUD-03), 0052 is `payment_schedule`
> (BUD-SCHED-01).** During BUD-03 Step 0 we discovered **0048 `budget_label_optional`,
> 0049 `budget_alert_dismissals`, 0050 `registry_teardown`** already on disk and applied — the v28
> bible never recorded them; §5 now does (see the factual-completeness note there). **MEAL-03a (drop
> `guests.meal_choice`), ONB-02, and the `budget_items.due_date` drop all take next-free at build time
> (0053+).** Do not `db push`. **Do not offer `viewer` from Access** until WRITE-01.
> **CON-03** (real PDF bytes) remains **DEFERRED by choice** — same posture as INV-06.
> **Marketing copy policy:** do not promote or lead with "AI"; frame as the app / "automatically" /
> "the assistant."

**Verification status (READ THIS):**
- **0031–0047** remain applied live (as recorded through v28).
- **0048 / 0049 / 0050** — applied live (discovered during BUD-03 Step 0; DDL not authored in this
  session — see §5 factual-completeness note).
- **0051 (BUD-03), 0052 (BUD-SCHED-01)** — **APPLIED LIVE + verified this cycle.**
  - **0051:** `budget_payments` present; composite FK `(project_id, budget_item_id) →
    budget_items(project_id, id)` ON DELETE CASCADE; **kill-shot** — an item with `actual_amount` set
    and **zero** payments shows **Paid $0** (Paid derives from the ledger, not `actual_amount`); ledger
    add/remove moves the "paid so far" headline by the payment sum, never by Actual; Difference shows
    `—` when Actual is null and the real ± (sage/rosewood) once Actual is set.
  - **0052:** `payment_schedule` present; **waterfall kill-shot** — item Actual $5,000 with Deposit
    $2,500 due *yesterday* + Balance $2,500 due *next month*, log a $2,500 payment → item is **NOT**
    past due (deposit covered, next-owed is the future balance); **delete** the payment → item **IS**
    past due. Backfilled `due_date` → a "Balance" installment; `due_date` is write-dead (app no longer
    writes it).
- **BUD-FILTER-01 / QUICKADD-01/02 / NOTES-01 / row polish:** no schema; verified live (filter ANDs
  status × category and never rewrites the headline; a 0-planned quick-add card is invisible to every
  headline sum; notes persist per row).
- **Still open (human gate):** Dom Soft stack + LAND-01 / LAND-01a visual checkpoint — `/vendors`,
  `/calendar`, `/contracts` from v28 plus the **rebuilt Budget page**. See §13.

Sections changed from v28: header, **§3** (budget principles), **§5** (0048–0052), **§6** (Budget tab),
**§7** (v29 budget arc), **§9** (budget-tool audit note), **§10** (budget design), **§12**, **§13**,
**§14**, **§15**.

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

**As of v18 there is a THIRD class of user: the invited project member** (originally couple-only;
**v26 / INV-07 also issues `collaborator`**). A planner invites by email; the invitee gets a
`project_members` row on ONE project and **no account of their own** — no `accounts` row, no
`account_members` row. They see that project and nothing else in the planner's book — no CRM tabs.
This is the Aisle Planner model and it is what `can_access_project`'s "OR direct project member"
branch was designed for in 0001. **Not** account-level seats / `account_invitations`. See §4.

The app spans: the couple planning product (onboarding → AI plan, checklist, vendors, guests with
per-person meal members + RSVP→guest match + optional household-gated RSVP, **budget with a per-item
Estimate/Actual/Difference/Paid model, a payment ledger, a dated payment schedule, and filterable
cards**, notes, files, day-of timeline, gift registry with public share + guest claims, in-app AI
assistant, seating builder), a planner CRM (contracts, lead pipeline, proposals → accepted agreement →
printable contract, project access / couple + collaborator invitations, archive finished weddings off
the active book, an account-level Vendor library, an authorable Calendar, and a cross-project Contracts
archive with reusable contract templates), Stripe billing for both audiences, marketing `/` +
`/pricing` (audience toggle + capabilities + pricing cards), and a public, shareable wedding website
with a 5-template photo-led gallery (hero / gallery / party media, FAQ, structured travel), adaptive
meal-aware RSVP intake (open or gated), and a registry sub-page.

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
- **No PDF-generation dependency (deliberate).** Every "printable" surface — CRM contract, run-sheet,
  and contract-template fill (CON-02) — is HTML + `@media print` + `window.print()`. Adding a PDF lib
  is a deferred decision (CON-03); see §7 / §13.
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
  library) are ACCOUNT-scoped** via `is_account_member(account_id)` — NO `project_id`, NO
  `can_access_project`. (RSVP submissions, seating, invitations, **the budget ledger
  `budget_payments`, and the `payment_schedule`** are project-scoped.)
- **`vendors` is ACCOUNT-scoped; `project_vendors` is the project-scoped LINK.** One vendor row can
  serve many projects in the same account. Every vendor UI action that says "remove" means **remove
  the link**, never the vendor. See §7 VND-05. The account Vendor library (VND-08) is the one surface
  that adds a `vendors` row with NO `project_vendors` link, and the one place a `vendors` row may be
  deleted — and only when it has zero links.
- **Resolve the BUSINESS account explicitly** (`accounts.kind = 'business'` inner join), never naive
  first-membership. Couples resolve the `personal` account. Helpers in `lib/billing/resolve-account.ts`
  (`resolveBusinessAccountId`) — used by the vendor library, calendar, contracts, and billing.
- **CHECK-constrain status enums.** EXCEPTION: Stripe-owned vocabularies aren't constrained.
  `project_vendors.status` is constrained (0030, widened 0031 to include `replied`);
  `calendar_events.event_kind` is constrained (0045). Remaining gap: the four category columns — §13.
- **Billing source of truth = the webhook-updated `subscriptions` row.**
- **Self-contained snapshot for public surfaces.** Public-rendered content stores its displayed data
  on its own row — never joins live into private tables.
- **Service-role key is server-only and rare.** ONLY the Stripe webhook + billing/admin path.
- **Anon READ = one published-only RLS policy + the anon key.**
- **Anon WRITE = tightly-scoped INSERT-only RLS (or a definer RPC) + server-derived scope.** Public
  writes are RSVP (`submit_rsvp` RPC) and registry claims (INSERT). **There are exactly SIX anon
  surfaces** (three reads + one INSERT + two RPC executes) — see §4. **v29 adds NO anon surfaces**
  (the budget ledger/schedule are authenticated-only, project-scoped).
- **Discrete writes over client-authoritative state.** Every mutation writes by id +
  `revalidatePath`. `useOptimistic` is the sanctioned in-pattern fallback.
- **Keep public/reusable UI pure via prop injection.** `components/website/` imports NO Supabase/auth/
  server-only modules.
- **Structural enforcement beats action enforcement when it's cheap.** Exemplars: BUD-02's composite
  FK; ONB-00's `already_bootstrapped` guard; 0028's partial unique index; 0029's
  `projects_account_id_immutable` trigger; 0030's `(project_id, vendor_id)` unique index; 0031's
  composite FK on `vendor_targets`; 0045's `calendar_events` composite FK; **0051's `budget_payments`
  composite FK `(project_id, budget_item_id) → budget_items(project_id, id)` ON DELETE CASCADE (via the
  new unique index `budget_items (project_id, id)`), and 0052's identical composite FK on
  `payment_schedule` — a ledger row or an installment can only reference a budget item in its OWN
  project.** Contrast seating occupancy, which remains action-enforced.
- **NEW (v19) — structural enforcement can only act on a SHARED KEY. Say so out loud when it can't.**
  Near-duplicate vendors are a soft UI-warning problem; the cleanup tool is deletion, not
  deduplication. Don't promise a constraint that can't exist.
- **A dedicated action owns an integrity obligation.** Don't extend a generic `update<Thing>(id,
  fields)` writer with a field that carries a constraint the generic writer doesn't understand.
  `setSeatingTableKind`, `rotateSeatingTable`, `setSeatingTableSeatCount`,
  `setBudgetItemProjectVendor`, `removeProjectVendor`, `linkVendorToTarget` /
  `unlinkVendorFromTarget`, `set_project_archived`, `deleteAccountVendor` / `createAccountVendor`
  (VND-08) all exist for this reason. **NEW (v29): the budget ledger and schedule get their own
  dedicated writers — `addBudgetPayment` / `removeBudgetPayment` (0051), `addScheduleInstallment` /
  `removeScheduleInstallment` (0052), and `addBudgetItemsBulk` (quick add). `updateBudgetItem` writes
  `notes` and (post-0052) NO LONGER writes `due_date`.**
- **One terminal routing decision point per audience (ONB-00).** `/projects` is the ONLY place
  allowed to make a terminal routing decision for a personal or account-less account.
- **Two fields that can disagree are a bug waiting to happen; derive one from the other (ONB-01).**
- **A missing RLS policy on a writable table is a SILENT NO-OP that returns success, not an error
  (v18).** Every time a new class of user gains READ access to a table, audit every WRITE policy on
  that table for whether the new class passes it. **This audit is still outstanding for every
  project-scoped table other than `projects`** — now including `budget_payments` and
  `payment_schedule` — see §13 and the WRITE-01 note in §15.
- **NEW (v19) — one concept must have ONE stored vocabulary, and the write path is where it's
  enforced.** (`vendors.category` normalized to ids in 0030 + VND-05.) v28 corollary: `files.category`
  and `contract_templates.category` also store canonical `VENDOR_CATEGORIES` ids (NO DB CHECK). Four
  columns share this posture; ONB-02 owns the single CHECK-or-not decision. **v29 corollary: the
  quick-add curated category list (`lib/budget-quick-categories.ts`) is a STANDALONE UI-suggestion
  constant — deliberately NOT imported from / wired to `VENDOR_CATEGORIES`, and carries NO CHECK.
  `budget_items.category` is protected free-text (see below); a convenience picklist is not a
  vocabulary and must never be "unified" with the vendor-category ids.**
- **NEW (v19) — resolve display vocabulary AT THE CALL SITE, not inside the consuming lib.**
- **NEW (v20) — free-text-at-rest can still be a SET at read, but ONE parser owns the split.**
  `timeline_events.owner` stays free text; `lib/timeline-owners.ts` is the only parser.
- **NEW (v25) — website photos live as public URLs in `content` jsonb, not as `files` rows.**
- **NEW (v27) — a value with a canonical vocabulary or derivation must be enforced at the WRITE
  BOUNDARY, on EVERY writer.** Task `phase`, computed task `due_date`, status enums, vendor category
  all have a canonical source. A free-text / CHECK-less / model-supplied column is NOT a license to
  author the value. **Corollary (v27 audit): where the app's column is DELIBERATELY free-text, the
  assistant matching that is CORRECT, not a gap** — `budget_items.category` and
  `timeline_events.owner`/`section` are authored free on purpose; do NOT harden to enums.
- **NEW (v28) — operational views are active-scoped; repository views span archived.** Dashboard
  aggregates, sidebar, Active count, Calendar overlay filter to `archived_at is null`. The **Contracts
  archive (CON-01) deliberately does NOT** — a records repository retains a wedding's paperwork after
  it closes.
- **NEW (v29) — Paid is derived ONLY from the `budget_payments` ledger; never from `actual_amount`.**
  This is the budget's central dual-source guardrail. `actual_amount` means **Actual** (the item's
  contracted/negotiated cost); Paid means **money handed over** (Σ ledger). They answer different
  questions and must never be conflated — same discipline as guest `rsvp_status` (badge) vs per-member
  `attending`, or budget **Difference** (Estimate − Actual, a planning signal) vs **Paid** (a cashflow
  signal). Wiring `Paid = actual_amount` is the exact bug the kill-shot catches (an item with a cost
  but no logged payment must read Paid $0).
- **NEW (v29) — installment coverage is DERIVED AT READ via the waterfall, not stored.** The
  `payment_schedule` (owed timeline) and `budget_payments` (paid) are **independent axes**. An
  installment is "covered" when the running total of ledger payments, poured down installments sorted
  by `due_on`, reaches it. The **next-owed** installment is the first uncovered one; an item is **past
  due** when a next-owed installment exists and its `due_on < today` (local date, strict `<`). There is
  NO stored per-installment paid flag and NO matching table — reconciliation is read-time only. This
  is what prevents the naive single-cliff false-alarm (paying a deposit on time must not flag the whole
  item past due while the balance isn't yet owed). The reconciled variant (per-installment checkmarks
  linked to specific payments) is a deferred follow-on, NOT this model.
- **NEW (v29) — the "paid so far" headline and the Needs-attention panel are GLOBAL operational
  readouts; per-card filters never rewrite them.** The budget filter bar narrows only the card grid. A
  filter that silently recomputed the headline against the visible subset would make the page
  contradict itself (the same failure class as the over-plan panel firing while a per-item signal is
  hidden).
- **NEW (v29) — additive-then-destructive for money-column reinterpretation.** When a money column's
  meaning moves to a new source, ADD the new source, rewire reads, prove parity on live data, THEN
  drop the old column in a later migration — never in one shot. Exemplars: BUD-03 kept `actual_amount`
  (reinterpreted as Actual, no backfill — backfilling it into the ledger would double-count the same
  money as both Actual and Paid); BUD-SCHED-01 kept `budget_items.due_date` (backfilled into a
  "Balance" installment, then write-dead; **drop in 0053+ only after parity**, tracked like
  `guests.meal_choice`).

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
`project_members.role` — see §6. **`viewer` exists on the enum but is not issued by Access (INV-07
allowlist); do not offer it until WRITE-01.**

### `project_invitations` (0028; INV-07 uses existing `role`)

- `project_id`, `email`, **`role project_role NOT NULL DEFAULT 'couple'`**, `token_hash` (sha256 hex),
  `invited_by`, `expires_at`, `accepted_at` / `accepted_by`, `revoked_at`, `created_at`
- Partial unique: one live invite per `(project_id, lower(email))`
- Policies: all four gated by `can_manage_project_access`
- **`accept_project_invitation` inserts `project_members.role` from `v_inv.role`** (never hardcodes).
- **Sole app writer:** `createProjectInvitation(projectId, email, role)` — allowlist
  `{couple, collaborator}`; rejects `viewer`.

### `project_members` (0001)

- `project_id` uuid NOT NULL FK→projects cascade; `user_id` uuid NOT NULL FK→`auth.users` cascade
- `role` **`project_role` enum NOT NULL default `'couple'`** — `couple | collaborator | viewer`
- `created_at` timestamptz NOT NULL default now()
- **PK is composite `(project_id, user_id)`. There is no `id` column.**
- Policies: SELECT `can_access_project(project_id)` (0001); DELETE
  `can_manage_project_access(project_id)` (0028). NO INSERT/UPDATE policy —
  `accept_project_invitation` is the only writer.

> **The `project_members` SELECT policy is recursive BY SHAPE ONLY and is SAFE. Do not re-flag it,
> and do not narrow it.** `can_access_project` is SECURITY DEFINER owned by `postgres`
> (`rolbypassrls = true`); `project_members.relforcerowsecurity = false`. Narrowing to
> `user_id = auth.uid()` would break INV-02.

### Access functions (SECURITY DEFINER, `public`, granted to `authenticated`)

- **`can_access_project(project_id)`** — member of the owning account OR direct project member. The
  READ gate on every project-scoped surface. Also still the WRITE gate on most project-scoped tables,
  including `project_vendors`, `files`, **`budget_items`, `budget_payments` (0051), and
  `payment_schedule` (0052)** — see §13.
- **`is_account_member(account_id)`** — account-scoped features (leads, proposals, subscriptions,
  calendar events, contract templates, the vendor library), project INSERT.
- **`can_manage_project_access(project_id)` (0028)** — `is_account_member` of the project's owning
  account. Gates `project_invitations`, the `project_members` DELETE, and `set_project_archived`.
- **`can_edit_project(project_id)` (0029)** — `is_account_member` OR a `project_members` row with
  `role in ('couple','collaborator')`. Gates the `projects` UPDATE policy and the WRITE-01 exemplars.
  **`viewer` deliberately excluded.**
- `can_read_vendor(vendor_id)`, `bootstrap_account_and_project(...)`.
- `account_members` RLS uses a plain `user_id = auth.uid()` predicate to avoid recursion.
- **`resolveBusinessAccountId(supabase)`** — the sanctioned business-account resolver for `/vendors`,
  `/calendar`, `/contracts`, and billing.

### Account-scoped tables (v28)

- **`calendar_events` (0045)** — `account_id` cascade; optional `project_id` via composite FK with
  `ON DELETE SET NULL (project_id)`; `title`; `event_kind` CHECK
  `meeting|call|site_visit|tasting|fitting|deadline|other`; `starts_at`; `ends_at`; `all_day`;
  `location`; `notes`. RLS single `FOR ALL` `is_account_member`.
- **`contract_templates` (0047)** — `account_id` cascade; `name`; `body` (`{{tokens}}`); `category`
  nullable (VENDOR_CATEGORIES id, no CHECK); timestamps. RLS single `FOR ALL` `is_account_member`.

### Project-scoped budget tables (v29)

- **`budget_payments` (0051)** — the Paid ledger. `id`, `project_id`, `budget_item_id`, `amount`
  numeric(12,2) NOT NULL, `paid_on` date, `note`, `created_at`. Composite FK `(project_id,
  budget_item_id) → budget_items(project_id, id)` ON DELETE CASCADE (via the new unique index
  `budget_items_project_id_id_key`). RLS single `FOR ALL` `can_access_project` (mirrors the
  `budget_items` write gate). **Paid is derived ONLY from this table.**
- **`payment_schedule` (0052)** — the owed installment timeline. `id`, `project_id`,
  `budget_item_id`, `amount` numeric(12,2) NOT NULL, `due_on` date NOT NULL, `label` text (optional,
  free-text — no CHECK), `created_at`. Same composite FK + CASCADE + RLS as `budget_payments`. Index
  `(project_id, due_on)`. **Coverage/past-due derived at read (waterfall) — nothing stored per
  installment.**

`files.category` (0046) is on the existing project-scoped `files` table (rides the existing `files`
`FOR ALL` `can_access_project` policy — no new policy). `budget_items.notes` (0010) and
`budget_items.due_date` (0051, write-dead post-0052) likewise ride the existing `budget_items`
`FOR ALL` `can_access_project` policy — no new surface.

### `set_project_archived` + `projects.archived_at` (0044 / ARCH-01)

Unchanged. Sole writer `set_project_archived(uuid, boolean)` — SECURITY DEFINER,
`can_manage_project_access`-gated. Dashboard toggle; sidebar + Active count + cross-project aggregates
(ARCH-01a) + the Calendar wedding overlay filter to active. The Contracts archive (CON-01)
deliberately spans archived (§3 repository rule).

### The six public (anon) surfaces (UNCHANGED in v29)

1. **Read:** `wedding_websites` anon `SELECT using (published = true)` (0022). Riders:
   `external_registry_links` (0035), `meal_service_style` (0038), `rsvp_access_mode` (0041).
2. **Write (RPC):** `submit_rsvp(...)` — definer, anon execute (0039; extended 0041).
3. **Read:** `registry_items` anon `SELECT` gated to a published site (0035).
4. **Write:** `registry_claims` anon `INSERT` gated to published sites (0036).
5. **Read:** `meal_options` anon `SELECT` gated to a published site (0038).
6. **Read (RPC):** `lookup_rsvp_household(...)` — definer, anon execute (0041; full-name in 0043).

`rsvp_attendees` / `guest_members` / `guests` / `project_invitations` / `calendar_events` /
`contract_templates` / **`budget_payments` / `payment_schedule`** have NO anon policy. Storage carve-out
(0042 `website-media` public SELECT) is recorded, not counted.

---

## 5. Migrations (source of truth: `supabase/migrations/`)

Applied in order. **You are the source of truth on the next number — next free is 0053.**

> **How migrations are applied here (READ THIS BEFORE SUGGESTING ANY CLI COMMAND):** by hand-pasting
> each file into the Supabase SQL editor and running it once, in order. There is NO CLI
> migration-history tracker. **`supabase db push` is FORBIDDEN.** `supabase db query --linked` for
> READS is sanctioned.

> **A migration paste must return clean. Any error means NOTHING applied.** The SQL editor wraps a
> multi-statement paste in ONE transaction; a single error rolls back the file. After every migration,
> confirm with `to_regclass` / `to_regprocedure` / `pg_policies` / `pg_indexes` before running any
> checkpoint. (This is exactly what bit us this cycle: an installment insert threw a raw
> PostgREST error because 0052 hadn't been pasted yet — a file on disk is not an applied migration.)

> **Write migrations to be re-runnable.** `create or replace` for functions; `drop … if exists`
> before every `create policy` / `create trigger`; `create … if not exists` for indexes;
> `drop constraint if exists` before `add constraint`; guard backfills so a re-paste is a no-op.

> **SQL editor gotcha:** the editor renders only the **last** statement's result set, and wide cells
> truncate. Run introspection queries **one at a time**, and coerce long definitions to booleans.

- 0001 core tenancy · 0002 checklist (`tasks`) · 0003 write access
- 0004 vendors_account · 0005 discovery_and_outreach · 0006 guests · 0007 email_credentials
- 0008 outreach_app_columns · 0009 notes · 0010 budget · 0011 files
- 0012 wedding_profile (incl. `onboarded_at`) · 0013 vendor_targets · 0014 assistant_messages
  · 0015 timeline_events
- 0016 contract_status · 0017 leads · 0018 proposals · 0019 proposal_acceptance
- 0020 subscriptions · 0021 wedding_websites · 0022 wedding_websites_public_read
- 0023 rsvp_submissions (anon INSERT dropped in 0039) · 0024 seating_tables · 0025 seating_assignments
- 0026 budget_item_project_vendor (composite FK, `ON DELETE SET NULL (project_vendor_id)`)
- 0027 bootstrap_idempotency · 0028 project_invitations · 0029 project_member_updates
- 0030 vendor_category_and_status · 0031 vendor_target_link · 0032 budget_item_vendor_many
  · 0033 seating_dancefloor
- 0034 registry_items · 0035 registry_public · 0036 registry_claims · 0037 registry_legacy_links_backfill
- 0038 meal_options · 0039 rsvp_attendees · 0040 guest_members · 0041 rsvp_household_access
- 0042 website_media · 0043 rsvp_full_name_lookup · 0044 project_archive
- 0045 calendar_events (CAL-01) · 0046 file_category (CON-01a) · 0047 contract_templates (CON-02)
- **0048 budget_label_optional · 0049 budget_alert_dismissals · 0050 registry_teardown** (see
  factual-completeness note below)
- **0051 budget_payments (BUD-03) · 0052 payment_schedule (BUD-SCHED-01)**

(For the full DDL and introspection notes on 0026–0044, see v27; on 0045–0047, see v28 / below.
New in v29 below.)

### 0048 / 0049 / 0050 — factual-completeness note (authored OUTSIDE this session's reasoning)

These three were **discovered on disk during BUD-03 Step 0**, already applied, and were absent from
the v28 bible's §5 list. They are recorded here for factual completeness (the legitimate use of a
Cursor code scan — existence/numbering, not prose). Their full *why* was not reconstructed in this
session and is a known documentation gap:

- **0048 `budget_label_optional`** — makes `budget_items.label` nullable/optional (a budget item may
  exist with a category and no label). Consistent with quick-add cards that carry only a category.
- **0049 `budget_alert_dismissals`** — the `budget_alert_dismissals` table (per-item `over_plan`
  dismissals; `dismissBudgetAlert` upserts here). Backs the "Ignore" action on the Needs-attention
  panel.
- **0050 `registry_teardown`** — a registry change whose rationale is NOT captured here. **Flag:**
  before relying on registry internals, reconstruct 0050's intent from the migration file and give it
  a proper reasoning entry. (Do not confuse with the standing "do not store a registry claim counter /
  do not add anon SELECT on `registry_claims`" invariants in §15 — those still hold.)

### 0045 calendar_events (CAL-01) — APPLIED LIVE (unchanged from v28)

```sql
create unique index if not exists projects_account_id_id_key on projects (account_id, id);

create table if not exists calendar_events (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  project_id  uuid,
  title       text not null,
  event_kind  text not null default 'meeting'
              check (event_kind in ('meeting','call','site_visit','tasting','fitting','deadline','other')),
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  all_day     boolean not null default false,
  location    text,
  notes       text,
  created_at  timestamptz not null default now()
);

alter table calendar_events drop constraint if exists calendar_events_project_fkey;
alter table calendar_events add constraint calendar_events_project_fkey
  foreign key (account_id, project_id) references projects (account_id, id)
  on delete set null (project_id);

create index if not exists calendar_events_account_starts_idx on calendar_events (account_id, starts_at);

alter table calendar_events enable row level security;
drop policy if exists "calendar events managed by account members" on calendar_events;
create policy "calendar events managed by account members" on calendar_events
  for all to authenticated
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
```

### 0046 file_category (CON-01a) — APPLIED LIVE (unchanged from v28)

```sql
alter table files add column if not exists category text;  -- vendor-category id; NULL = uncategorized
```
NO DB CHECK; rides the existing `files` `FOR ALL` `can_access_project` policy.

### 0047 contract_templates (CON-02) — APPLIED LIVE (unchanged from v28)

```sql
create table if not exists contract_templates (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  name        text not null,
  body        text not null default '',
  category    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists contract_templates_account_idx on contract_templates (account_id);
alter table contract_templates enable row level security;
drop policy if exists "contract templates managed by account members" on contract_templates;
create policy "contract templates managed by account members" on contract_templates
  for all to authenticated using (is_account_member(account_id)) with check (is_account_member(account_id));
```

### 0051 budget_payments (BUD-03) — APPLIED LIVE + VERIFIED

Per-item `due_date` + the project-scoped Paid ledger. Additive; **no rename of `actual_amount`, no
backfill.** Re-runnable.

```sql
-- unique index enabling the composite FK target (0026 pattern)
create unique index if not exists budget_items_project_id_id_key on budget_items (project_id, id);

alter table budget_items add column if not exists due_date date;

create table if not exists budget_payments (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null,
  budget_item_id uuid not null,
  amount         numeric(12,2) not null,
  paid_on        date,            -- date the money was handed over
  note           text,
  created_at     timestamptz not null default now()
);

alter table budget_payments drop constraint if exists budget_payments_item_fkey;
alter table budget_payments add constraint budget_payments_item_fkey
  foreign key (project_id, budget_item_id) references budget_items (project_id, id)
  on delete cascade;

create index if not exists budget_payments_item_idx on budget_payments (budget_item_id);
create index if not exists budget_payments_project_idx on budget_payments (project_id);

alter table budget_payments enable row level security;
drop policy if exists "budget payments accessible by project members" on budget_payments;
create policy "budget payments accessible by project members" on budget_payments
  for all to authenticated
  using (can_access_project(project_id))
  with check (can_access_project(project_id));
```

**Semantics (the reasoning — see §7 BUD-03):** `actual_amount` was the code's *spent* source
(`spent = Σ actual_amount` drove the headline). BUD-03 **reinterprets** it as **Actual** (contracted
cost) and moves **Paid** to this ledger (`paidTotal = Σ budget_payments`). No rename (the name is now
honest); no backfill (backfilling `actual_amount` into the ledger would double-count the same money as
both Actual and Paid). Read rewire in `budget-aggregates.ts`: the "paid so far" headline bar =
`paidTotal / total_budget`; `actualTotal = Σ actual_amount` stays (now Actual, not Spent);
`committed = max(allocated − paidTotal, 0)` — **semantic shift recorded: committed = planned-but-not-
yet-paid.** Category over-plan alert unchanged (Actual vs Estimate = Difference < 0).
**VERIFIED:** kill-shot — item with `actual_amount` set + zero payments reads **Paid $0**; ledger
add/remove moves the headline by the payment sum, not by Actual.
**WRITE-01 sharp edge:** `budget_payments` gates on `can_access_project`.

### 0052 payment_schedule (BUD-SCHED-01) — APPLIED LIVE + VERIFIED

Dated installments per budget item. Backfills `budget_items.due_date` → one "Balance" installment
(once, guarded); **does NOT drop `due_date`** (write-dead in app; drop in 0053+ after parity).
Re-runnable.

```sql
create table if not exists payment_schedule (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null,
  budget_item_id uuid not null,
  amount         numeric(12,2) not null,
  due_on         date not null,
  label          text,            -- optional, free-text ("Deposit", "Balance") — no CHECK
  created_at     timestamptz not null default now()
);

alter table payment_schedule drop constraint if exists payment_schedule_item_fkey;
alter table payment_schedule add constraint payment_schedule_item_fkey
  foreign key (project_id, budget_item_id) references budget_items (project_id, id)
  on delete cascade;

create index if not exists payment_schedule_item_idx on payment_schedule (budget_item_id);
create index if not exists payment_schedule_project_idx on payment_schedule (project_id);
create index if not exists payment_schedule_due_idx on payment_schedule (project_id, due_on);

alter table payment_schedule enable row level security;
drop policy if exists "payment schedule accessible by project members" on payment_schedule;
create policy "payment schedule accessible by project members" on payment_schedule
  for all to authenticated
  using (can_access_project(project_id))
  with check (can_access_project(project_id));

-- backfill: each existing due_date → one "Balance" installment. No-op on re-run.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name='budget_items' and column_name='due_date')
     and not exists (select 1 from payment_schedule) then
    insert into payment_schedule (project_id, budget_item_id, amount, due_on, label)
    select project_id, id, coalesce(actual_amount, 0), due_date, 'Balance'
    from budget_items where due_date is not null;
  end if;
end $$;
```

**Semantics (the reasoning — see §7 BUD-SCHED-01):** independent model (a) — the schedule is the
**owed** timeline; the ledger is **paid**; no stored per-installment status, no matching table.
**Waterfall** derivation at read: sort installments by `due_on`, pour `Σ ledger` down them; the first
uncovered installment is **next-owed**; item is **past due** when a next-owed installment exists and
its `due_on < today` (local date, strict `<`). `budget_items.due_date` is now write-dead — the add-form
date inserts a `payment_schedule` row instead, and `updateBudgetItem` no longer writes `due_date`.
**VERIFIED:** waterfall kill-shot — Deposit due yesterday + Balance due next month, log the deposit →
NOT past due; delete it → past due. **WRITE-01 sharp edge:** `payment_schedule` gates on
`can_access_project`.

### Column reference (v29 additions; earlier entries unchanged)

**`budget_items` (0010 + 0026 + 0048 + 0051):** `category` (protected **free-text**, no CHECK);
`label` text nullable (0048); `planned_amount` numeric(12,2) = **Estimate**; `actual_amount`
numeric(12,2) = **Actual** (contracted cost — **NOT** Paid); `notes` text (surfaced in the card,
BUD-NOTES-01); **`due_date` date nullable (0051) — WRITE-DEAD post-0052** (superseded by
`payment_schedule`; drop in 0053+ after parity); `project_vendor_id` optional link (0026). Unique
`(project_id, id)` index (0051) backs the payment/schedule composite FKs.

**`budget_payments` (0051):** project-scoped Paid ledger — `amount`, `paid_on` date, optional `note`.
**Paid is derived only from this table.** Deletes cascade with the parent item.

**`payment_schedule` (0052):** project-scoped owed installments — `amount`, `due_on` date NOT NULL,
optional free-text `label`. Coverage + next-due + past-due are derived at read (waterfall). Deletes
cascade with the parent item.

**`projects` (0001 + 0010 + 0044 + 0045 index):** `wedding_date`; `total_budget` numeric(12,2);
`archived_at` timestamptz nullable (0044); unique index `projects_account_id_id_key` on
`(account_id, id)` (0045) — do not drop.

**`files` (0011 + 0016 + 0046):** `kind` (incl. `'contract'`); `status` draft/sent/signed; `category`
text nullable (VENDOR_CATEGORIES id, no CHECK). Private `project-files` bucket.

**`calendar_events` (0045)** / **`contract_templates` (0047):** see DDL above.

**No-migration slices to date (append v29):** DASH-01; CON-01; **budget row polish; BUD-FILTER-01;
BUD-QUICKADD-01; BUD-QUICKADD-02; BUD-NOTES-01**. (Earlier list carries forward.)

---

## 6. Shell & routing

One login. `lib/post-login-path.ts` routes by account kind.
- **Planner (business):** `/dashboard`, `PlannerShell` + `PlannerProjectSidebar`. Dashboard splits
  Active vs Archived; sidebar and Active count read only `archived_at is null`. Cross-project Urgent /
  vendors-needing-action / tasks-due aggregates filter to active project IDs (ARCH-01a).
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

`getDirectProjectIds(supabase)` queries `project_members` `.eq("user_id", uid)`. The `user_id` filter
is load-bearing and must never throw.

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

`/invite/[token]` — middleware (logged-out) sets `pending_invite_token` cookie [httpOnly, 30 min];
authenticated → `acceptProjectInvitation(token)` → `/projects/{projectId}` or `?error=`. Token MUST
NOT resolve before authentication. `consumePendingInvite` runs at BOTH auth entry points. INV-08
closed the Next 16 cookie-write crash — do not move the write back into `InvitePage`.

### Dashboard — Urgent grouped by wedding (DASH-01)

Regrouped from a flat mixed list into collapsible per-wedding cards
(`components/dashboard/urgent-by-wedding.tsx`). Card = couple name + count (tasks + vendors), collapsed
by default; rows reuse `urgentHref`/`urgentTitle`/`urgentVariant`/`urgentLabel`. `activeProjectIds`-
scoped. Urgent definition unchanged (overdue / ≤7-day tasks + `to_contact|contacted` vendors).

### Shared project workspace

`app/(app)/projects/[projectId]/layout.tsx`: tabs from `lib/project-tabs.ts`, role-gated
(`plannerOnly`). Canonical two-column split:
`lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]` with `lg:sticky lg:top-6 lg:self-start` rail.

- **Overview / Checklist / Budget / Vendors / Day-of timeline / Guests / Registry / Notes / Seating /
  Website editor / Contracts** — as recorded, with the **Budget tab rebuilt in v29** (see below). The
  project Contracts tab captures/edits a vendor category per contract (CON-01a).
- **Access (planner-only)** — INV-02 + INV-07 + INV-02b.

#### Budget tab (v29 — feature-complete)

`budget/page.tsx` (server read: `budget_items` + `budget_payments` + `payment_schedule` +
`project_vendors` + `budget_alert_dismissals`) → `computeBudgetAggregates` (`lib/budget-aggregates.ts`)
→ `BudgetBoard`. Actions in `budget/actions.ts`: `setBudgetTarget`, `addBudgetItem` (Estimate +
optional Actual + optional first installment date), `addBudgetItemsBulk` (quick add), `updateBudgetItem`
(Estimate/Actual/notes — **not** `due_date`), `removeBudgetItem`, `setBudgetItemProjectVendor`,
`dismissBudgetAlert`, `addBudgetPayment` / `removeBudgetPayment` (ledger), `addScheduleInstallment` /
`removeScheduleInstallment` (schedule).

- **Headline (global, never filtered):** "paid so far" bar = `Σ payments / total_budget`; stat tiles
  Allocated (`Σ planned`), Unallocated, Actual (`Σ actual`), Paid so far (`Σ payments`), Committed
  (`allocated − paidTotal`). Needs-attention panel (over-plan alerts + "N of M categories nothing
  tracked").
- **Filter bar (BUD-FILTER-01):** Status segmented control (All · Unpaid · Paid in full · Past due) ×
  Category dropdown, ANDed; narrows only the card grid.
- **Category cards:** grouped by `budget_items.category`; each card a "tracked" progress readout.
  Quick add + Add item controls above the grid.
- **Expanded item row:** 5-column grid — **Estimate · Actual · Difference · Paid · Due (next-due)** —
  plus two parallel recessed wells: **Payment schedule** (installments; "+ Add installment") and
  **Payments** (ledger; "+ Add payment"), a Vendor link, and a free-text **Notes** field.

### Account-scoped planner surfaces

`/leads`, `/account/billing`, **`/vendors`** (VND-08/08a — library), **`/calendar`** (CAL-01),
**`/contracts`** (CON-01/01a/02 — Archive | Templates). As recorded in v28, unchanged.

### Public surfaces (no auth, outside `(app)`)

`app/w/[slug]`, `/w/[slug]/rsvp`, `/w/[slug]/registry`, `/invite/[token]`. Marketing `/` + `/pricing`.
Marketing copy must not lead with "AI."

---

## 7. Features built

Pattern: a folder under the relevant scope with `page.tsx` (server read) + `actions.ts` (`'use server'`
writes by id + `revalidatePath`); RLS authorizes.

**The full per-slice build narratives for v1–v28 are preserved in the prior bibles and carry forward
unchanged.** The v29 budget arc is below in full.

### v28 — Planner workspace expansion (summary; full detail in v28)

DASH-01 (Urgent by wedding); VND-08/08a (account Vendor library — account-only add, guarded orphan-
only delete, collapsible categories); CAL-01 (authorable calendar, `calendar_events`, source model);
CON-01 (contracts archive spanning archived); CON-01a (`files.category`); CON-02 (contract templates,
server merge, print-only); CON-03 deferred.

### v29 — Budget item money tracking + payment schedule

#### BUD-03 — per-item money model. Migration **0051**.

The budget item gains a full money model matching the Aisle Planner reference:
**Estimate · Actual · Difference · Paid · Due date.**

- **Estimate** = `planned_amount` (relabel Planned → Estimate; no data change).
- **Actual** = `actual_amount`, **relabelled** Total Spent → Actual. The load-bearing correction of
  this slice: `actual_amount` already meant *paid-to-date* in code (`spent = Σ actual_amount` drove the
  headline). BUD-03 **reinterprets** it as **Actual** (contracted/negotiated cost). No rename — the
  name is now honest (`actual_amount` = Actual). No backfill — backfilling it into the ledger would
  count the same money as both Actual and Paid.
- **Difference** = `Estimate − Actual`, derived at read; **sage ≥0** (under/on), **rosewood <0**
  (over). Per-item extension of BUD-02's project variance. **Suppressed to `—` when `actual_amount` is
  null** — an unpriced line has no meaningful difference (`1500 − 0 = "+$1,500 under"` is a fake
  signal). Same guard class as the filter's unpriced exclusion.
- **Paid** = `Σ budget_payments.amount`, derived **only** from the ledger — **never** `actual_amount`
  (the §3 dual-source guardrail). The kill-shot exists to catch anyone wiring `Paid = actual_amount`.
- **Due date** = authored `budget_items.due_date` (superseded by `payment_schedule` in BUD-SCHED-01;
  write-dead post-0052).
- **`budget_payments` ledger:** project-scoped `{amount, paid_on, note}`, "+ Add payment" in a recessed
  well. Add/remove updates Paid + the headline; single `revalidatePath`.
- **Read rewire (`budget-aggregates.ts`):** `paidTotal = Σ payments` (was `Σ actual_amount`); "paid so
  far" bar = `paidTotal / total_budget`; `actualTotal = Σ actual_amount` stays (now Actual);
  **`committed = max(allocated − paidTotal, 0)` — semantic shift: planned-but-not-yet-paid** (was
  planned-minus-spent). Category over-plan alert unchanged.
- Pre-launch, so existing `actual_amount` fixtures reinterpret as Actual and Paid starts empty —
  harmless (fixtures only).
- **WRITE-01:** `budget_payments` gates on `can_access_project` (mirrors `budget_items`) — a viewer
  sharp edge.
- **§9 audit (clean):** no assistant tool writes the ledger, `due_date`, or `actual_amount`;
  `add_budget_item` writes `planned_amount` only. No new enforced-canonical tool.

**Kill-shot:** an item with `actual_amount` set and zero payments shows **Paid $0** — proves Paid
derives from the ledger, not `actual_amount`.

**Files:** `0051_budget_payments.sql`, `budget/actions.ts` (`addBudgetPayment` / `removeBudgetPayment`;
`due_date` into `updateBudgetItem`), `budget/page.tsx`, `lib/budget-aggregates.ts`, `BudgetBoard.tsx`,
`BudgetItemRow.tsx`.

#### Budget row polish. NO SCHEMA.

- **5-column grid** (Estimate · Actual · Difference · Paid · Due date), each a self-contained cell
  stacking label over control-or-value, inputs `w-full min-w-0`, derived values **left-aligned** in
  their own cells. Fixes a drift where Difference/Paid floated right — the real cause was the derived
  values sitting outside the input grid / right-aligned, not box width; the fix is one grid with
  left-aligned value cells (not shrinking the `$` boxes).
- **Optional due date on the Add-item form**, decoupled from the vendor link (post-0052 this seeds the
  first `payment_schedule` installment).
- **Difference suppression** (`—`) when `actual_amount` is null (above).

#### BUD-FILTER-01 — budget card filter bar. NO SCHEMA.

Filter bar above the cards: **Status** segmented control (All · Unpaid · Paid in full · Past due) +
**Category** dropdown, **ANDed**. Pure client-side derivation over BUD-03 state.

- Predicates (`balance = actual − paid`, evaluated **only when `actual !== null`**): **Unpaid** =
  `balance > 0`; **Paid in full** = `balance ≤ 0` (overpaid counts); **Past due** = originally
  `balance > 0 && due_date < today`, **rewired by BUD-SCHED-01** to the waterfall (`item.pastDue`).
- **Unpriced items** (`actual === null`) match **no** status bucket — All only. Guard against
  `paid >= (actual ?? 0)` classifying an unpriced line as Paid-in-full.
- **Headline + Needs-attention stay GLOBAL** — the filter narrows only the card grid.
- **Past due ⊂ Unpaid** (deliberate overlap; urgency lens, not an exclusive state).
- Chips are **CONTROLS**, not status readouts — active = `--accent-wash` pill, never sage/rosewood;
  count badge is a neutral Pill.

#### BUD-QUICKADD-01 / 02 — quick add curated categories. NO SCHEMA.

Quick add opens a **multi-select checkbox menu** of common wedding categories
(`lib/budget-quick-categories.ts`). Selecting → new empty category **cards** (not line-items) with
`planned_amount = 0` → the "Nothing tracked" state, no dollar figure. `addBudgetItemsBulk(projectId,
categories[])` inserts one `budget_items` row per selection with a **single** `revalidatePath` (no
per-item flashes); menu stays open while checking, footer "Add {n}" commits (disabled at 0).

- The curated list is a **standalone constant**, deliberately **NOT** imported from / wired to
  `VENDOR_CATEGORIES` and carries **NO CHECK** — `budget_items.category` is protected free-text (§3);
  this is UI suggestions only, not a vocabulary. Do not "unify" it.
- **Duplicates allowed** (a couple may want two "Bar" cards — welcome party + reception); no dedupe, no
  grey-out.

**Kill-shot:** a 0-planned card is invisible to every headline sum (contributes 0 to Allocated; no
NaN); setting its Estimate later raises Allocated (proves it's a real row).

#### BUD-NOTES-01 — per-item notes. NO SCHEMA.

`budget_items.notes` (existed since 0010, never surfaced) wired into a free-text textarea in the
expanded card, persisted on blur via `updateBudgetItem`. Free-text by design (no CHECK). Notes live on
the item **row**, not the category (a multi-item category gets notes per row). Does not touch any money
aggregate.

#### BUD-SCHED-01 — payment schedule (multiple due dates). Migration **0052**.

A due date belongs to a **scheduled payment**, not the item. Installments replace the single
`due_date`.

- **`payment_schedule`** (project-scoped): `{amount, due_on NOT NULL, label?}`. "+ Add installment"
  captures amount + date + optional label, in a recessed well **parallel to the payments ledger**
  (owed vs paid).
- **Backfill:** each existing `budget_items.due_date` → one "Balance" installment (once, guarded).
- **`due_date` NOT dropped** — **write-dead** in app (`updateBudgetItem` stops writing it; the add-form
  date inserts a `payment_schedule` row instead). Drop in **0053+ after parity** (additive-then-
  destructive; §3).
- **Independent model (a), NOT reconciled (b):** the schedule is the **owed** timeline; the ledger is
  **paid**. No stored per-installment paid flag, no matching table. "Amount still due" stays
  `actual − Σ paid`.
- **Coverage derived at read — the waterfall:** sort installments by `due_on`; pour `Σ ledger` down
  them; an installment is **covered** when the running total through it ≤ `totalPaid`; the first
  uncovered one is **next-owed**. This keeps owed/paid as separate axes derived from the ledger — the
  "covered" indicator is a derived read, **not** stored state.
- **Past due (item)** = a next-owed installment exists AND its `due_on < today` (local date, strict
  `<`). **This corrects the naive single cliff:** paying the deposit on time no longer flags the whole
  item past due while the balance isn't yet owed — the deposit covers the first installment, next-owed
  becomes the future balance.
- **Next due** surfaced on the collapsed card (soonest owed installment). Filter's Past-due predicate
  rewired to `item.pastDue`.
- Installments need not sum to Actual (independence); the schedule feeds dates/urgency only, never
  headline sums.
- **WRITE-01:** `payment_schedule` gates on `can_access_project` — a viewer sharp edge.

**Kill-shot:** Actual $5,000, Deposit $2,500 due yesterday + Balance $2,500 due next month, log a
$2,500 payment → item **NOT** past due (deposit covered, next-owed is the future balance); delete the
payment → item **IS** past due.

**Files:** `0052_payment_schedule.sql`, `budget/actions.ts` (`addScheduleInstallment` /
`removeScheduleInstallment`; `addBudgetItem` seeds a schedule row from the form date; `updateBudgetItem`
drops `due_date`), `budget/page.tsx`, `lib/budget-aggregates.ts` (waterfall + next-due + pastDue),
`BudgetBoard.tsx`, `BudgetItemRow.tsx`.

> **Deliberately discarded this cycle:** a manual "Paid in full" status boolean on each card. It would
> create a **second source of truth** for paid status (the exact dual-source trap) and strand the flag
> whenever Actual changes. If ever wanted, the correct implementation logs a payment for the remaining
> balance (`actual − paid`) so the derived status flips via the ledger — not a stored flag. Not built.

---

## 8. Onboarding → AI starting plan

3-step wizard captures `wedding_profile` + `wedding_date` + `total_budget`;
`generate-wedding-plan.ts` returns strict JSON; editable preview; **Approve** (`commitPlan`) inserts
tasks/budget_items/vendor_targets, stamps `onboarded_at`, guards double-commit. `saveOnboarding`
remains the ONLY onboarding-path write of `wedding_date`; post-onboarding edits go through
`updateWeddingDate`. **Computed task due dates floor through `clampDueDateToToday` and `phase` is
derived, never authored.**

> **⚠️ `onboarded_at` lives on `wedding_profile`, NOT on `projects`.** A planner-created project has no
> `wedding_profile` row — which is why Mila & Griffin reads null, and why that's correct.

> **Invited couples never see the wizard.** The discriminator is whether the user owns the account that
> owns the project.

**The generator's response shape (ONB-01; still current):**
```json
{
  "checklist":        [ { "title": string, "monthsBeforeWedding": number } ],
  "budget":           [ { "category": string, "plannedAmount": number } ],
  "vendorCategories": [ { "category": string, "note": string } ]
}
```
`phase` is NOT in this shape (derived via `phaseFromMonthsBefore`). `vendorCategories[].category` MUST
be one of `VENDOR_CATEGORIES`' ids. The generated budget's `category` is **free-text** (matches the
protected `budget_items.category` posture); `plannedAmount` becomes Estimate.

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
> calendar, contract templates, the account vendor library, **and the budget ledger / payment
> schedule** (BUD-03 / BUD-SCHED-01 shipped no assistant tools). Website has a narrow write
> (`set_website_travel`); RSVP / full website authoring remain out of scope. The assistant has no
> vendor-removal tool and should not get one.

> **Assistant write-tool canonical audit. COMPLETE — closed.** Enforced-canonical: `add_task`,
> `update_task_status`, `update_guest_rsvp`, `add_vendor_target`, `set_website_travel`.
> Free-text-by-design (correct, not a gap): `add_budget_item` category, `add_timeline_event(s)`
> owner/section, note/guest text, website schedule text. **v29 audit event (clean):** BUD-03 /
> BUD-SCHED-01 added `budget_payments`, `payment_schedule`, and `budget_items.due_date`/`notes`; **no
> assistant tool writes any of them**, and `add_budget_item` still writes `planned_amount` only. No new
> enforced-canonical tool; Paid/coverage are derived, so there is no canonical writer to harden.
> **Re-run this audit when a new write tool ships — especially any leads / proposals / RSVP / seating /
> calendar / templates / contracts / budget-payment / schedule tool.**

> The legacy `getBudget` assistant READ tool still does `allocated = sumPlanned + sumVendorCosts`
> (double-counts quotes into allocated) — the UI read path does NOT. Stale; separate cleanup, not
> touched by the budget arc.

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
| **1 — App chrome** | `app/(app)/`, most of `components/`, planner, forms, seating canvas, assistant, settings, Access, `/vendors` / `/calendar` / `/contracts`, **the rebuilt Budget page** | Soft stack palette + Figtree; two depth levels; three radii; **no** accent flood; **no** Cormorant/Great Vibes |
| **2 — Emotional** | Landing, onboarding hero/welcome, empty-state heroes, `/invite/[token]` | Same palette + Figtree; larger display scale; **exactly one** deep field `--deep` per surface |
| **3 — Website + print** | `components/website/`, public `/w/[slug]`, `RunSheetDocument.tsx` print header, the contract print document (CRM contract + CON-02 template fill) | `--ws-*` colour + Cormorant + (Romance) Great Vibes + Hanken |

**Serif / script location rule:** Cormorant Garamond and Great Vibes may appear **only** in
`components/website/`, the run-sheet print header, and the contract print document.

**Status-colour meaning:** sage = settled/done/booked/signed/rsvp-yes/**under-or-on budget**; clay = in
flight; rosewood = wrong/overdue/over-plan/declined/rsvp-no/**over budget**; well/muted = neutral.
**Kind is never encoded in a status colour** (seating table kinds, calendar event kinds).

> **rosewood is also the DESTRUCTIVE-ACTION colour** (muted at rest, rosewood on hover/focus). Row
> actions need spatial separation from status readouts and a real hover/focus affordance (VND-05b).

**Budget (v29):**
- Per-item columns **Estimate · Actual · Difference · Paid · Due** in a 5-cell grid, label stacked over
  value, derived values left-aligned in their own cells.
- **Difference is the only status colour on the row** — sage (≥0) / rosewood (<0), **suppressed to `—`
  when Actual is absent**. Paid, Estimate, Actual are neutral figures.
- **Filter chips are CONTROLS, not status readouts** — active = `--accent-wash` pill, never
  sage/rosewood; the Past-due chip is not coloured rosewood (that would read as a status).
- The **payment ledger** and the **payment schedule** are two **parallel recessed wells** inside the
  raised card (owed vs paid) — no raised-in-raised. The "covered" installment indicator is a muted,
  clearly-derived mark (not a manual toggle).
- No pie/donut/circular progress; Allocated is items-only; quote money never enters a headline figure;
  a 0-planned quick-add card contributes nothing to any headline sum.

**Collapse pattern:** DASH-01 per-wedding cards, VND-08a category groups, the quick-add multi-select
menu, and budget category cards share ONE chevron/expand affordance — do not fork a second style.

**Date formatting (LAND-01a):** public/couple-identifying long wedding dates → shared
`formatWeddingDate` (`components/website/template-utils.ts`), locale **`en-US`**. All-day calendar
placement, the wedding countdown, and budget due-dates/installments all derive by **local date** (no tz
off-by-one; strict `<` for past-due).

### Open design items

| Item | Status |
|---|---|
| Legacy CSS aliases (`--plum`, `--stone`, …) | **Open** — temporary; no new alias consumers |
| `design/reference.html` regenerate | **Open** |
| `design/theme-direction.html` delete | **Open** |
| Font-load scoping | **Open** |
| **Dom live Soft stack + LAND-01 visual checkpoint — incl. `/vendors` / `/calendar` / `/contracts` + the rebuilt Budget page** | **Open** — the standing human gate |
| Tier 1 date locale policy | **Open** |
| Run sheet legacy classnames | **Accepted for now** |
| **Budget dashboard overhaul** (richer headline layout / rollup beyond the current stat tiles) | **Open** — mockup-first before any slice |

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
checkpoint.** Cursor's "code-level ✅" is narration, not verification.

**Design the checkpoint to fail.** Ask every time: *what would this checkpoint look like if the fix
silently didn't work?* If the answer is "the same," the checkpoint is decoration. Exemplars: ONB-00
double-click; INV-01 forwarded-link refusal; INV-02 revoke-then-open; VND-05 two-count SQL pair;
CAL-01 all-day-lands-on-exact-date; CON-01 contract-still-listed-after-archive. **v29 exemplars:
BUD-03 `actual_amount`-set-but-zero-payments → Paid $0 (Paid derives from the ledger, not the cost
column); BUD-QUICKADD 0-planned-card-invisible-to-headline; BUD-SCHED-01 deposit-paid-≠-past-due then
delete-payment-→-past-due (the waterfall).**

**Verification lessons (carried forward):**
1. Confirm the migration landed before believing any checkpoint (`to_regclass` / `to_regprocedure` /
   `pg_policies` first). A file on disk is NOT an applied migration. **(This cycle: an installment
   insert threw a raw PostgREST error because 0052 hadn't been pasted — exactly this lesson.)**
2. Absence-shaped assertions pass trivially when the feature doesn't exist.
3. Reproduce the defect BEFORE applying the fix.
4. Scoped Step 0 questions return scoped answers — ask for EVERY writer/read site, require a count.
5. Cursor answering a Step 0 question is not Cursor acting on it.
6. A control the spec author cannot find on the page has not shipped.
7. An insert-only writer looks broken after a clear-and-rebuild unless you separate stale from fresh.
8. A guard that silently no-ops and a broken guard that doubles rows look identical in the UI — count.
9. **Raw Postgres/PostgREST error objects rendered in the UI mean the write is FAILING, not
   succeeding — read the literal `code`/`message`, don't diagnose from the truncated blob.** (v29.)

**Verify schema claims by introspection, not narration.** **Checkpoint reports must be literal.**
**Step 0 is load-bearing — when Step 0 contradicts the prompt, Step 0 wins.** (This cycle, Step 0
corrected the "Actual = contracted total" framing and the "no budget write tool" premise — Step 0 was
right both times.) **Don't diagnose from a screenshot — get the rows.**

**Documentation discipline:** the bible is written from the reasoning in the working session, not a
code scan. A code scan reliably catches **factual drift** (migration numbers, file paths, existence) —
use it for that, as a findings list, not as bible prose. It cannot reconstruct *why* (a deliberate
deferral, a derive-vs-store choice, a dual-source guardrail). **Cursor does NOT author the bible.**
(v29 correction: Cursor edited the v28 bible mid-code — it captured the 0051/0052 schema but left the
migration counter stale, marked 0052 unapplied, froze the roadmap mid-session, and never recorded the
no-schema slices or 0048–0050. All corrected here from session reasoning.) **Section-level diffs over
full regenerations** once past this consolidation.

**Drift watchlist (append v29):**
- Wiring `Paid = actual_amount` (Paid is ledger-only; the kill-shot catches this).
- Backfilling `actual_amount` into `budget_payments` (double-counts money as Actual AND Paid).
- Storing a per-installment "paid" flag or a payment↔installment matching table (coverage is derived —
  the waterfall).
- Dropping `budget_items.due_date` before parity is confirmed (0053+ only).
- Letting the budget filter rewrite the headline / Needs-attention stats (they are global).
- Wiring `lib/budget-quick-categories.ts` to `VENDOR_CATEGORIES` or adding a CHECK to
  `budget_items.category` (protected free-text).
- Colouring the Past-due filter chip rosewood (chips are controls, not status).
- Reintroducing a manual "Paid in full" status boolean (dual-source trap).
- (All prior watchlist items from v28/v27 carry forward.)

---

## 12. Compliance & security notes

- **Stripe:** webhook verifies raw-body signature; service-role only in webhook (+ billing/admin);
  entitlement read only from the `subscriptions` row. **Stripe Tax NOT set up.**
- **Public website / registry / meal-options read:** anon `SELECT` gated to a published site.
- **Public registry claim / RSVP write:** anon INSERT (claims) / `submit_rsvp` RPC only; `project_id`
  server-derived; honeypot + soft throttle. **Collects guest PII** → privacy policy.
- **Invitations:** raw tokens 32 random bytes base64url, stored only as sha256 hex; acceptance bound
  to `auth.email()`; expiry 14 days; revocation immediate. Pending-invite cookie httpOnly,
  `sameSite: lax`, secure in prod, 30-min, consumed once, set in middleware (INV-08).
- **Archive:** `set_project_archived` definer, `can_manage_project_access`, authenticated only.
- **Calendar / contract templates:** account-scoped (`is_account_member` FOR ALL), authenticated only,
  no anon policy, no service-role path. `calendar_events.project_id` links only within the owning
  account (composite FK).
- **Contracts archive:** downloads use time-limited signed URLs on the private `project-files` bucket
  (`createSignedUrl`, 60s) — never a public URL.
- **Budget ledger / payment schedule (v29):** `budget_payments` and `payment_schedule` are
  project-scoped (`can_access_project` FOR ALL), authenticated only, **no anon policy, no service-role
  path**; both cascade-delete with their parent `budget_items` row via the composite FK. No money
  figure is exposed to any anon surface.
- **Vendor removal:** deletes the project link only; cascades `outreach_messages`. The account Vendor
  library delete (VND-08) removes a `vendors` row only when it has zero links.
- **Gmail OAuth:** `gmail.send` sensitive scope → needs verification. Testing mode caps apply.
- **Signup:** `auth.signUp` only; no tenant created at signup.
- **Production infra:** prod belongs in a **separate Supabase org on Pro**. Fresh prod project,
  migrations **0001–0052** applied by hand once each in order (NEVER `db push`), storage buckets
  (`project-files` + `website-media`) + policies recreated, real SMTP, prod domain in auth redirect
  URLs. See the Launch Prep Runbook.
- Set Anthropic + Google Cloud + Stripe + Supabase billing/spend alerts.

---

## 13. Known caveats / things to verify

**Closed by earlier versions (v10–v28):** BUD-02 rail + variance; 0026 introspection; ONB-00/ONB-01;
invitation RLS asymmetry (0029); vendor category vocabularies (0030 + VND-05/05a); no vendor removal;
`replied` unreachable; booked-slot vs category-slot independence; multi-owner run sheets; one-vendor-
many-slots; one-line-per-vendor; dance floor; registry; meals + RSVP match; household-gated RSVP;
website photos + sections; collaborator invites; planner create; pricing/marketing; archive; invite
cookie; checklist delete + assistant phase/date; Has-access live membership; **orphaned account-level
vendors (VND-08)**; calendar; contracts archive + templates. Full detail in v27/v28 §13.

**Closed by v29:**
- **Budget page is feature-complete** — per-item Estimate/Actual/Difference/Paid, a payment ledger, a
  filterable card grid, curated multi-select quick-add, per-item notes, and a dated payment schedule
  with waterfall past-due are all shipped and live-verified.

**Open — v29 (deliberate deferrals + gaps):**
- **`budget_items.due_date` is write-dead (0052), not dropped.** Superseded by `payment_schedule`;
  backfilled into a "Balance" installment. **Drop in 0053+ after parity** (additive-then-destructive) —
  tracked exactly like `guests.meal_choice`.
- **Reconciled payment schedule (model b) deferred.** Per-installment paid checkmarks linked to
  specific payments (partial-payment matching) is a clean follow-on; the shipped model (a) derives
  coverage at read via the waterfall — no stored per-installment state.
- **Budget dashboard overhaul deferred.** The richer headline layout / rollup (beyond the current stat
  tiles) is aesthetic → mockup-first before any slice.
- **`budget_payments` / `payment_schedule` ride `can_access_project` FOR ALL** — a viewer sharp edge
  (see below); no separate policy.
- **`budget_items.category` free-text + the quick-add curated list** — deliberate; do not enum, do not
  wire the list to `VENDOR_CATEGORIES`.
- **0050 `registry_teardown` rationale uncaptured** — recorded factually in §5; reconstruct its intent
  before relying on registry internals.

**Open — v28 (carried forward):** CON-03 deferred (manual PDF path); CAL-01a deferred (task-due
calendar overlay); contract category axis is vendor-only; `{{amount}}` has no project-level source;
`files.category` inherits the existing write gate; four NO-CHECK category columns (ONB-02's decision).

**Open — security / schema (carried forward + v29):**
- **`viewer` can write on every project-scoped table except `projects` and the WRITE-01 exemplars.**
  `project_vendors`, `tasks`, `budget_items`, **`budget_payments` (0051)**, **`payment_schedule`
  (0052)**, `guests`, `notes`, `timeline_events`, `seating_*`, `files` (incl. `category`), rsvp member
  writes, etc. still gate writes on `can_access_project`, which a `viewer` passes. Unreached today
  (Access issues only `{couple, collaborator}`). **WRITE-01 before any `viewer` invite.**
- **`projects` has NO DELETE policy** (silent-no-op shape, unreached).
- **Four category columns have NO CHECK** — ONB-02 (0053+) owns the decision across
  `vendors` / `vendor_targets` / `files` / `contract_templates`. (`budget_items.category` stays
  free-text — not in that CHECK set.)
- **`guests.meal_choice` still present (inert).** Drop in MEAL-03a / 0053+.
- **`website-media` public SELECT has no published gate** — intentional.
- **`project_invitations.invited_by` / `accepted_by` have no FK to `auth.users`** — cosmetic.
- **`budget_items.category` / `timeline_events.owner`/`section` free-text** — deliberate; do not enum.
- **`tasks.phase` free-text**; past `wedding_date` permitted — phase derived by every writer.

**Open — invitation feature (deliberate gaps):** personal-account user accepting an invite has the
direct project hidden by routing (test with an account-less fixture); dual-account foreclosed by 0027;
no email delivery (INV-06); `viewer` deferred (WRITE-01); collaborator shipped (INV-07).

**Open — Soft stack / design (the standing human gate):** Dom live Soft stack + LAND-01/01a visual
checkpoint across couple tabs (incl. the **rebuilt Budget page**), planner dashboard/leads/billing/
Access, `/vendors` / `/calendar` / `/contracts`, landing, `/pricing`, login, `/invite/[token]`,
`/w/[slug]` date hydration; budget dashboard overhaul mockup; Tier 1 date locale policy; stale
`reference.html`; `theme-direction.html` to delete; legacy CSS aliases; font-load scoping.

**Open — other (carried forward):** VND-05 g spot-check; website-media storage orphans; WeddingCountdown
hydration (same tz class as budget due-dates + CAL-01 all-day — keep all on local-date derivation);
assistant QA slices not all live-verified; seating occupancy action-enforced; lead→project conversion
not built; currency helpers duplicated (prefer `lib/format-currency.ts`); the stale `getBudget`
double-count.

**Dev DB state (baseline — re-introspect before relying on rows):**
- `dominicciccaglione@gmail.com` — **personal**, "Dom & Jordyn 2027", wedding 2027-02-13.
- `d.ciccaglione1@gmail.com` — **business**, "Events by Jordyn". Planner projects include Mila &
  Griffin (planner-created, no `wedding_profile`, 2027-02-15, $40,000, 0 members — must remain), Matt &
  Courtney (2027-06-13), and Bryce & Emma (no date set — the v29 budget test project; its budget cards,
  installments, and payments are churn).
- `d.ciccaglione@icloud.com` — **orphaned auth user, 0 memberships** (invited-couple fixture).

---

## 14. Roadmap

**Done (v1–v28):** unified shell + routing; timeline; couple onboarding → AI plan; AI assistant;
Contracts; lead pipeline; proposals → printable contract; Stripe billing; website builder + 5-template
gallery; public RSVP; seating through SEAT-11; Soft stack chrome; landing overhaul; planner invites
(INV-01…08); vendor category/status/removal + booked slots + packages; many budget lines per vendor;
dance floor; gift registry; meals + RSVP match; household-gated RSVP; photo-led website; guest polish;
create fix + pricing; archive; invite cookie; checklist delete + assistant hygiene; Has-access live
membership; **planner workspace expansion (DASH-01, VND-08/08a, CAL-01, CON-01/01a/02)**. Migrations
**0001–0050**.

**Done (v29 — Budget page feature-complete):**
- **BUD-03** — Migration **0051**. Per-item Estimate/Actual/Difference/Paid model + `budget_payments`
  ledger; read rewire (`paidTotal`, `committed = planned-but-not-yet-paid`).
- **Row polish** — No schema. 5-column grid; optional due date on Add; Difference suppressed when
  Actual absent.
- **BUD-FILTER-01** — No schema. Status × Category filter bar; headline stays global.
- **BUD-QUICKADD-01 / 02** — No schema. Curated quick-add → empty cards; multi-select bulk insert.
- **BUD-NOTES-01** — No schema. Per-item free-text notes.
- **BUD-SCHED-01** — Migration **0052**. `payment_schedule` dated installments + waterfall past-due;
  `due_date` write-dead (drop 0053+).

Current through **0052**; next-free **0053** (the `due_date` drop, MEAL-03a, and ONB-02 all take it).

**In progress:** Dom Soft stack + LAND-01 live visual checkpoint (human) — incl. `/vendors`,
`/calendar`, `/contracts`, and the rebuilt Budget page.

**Remaining couple side:** moodboard; optional seating depth (per-seat / SEAT-07); **MEAL-03a (0053+)**;
**ONB-02 (0053+)**; **BUD-03 drop of `due_date` (0053+, after parity)**; optional website-media orphan
GC; **budget dashboard overhaul** (mockup-first); optional reconciled payment schedule (model b).

**Remaining planner side:** invoicing accepted proposals; deeper CRM; INV-06 (email delivery);
**`viewer` invite (after WRITE-01)**; PRICE-02 (Stripe Prices + checkout); **CAL-01a (task-due calendar
overlay)**; **CON-03 (real PDF + save-to-archive) if the manual re-upload proves painful**.

**Phase 4 — bridge:** lead→project conversion. **Re-audit every write policy when this ships.**

**Phase 5 — automation:** PROACTIVE assistant.

**Decided (append v29):**
- **Paid is derived from the `budget_payments` ledger only; `actual_amount` means Actual (cost), not
  Paid.** No rename (the name is honest), no backfill (would double-count).
- **Payment schedule uses independent model (a): coverage/past-due derived at read via the waterfall;
  no stored per-installment status.** Reconciled model (b) deferred.
- **`budget_items.due_date` write-dead post-0052; drop only after parity (0053+).**
- **The quick-add curated category list is a standalone UI constant, NOT `VENDOR_CATEGORIES`, no
  CHECK.** `budget_items.category` stays protected free-text.
- **The budget filter narrows only the card grid; the "paid so far" headline + Needs-attention panel
  are global.**
- **No manual "Paid in full" status boolean** (dual-source trap); if ever wanted, log a
  remaining-balance payment so the derived status flips via the ledger.
- (All prior "Decided" items from v28/v27 carry forward.)

---

## 15. Start here next (pick-up point)

The couple product is feature-complete, shareable, and payable — and the **Budget page is now fully
built** (Estimate/Actual/Difference/Paid, payment ledger, filterable cards, curated multi-select
quick-add, per-item notes, dated payment schedule with waterfall past-due). The planner product has a
CRM + collaborator invites + wedding archive + account Vendor library + authorable Calendar +
cross-project Contracts archive with templates. Plan is **couples-first launch**. Bible at **v29**.
Schema through **0052**; next-free **0053**.

**Do not** resume a Modern romantic / VND-01 layout pass; **do not** reintroduce category eyebrows /
`PACKAGE` label; **do not** store a registry claim counter; **do not** add anon SELECT on
`registry_claims` / `rsvp_attendees` / `guest_members` / `guests` / `budget_payments` /
`payment_schedule`; **do not** restore anon INSERT on `rsvp_submissions`; **do not** drop
`guests.meal_choice` until MEAL-03a; **do not** drop `budget_items.due_date` until parity (0053+);
**do not** auto-match RSVPs to guests; **do not** put Supabase imports in `components/website/`;
**do not** add a published gate to `website-media` SELECT; **do not** pull @dnd-kit into the website
editor; **do not** offer `viewer` from Access until WRITE-01; **do not** fork a second invitation
mechanism; **do not** wire PRICE-01 CTAs to invented Stripe Price IDs; **do not** lead marketing copy
with "AI"; **do not** write `archived_at` except via `set_project_archived`; **do not** let any writer
author free-text task phases or unclamped due dates; **do not** harden `budget_items.category` /
`timeline_events.owner`/`section` to enums; **do not** set the pending-invite cookie from InvitePage
render (middleware only).

**Do not (v29 budget):**
- **Do not wire `Paid = actual_amount`** — Paid derives from the `budget_payments` ledger only.
- **Do not backfill `actual_amount` into the ledger** — it double-counts money as Actual AND Paid.
- **Do not store per-installment paid status or a payment↔installment matching table** — coverage is
  the read-time waterfall.
- **Do not let the budget filter rewrite the headline / Needs-attention stats** — they are global.
- **Do not wire `lib/budget-quick-categories.ts` to `VENDOR_CATEGORIES` or CHECK
  `budget_items.category`** — protected free-text.
- **Do not colour the Past-due filter chip rosewood** — chips are controls, not status.
- **Do not add a manual "Paid in full" boolean** — dual-source trap.

**A. Dom Soft stack + LAND-01 / LAND-01a live visual checkpoint (still open).** Walk couple tabs
(incl. the **rebuilt Budget page** — filter × category, quick-add multi-select, ledger, schedule
installments, waterfall past-due, notes), planner dashboard/leads/billing/Access, `/vendors`,
`/calendar`, `/contracts`, landing, `/pricing`, login, `/invite/[token]`, `/w/[slug]`. Confirm no
hydration mismatch (countdown + calendar all-day + budget due-dates share the tz class). Fix only real
regressions.

**A2. Invite Jordyn for real** (prefer an INV-07 collaborator invite; confirm
`project_members.role = 'collaborator'` in SQL after accept).

**A3 (optional). TL-04 live checkpoint** (DJ / Officiant sheets both include the shared event).

**A4. Apply + checkpoint any un-pasted migrations through 0052.** Without 0051 budget payments/Paid
fail; without 0052 installment inserts throw PGRST205 (a file on disk is not applied — this bit us this
cycle). Earlier: without 0040 Add-person fails; 0042 photo uploads; 0043 gated full-name; 0044 archive;
0045 calendar; 0046 contract category; 0047 templates.

**A5. MEAL-03a — drop `guests.meal_choice`. Migration 0053+** (after backfill verification).

**A6. Drop `budget_items.due_date`. Migration 0053+** — only after confirming `payment_schedule` parity
(every prior single-date item has its "Balance" installment; app writes nothing to `due_date`).

**B. ONB-02 — `commitPlan` atomicity + category CHECKs. Migration 0053+.** Three sequential non-atomic
inserts → a SECURITY DEFINER function. **Also owns the category-constraint decision** across
`vendor_targets.category`, `vendors.category`, `files.category`, and `contract_templates.category` —
apply one CHECK against one canonical list, or decide deliberately not to and record why.
(`budget_items.category` stays free-text and is NOT in this set.)

**C. Budget dashboard overhaul (mockup-first).** The remaining budget work is aesthetic — a richer
headline layout / rollup beyond the current stat tiles. Mockup before any Cursor slice. The data model
(BUD-03 / BUD-SCHED-01) is complete and consumable.

**D. WRITE-01 — project-scoped write policy audit. BEFORE ANY `viewer` INVITE.** Enumerate every
project-scoped table; decide per table `can_access_project` (read-alike) vs `can_edit_project` (write);
migrate the ones that should change in one pass. Sharp `can_access_project` writes a `viewer` would
pass: `removeProjectVendor`, `deleteTask`, `files.category`/`setFileCategory`, **`budget_payments` /
`addBudgetPayment` / `removeBudgetPayment` (0051)**, and **`payment_schedule` / `addScheduleInstallment`
/ `removeScheduleInstallment` (0052)**. Collaborators (INV-07) already pass `can_edit_project`. Re-run
after Phase-4.

**E. Launch (after ONB-02 + BUD payments live + visual QA).** Separate prod Supabase org on Pro +
migrations **0001–0052** (+ 0053 if MEAL-03a / due_date-drop shipped) by hand — never `db push` —
+ storage buckets + SMTP; Vercel + domain + env; Stripe live + webhook + Portal + Tax; prod Places key;
Gmail testing mode; privacy + ToS; monitoring; **full prod smoke — real signup, deliberate
double-click, a couple + a collaborator invite round trip, planner New-wedding create, archive/unarchive,
a vendor add/remove + package link cycle, a vendor-library no-link add + guarded delete, a calendar
event round trip incl. all-day + archive-overlay, multi-line budget vendor links, a seating dance-floor
cycle, a plated RSVP + match, a gated QR + full-name RSVP, a hero/gallery upload + five-template render,
checklist delete, an assistant-built checklist, a contracts archive filter + signed download, a template
fill + Print/Save-as-PDF, a registry claim, and — v29 — a budget payment log + installment schedule +
waterfall past-due (deposit-paid-≠-past-due) round trip.**

**F. Planner depth / revenue (post-launch).** Invoicing accepted proposals; INV-06 email; `viewer`
invite (after WRITE-01); PRICE-02; CAL-01a (task-due calendar overlay); CON-03 (real PDF); reconciled
payment schedule (model b); lead→project conversion (Phase 4 — re-audit write policies).

**G. Seating — remaining (OPTIONAL).** SEAT-07 assistant mock-up (no schema); per-member seating.

**H (other rounding-out):** moodboard; assistant tools for leads/proposals/RSVP/seating/invitations/
calendar/templates/budget (re-run the §9 write-tool audit when any ship); per-seat UI; `projects`
DELETE policy decision; personal-user-with-direct-project visibility; website caching; website-media
orphan GC; currency-helper consolidation; the stale `getBudget` double-count; reconstruct 0050
`registry_teardown` rationale; regenerate `reference.html` / delete `theme-direction.html` / retire CSS
aliases; font-load scoping; countdown + calendar + budget-date hydration harden.

**Recommended path:** **visual checkpoint incl. the rebuilt Budget page + invite Jordyn (A/A2)** →
**MEAL-03a + due_date drop (A5/A6)** → **ONB-02 / 0053 (B)** → **budget dashboard mockup (C)** →
**Launch (E)** → WRITE-01 before `viewer` (D) → invoicing → INV-06 / PRICE-02 / CAL-01a / CON-03 /
reconciled schedule → conversion (F) → remaining H.