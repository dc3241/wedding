# Wedding Planning SaaS — Project Bible (v28)

Canonical state document. **Supersedes v27.** Drop this into the Project's instructions/knowledge so
any new chat picks up cold. Lives in-repo at `PROJECT_BIBLE_v28.md`. The repo's `.cursor/design.mdc`,
`app/globals.css`, `design/reference.html` (stale — see §10), and `supabase/migrations/` remain the
live source of truth; this summarizes them and the decisions behind them. Current through migration
**0047**; **next-free migration is 0048**.

**v28 records the planner-workspace expansion — Urgent-by-wedding (DASH-01), account vendor library
(VND-08 / 08a), authorable calendar (CAL-01 / 0045), and the contracts suite: archive (CON-01),
vendor-category (CON-01a / 0046), and templates (CON-02 / 0047) — atop v27:**

| Slice | What | Schema |
|---|---|---|
| **DASH-01** | Planner-dashboard Urgent regrouped into collapsible per-wedding cards (tasks + vendors both, active-scope preserved) | **NONE** |
| **VND-08** | Account-level **Vendor library** `/vendors`: grouped by category, contact/notes, preferred toggle, **account-only add (no `project_vendors` link)**, **guarded delete (orphans only)**; sidebar entry | **NONE** |
| **VND-08a** | Vendor-library category groups collapsible + count badges reflecting the active filter | **NONE** |
| **CAL-01** | Authorable planner **Calendar** `/calendar`: `calendar_events` (account-scoped), month grid + 7-day Upcoming rail, read-only ACTIVE wedding-date overlay, event source model; sidebar entry | **0045** |
| **CON-01** | Account-level **Contracts archive** `/contracts`: aggregates `files` kind='contract' across ALL projects **incl. archived**, filter by wedding + date, status chips, signed-URL download; sidebar entry | **NONE** |
| **CON-01a** | `files.category` (vendor-category id) captured at upload + inline edit; archive category filter + column | **0046** |
| **CON-02** | **Contract templates**: account-scoped `contract_templates`, author (textarea + token catalog), server merge fill, editable preview, Print/Save-as-PDF (reuses print CSS). **No PDF deps, no save-to-files** | **0047** |

Everything in v27 that isn't touched by the above carries forward unchanged: ARCH-01/01a, INV-08,
LAND-03, CHK-02/03, INV-02b, and everything they in turn carried from v26 and earlier.

> **Numbering note:** **0045 is calendar, 0046 is file category, 0047 is contract templates.**
> **MEAL-03a (drop `guests.meal_choice`) and ONB-02 now take next-free at build time (0048+).** Do not
> `db push`. **Do not offer `viewer` from Access** until WRITE-01 — collaborator is deliberately the
> only non-couple invite role today.
> **CON-03 (real PDF bytes → auto-save filled template into the project Contracts archive) is DEFERRED
> by choice** — the manual path (fill → Save-as-PDF → upload to the project Contracts tab → appears in
> archive) works end to end; CON-03 only removes one re-upload step at the cost of a permanent PDF
> dependency in a deliberately print-only app. Same posture as INV-06.
> **Marketing copy policy:** do not promote or lead with "AI"; frame as the app / "automatically" /
> "the assistant."

**Verification status (READ THIS):**
- **0031–0044** remain applied live (as recorded through v27).
- **0045 (CAL-01), 0046 (CON-01a), 0047 (CON-02)** — **APPLIED LIVE + verified this cycle.**
  - **0045:** `calendar_events` present; composite FK reads `ON DELETE SET NULL (project_id)`
    (parenthesized); an all-day event lands on the exact day cell (no tz off-by-one — the kill-shot);
    an archived wedding's date marker leaves the calendar.
  - **0046:** `files.category` present; **no new RLS policy** (rides the existing `files` `FOR ALL`
    `can_access_project` write policy); edit-then-`select category` returns the new value (UPDATE is
    not a silent no-op).
  - **0047:** `to_regclass('contract_templates')` not null; `is_account_member` ALL policy present;
    account isolation holds; the same template filled against two different weddings yields different
    couple names (real server merge, not a stub).
- **DASH-01:** one collapsible card per wedding, count = tasks + vendors, vendor rows link to the
  Vendors tab; archived weddings absent (active-scope preserved).
- **VND-08:** a library-added vendor has ZERO `project_vendors` links; guarded delete refuses linked
  vendors and removes unlinked ones. **VND-08a:** count badges reflect the active All / Preferred-only
  filter.
- **CON-01:** a contract stays listed AFTER its wedding is archived (the deliberate repository
  divergence); download is a time-limited signed URL, not a public bucket path.
- **Still open (human gate):** Dom Soft stack + LAND-01 / LAND-01a visual checkpoint — now extended to
  `/vendors`, `/calendar`, `/contracts`. See §13.

Sections changed from v27: header, **§1**, **§3**, **§4**, **§5** (0045–0047), **§6** (sidebar + Urgent
regroup + three account surfaces), **§7** (v28 slices), **§9** (coverage caveat), **§13**, **§14**,
**§15**.

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
active book, an account-level Vendor library, an authorable Calendar, and a cross-project Contracts
archive with reusable contract templates**), Stripe billing for both audiences, marketing `/` +
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
  (subscriptions), and the new account workspaces (calendar events, contract templates, the vendor
  library) are ACCOUNT-scoped** via `is_account_member(account_id)` — NO `project_id`, NO
  `can_access_project`. (RSVP submissions, seating, and invitations are project-scoped.)
- **`vendors` is ACCOUNT-scoped; `project_vendors` is the project-scoped LINK.** One vendor row can
  serve many projects in the same account. Every vendor UI action that says "remove" means **remove
  the link**, never the vendor. See §7 VND-05. **NEW (v28): the account Vendor library (VND-08) is the
  one surface that adds a `vendors` row with NO `project_vendors` link, and the one place a `vendors`
  row may be deleted — and only when it has zero links.**
- **Resolve the BUSINESS account explicitly** (`accounts.kind = 'business'` inner join), never naive
  first-membership. Couples resolve the `personal` account. Helpers in `lib/billing/resolve-account.ts`
  (`resolveBusinessAccountId`) — now used by the vendor library, calendar, and contracts surfaces in
  addition to billing.
- **CHECK-constrain status enums.** EXCEPTION: Stripe-owned vocabularies aren't constrained.
  **`project_vendors.status` is constrained (0030, widened in 0031 to include `replied`);
  `calendar_events.event_kind` is constrained (0045).** Remaining gap: the four category columns —
  see §13.
- **Billing source of truth = the webhook-updated `subscriptions` row.**
- **Self-contained snapshot for public surfaces.** Public-rendered content stores its displayed data
  on its own row — never joins live into private tables.
- **Service-role key is server-only and rare.** ONLY the Stripe webhook + billing/admin path.
- **Anon READ = one published-only RLS policy + the anon key.**
- **Anon WRITE = tightly-scoped INSERT-only RLS (or a definer RPC) + server-derived scope.** Public
  writes are RSVP (`submit_rsvp` RPC) and registry claims (INSERT). **There are exactly SIX anon
  surfaces** (three reads + one INSERT + two RPC executes) — see §4. **v28 adds NO anon surfaces.**
- **Discrete writes over client-authoritative state.** Every mutation writes by id +
  `revalidatePath`. `useOptimistic` is the sanctioned in-pattern fallback.
- **Keep public/reusable UI pure via prop injection.** `components/website/` imports NO Supabase/auth/
  server-only modules.
- **Structural enforcement beats action enforcement when it's cheap.** Where a DB constraint can make
  an invalid state unrepresentable, prefer it over an app-code check. Exemplars: BUD-02's composite
  FK; ONB-00's `already_bootstrapped` guard; 0028's partial unique index; 0029's
  `projects_account_id_immutable` trigger; 0030's `(project_id, vendor_id)` unique index; 0031's
  `(project_id, project_vendor_id)` composite FK on `vendor_targets`; **0045's `calendar_events`
  composite FK `(account_id, project_id) → projects(account_id, id)` with `ON DELETE SET NULL
  (project_id)` (enabled by a new unique index `projects (account_id, id)`), which structurally
  prevents a calendar event linking to another account's project.** Contrast seating occupancy, which
  remains action-enforced because a constraint would have been expensive.
- **NEW (v19) — structural enforcement can only act on a SHARED KEY. Say so out loud when it can't.**
  A unique index stops the same entity being linked twice. It cannot stop two *different* rows that
  describe the same real-world vendor — "Occasions at Laguna Village" (Places, has
  `external_place_id`) and "Ocassions at Laguna" (manual, null place id) share no key and never will.
  Near-duplicates are a **soft, best-effort UI warning** problem, and the cleanup tool is deletion,
  not deduplication. Don't promise a constraint that can't exist.
- **A dedicated action owns an integrity obligation.** Don't extend a generic
  `update<Thing>(id, fields)` writer with a field that carries a constraint the generic writer
  doesn't understand. `setSeatingTableKind`, `rotateSeatingTable`, `setSeatingTableSeatCount`,
  `setBudgetItemProjectVendor`, `removeProjectVendor`, `linkVendorToTarget` /
  `unlinkVendorFromTarget`, `set_project_archived` all exist for this reason.
  `linkVendorToTarget` is the sole application writer that SETs `vendor_targets.project_vendor_id`
  to a non-null value (VND-07); unlink / remove only clear it. `set_project_archived` is the sole
  writer of `projects.archived_at` (ARCH-01) — no direct app-code UPDATE. **NEW (v28):
  `deleteAccountVendor` (VND-08) refuses to delete a `vendors` row that has ANY `project_vendors`
  link — only truly unlinked library entries (orphans) are deletable, so a reference surface can
  never cascade a vendor out of a real wedding's booked band or wipe its outreach history.
  `createAccountVendor` (VND-08) is the FIRST insert into `vendors` that creates NO link.**
- **One terminal routing decision point per audience (ONB-00).** `/projects` is the ONLY place
  allowed to make a terminal routing decision for a personal or account-less account.
- **Two fields that can disagree are a bug waiting to happen; derive one from the other (ONB-01).**
- **A missing RLS policy on a writable table is a SILENT NO-OP that returns success, not an error
  (v18).** Every time a new class of user gains READ access to a table, audit every WRITE policy on
  that table for whether the new class passes it. **This audit is still outstanding for every
  project-scoped table other than `projects`** — see §13 and the WRITE-01 note in §15.
- **NEW (v19) — one concept must have ONE stored vocabulary, and the write path is where it's
  enforced.** (`vendors.category` history — normalized to ids in 0030 + VND-05. A free-text control
  wired to nothing is a vocabulary fork with a UI on it.) **v28 corollary: `files.category` and
  `contract_templates.category` also store canonical `VENDOR_CATEGORIES` ids (NO DB CHECK — mirror
  `vendors.category`), validated in-app, resolved to labels via `vendorCategoryLabel` at the read
  site. Four columns now share this posture; ONB-02 owns the single CHECK-or-not decision across all
  of them.**
- **NEW (v19) — resolve display vocabulary AT THE CALL SITE, not inside the consuming lib.**
  (`generate-outreach-draft.ts` / `vendor-enrichment.ts` take a category argument and interpolate it;
  VND-05a resolves `vendorCategoryLabel(...)` at the DB-read call site so those libs keep receiving
  human-readable text.)
- **NEW (v20) — free-text-at-rest can still be a SET at read, but ONE parser owns the split.**
  `timeline_events.owner` stays free text; `lib/timeline-owners.ts` is the only place that may parse
  an owner string. Do not normalize on write; do not invent a join table without a deliberate slice.
- **NEW (v25) — website photos live as public URLs in `content` jsonb, not as `files` rows.**
  Upload goes to the public `website-media` bucket; the couple editor persists the public URL into
  `wedding_websites.content`. Clearing an image clears the URL only — storage object cleanup is
  deferred (orphans OK). `components/website/` still imports no Supabase.
- **NEW (v27) — a value with a canonical vocabulary or derivation must be enforced at the WRITE
  BOUNDARY, on EVERY writer.** Task `phase` (`phaseFromMonthsBefore`), computed task `due_date`
  (`clampDueDateToToday`, `lib/date-months.ts`), status enums, and vendor category all have a
  canonical source. A free-text column, a CHECK-less column, or a model-supplied assistant-tool
  argument is NOT a license to author the value. Enforcement may live in the form, the server action,
  or the tool body — but it must exist on *every* path that writes the column. **Corollary (v27
  audit): where the app's column is DELIBERATELY free-text, the assistant matching that is CORRECT,
  not a gap** — `budget_items.category` and `timeline_events.owner`/`section` are authored free on
  purpose; do NOT "harden" them to enums.
- **NEW (v28) — operational views are active-scoped; repository views span archived.** Dashboard
  aggregates (ARCH-01a), the sidebar, the "Active weddings" count, and the Calendar wedding-date
  overlay all filter to `archived_at is null` — they are forward-looking operational surfaces. The
  **Contracts archive (CON-01) deliberately does NOT** — a records repository must retain a wedding's
  paperwork after it closes. Same word "archive," opposite scoping rule. The natural mistake is
  copying `.is("archived_at", null)` into the repository by habit; the CON-01 checkpoint (a contract
  still listed after its wedding is archived) exists to catch exactly that.

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
- Policies: all four gated by `can_manage_project_access`
- **`accept_project_invitation` inserts `project_members.role` from `v_inv.role`** (never hardcodes
  `'couple'`).
- **Sole app writer:** `createProjectInvitation(projectId, email, role)` — server allowlist
  `{couple, collaborator}`; rejects `viewer`.

### `project_members` (0001)

- `project_id` uuid NOT NULL FK→projects cascade
- `user_id` uuid NOT NULL FK→`auth.users` cascade
- `role` **`project_role` enum NOT NULL default `'couple'`** — values `couple | collaborator | viewer`
- `created_at` timestamptz NOT NULL default now()
- **PK is composite `(project_id, user_id)`. There is no `id` column.**
- Policies: SELECT `can_access_project(project_id)` (0001); DELETE
  `can_manage_project_access(project_id)` (0028). NO INSERT policy, NO UPDATE policy —
  `accept_project_invitation` is the only writer.

> **The `project_members` SELECT policy is recursive BY SHAPE ONLY and is SAFE. Do not re-flag it,
> and do not narrow it.** It calls `can_access_project`, which itself reads `project_members`.
> `can_access_project` is SECURITY DEFINER owned by `postgres` (`rolbypassrls = true`);
> `project_members.relforcerowsecurity = false`. Narrowing it to `user_id = auth.uid()` would break
> INV-02 (planner must see their couple's membership row to revoke it).

### Access functions (SECURITY DEFINER, `public`, granted to `authenticated`)

- **`can_access_project(project_id)`** — member of the owning account OR direct project member.
  The READ gate on every project-scoped surface. Also still the WRITE gate on most project-scoped
  tables, including `project_vendors` and `files` (so `files.category` writes ride it) — see §13.
- **`is_account_member(account_id)`** — account-scoped features (leads, proposals, subscriptions,
  **calendar events, contract templates, the vendor library**), project INSERT.
- **`can_manage_project_access(project_id)` (0028)** — `is_account_member` of the project's owning
  account. Gates the four `project_invitations` policies, the `project_members` DELETE policy, and
  `set_project_archived` (0044).
- **`can_edit_project(project_id)` (0029)** — `is_account_member` of the owning account **OR** a
  `project_members` row for `auth.uid()` with `role in ('couple','collaborator')`. Gates the
  `projects` UPDATE policy and the WRITE-01 exemplars (`registry_items`, `registry_claims` editor
  writes, `meal_options`, `guest_members`, `website-media` storage writes). **`viewer` deliberately
  excluded.**
- `can_read_vendor(vendor_id)`, `bootstrap_account_and_project(...)`.
- `account_members` RLS uses a plain `user_id = auth.uid()` predicate to avoid recursion.
- **`resolveBusinessAccountId(supabase)`** (`lib/billing/resolve-account.ts`) — `account_members` ×
  `accounts!inner(kind='business')`; the sanctioned business-account resolver for `/vendors`,
  `/calendar`, `/contracts`, and billing.

### New account-scoped tables (v28)

- **`calendar_events` (0045)** — `account_id` NOT NULL FK→accounts cascade; optional `project_id`
  via composite FK `(account_id, project_id) → projects(account_id, id)` with `ON DELETE SET NULL
  (project_id)`; `title` NOT NULL; `event_kind` CHECK
  `meeting|call|site_visit|tasting|fitting|deadline|other` default `meeting`; `starts_at` timestamptz
  NOT NULL; `ends_at` nullable; `all_day` boolean default false; `location`, `notes`; `created_at`.
  RLS: single `FOR ALL` policy `is_account_member(account_id)` (`using` + `with check`), authenticated
  only, anon revoked. Index `(account_id, starts_at)`.
- **`contract_templates` (0047)** — `account_id` NOT NULL FK→accounts cascade; `name` NOT NULL;
  `body` text default `''` (template with `{{tokens}}`); `category` nullable (VENDOR_CATEGORIES id,
  no CHECK, in-app validated); `created_at` / `updated_at`. RLS: single `FOR ALL` policy
  `is_account_member(account_id)`. Index `(account_id)`.

`files.category` (0046) is added to the existing project-scoped `files` table — NOT a new access
surface. It rides the existing `files` `FOR ALL` `can_access_project` write policy (0011); no new
policy. WRITE-01 note: `files.category` inherits the gate `files` already had — no new debt.

### `set_project_archived` + `projects.archived_at` (0044 / ARCH-01)

Unchanged from v27. Column `archived_at timestamptz` nullable (null = active). Sole writer
`set_project_archived(uuid, boolean)` — SECURITY DEFINER, `can_manage_project_access`-gated,
authenticated only. Planner dashboard Active/Archived toggle; sidebar + Active count + cross-project
aggregates (ARCH-01a) + the **Calendar wedding overlay (CAL-01)** filter to active. **The Contracts
archive (CON-01) deliberately spans archived (§3 repository rule).**

### The six public (anon) surfaces (UNCHANGED in v28)

1. **Read:** `wedding_websites` anon `SELECT using (published = true)` (0022). Riders:
   `external_registry_links` (0035), `meal_service_style` (0038), `rsvp_access_mode` (0041).
2. **Write (RPC):** `submit_rsvp(...)` — definer, anon execute (0039; extended 0041).
3. **Read:** `registry_items` anon `SELECT` gated to a published site (0035).
4. **Write:** `registry_claims` anon `INSERT` gated to published sites (0036).
5. **Read:** `meal_options` anon `SELECT` gated to a published site (0038).
6. **Read (RPC):** `lookup_rsvp_household(...)` — definer, anon execute (0041; full-name in 0043).

`rsvp_attendees` / `guest_members` / `guests` / `project_invitations` / `calendar_events` /
`contract_templates` have NO anon policy. Storage carve-out (0042 `website-media` public SELECT) is
recorded, not counted.

---

## 5. Migrations (source of truth: `supabase/migrations/`)

Applied in order. **You are the source of truth on the next number — next free is 0048.**

> **How migrations are applied here (READ THIS BEFORE SUGGESTING ANY CLI COMMAND):** by hand-pasting
> each file into the Supabase SQL editor and running it once, in order. There is NO CLI
> migration-history tracker. **`supabase db push` is FORBIDDEN.** `supabase db query --linked` for
> READS is sanctioned.

> **A migration paste must return clean. Any error means NOTHING applied.** The SQL editor wraps a
> multi-statement paste in ONE transaction; a single error rolls back the file. After every migration,
> confirm with `to_regclass` / `to_regprocedure` / `pg_policies` / `pg_indexes` before running any
> checkpoint.

> **Write migrations to be re-runnable.** `create or replace` for functions; `drop … if exists`
> before every `create policy` / `create trigger`; `create … if not exists` for indexes;
> `drop constraint if exists` before `add constraint`.

> **SQL editor gotcha:** the editor renders only the **last** statement's result set, and wide cells
> truncate. Run introspection queries **one at a time**, and coerce long definitions to booleans.

- 0001 core tenancy · 0002 checklist (`tasks`) · 0003 write access
- 0004 vendors_account · 0005 discovery_and_outreach · 0006 guests · 0007 email_credentials
- 0008 outreach_app_columns · 0009 notes · 0010 budget · 0011 files
- 0012 wedding_profile (incl. `onboarded_at`) · 0013 vendor_targets · 0014 assistant_messages
  · 0015 timeline_events
- 0016 contract_status (`files.status` draft/sent/signed) · 0017 leads · 0018 proposals
  · 0019 proposal_acceptance
- 0020 subscriptions · 0021 wedding_websites · 0022 wedding_websites_public_read
- 0023 rsvp_submissions (anon INSERT dropped in 0039) · 0024 seating_tables · 0025 seating_assignments
- 0026 budget_item_project_vendor (composite FK, `ON DELETE SET NULL (project_vendor_id)`)
- 0027 bootstrap_idempotency · 0028 project_invitations (INV-01) · 0029 project_member_updates (INV-04)
- 0030 vendor_category_and_status (VND-04) · 0031 vendor_target_link (VND-06)
- 0032 budget_item_vendor_many (BUD-04) · 0033 seating_dancefloor (SEAT-11)
- 0034 registry_items · 0035 registry_public · 0036 registry_claims · 0037 registry_legacy_links_backfill
- 0038 meal_options · 0039 rsvp_attendees · 0040 guest_members · 0041 rsvp_household_access
- 0042 website_media (WEB-IMG-01) · 0043 rsvp_full_name_lookup (RSVP-01a)
- 0044 project_archive (ARCH-01)

(For the full DDL and introspection notes on 0026–0044, see v27. Those entries are unchanged. New in
v28 below.)

### 0045 calendar_events (CAL-01) — APPLIED LIVE

Account-scoped authorable calendar. Re-runnable.

```sql
-- Enabling unique for the composite FK target (0026 pattern). id is PK, so this is trivially unique.
create unique index if not exists projects_account_id_id_key on projects (account_id, id);

create table if not exists calendar_events (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  project_id  uuid,                 -- optional link to one of THIS account's weddings
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

-- Composite FK: an event can only link to a project in its OWN account.
-- Column-specific SET NULL (project_id) is MANDATORY — a bare SET NULL would try to null the
-- NOT NULL account_id (0026 lesson).
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

**VERIFIED:** FK reads `ON DELETE SET NULL (project_id)` (parenthesized); ALL policy present; an
all-day event lands on the correct day cell (no tz off-by-one — the kill-shot); an archived wedding's
overlay marker disappears from the calendar.

### 0046 file_category (CON-01a) — APPLIED LIVE

```sql
alter table files add column if not exists category text;  -- vendor-category id; meaningful for kind='contract'; NULL = uncategorized
```

- **NO DB CHECK** — mirror `vendors.category` (in-app validated to `VENDOR_CATEGORIES` ids).
- **No new RLS policy.** Step 0 confirmed `files` already has a `FOR ALL` `can_access_project` write
  policy (0011), so category UPDATE rides it. WRITE-01 note: inherits the existing gate, adds no debt.
- **VERIFIED:** upload with a category writes the id; edit-then-`select category` returns the new value
  (proves the UPDATE is not a silent no-op).

### 0047 contract_templates (CON-02) — APPLIED LIVE

```sql
create table if not exists contract_templates (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  name        text not null,
  body        text not null default '',   -- template text with {{tokens}}
  category    text,                        -- optional VENDOR_CATEGORIES id; NULL ok
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists contract_templates_account_idx on contract_templates (account_id);

alter table contract_templates enable row level security;
drop policy if exists "contract templates managed by account members" on contract_templates;
create policy "contract templates managed by account members" on contract_templates
  for all to authenticated
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
```

`category` is NO-CHECK free text, in-app validated. **VERIFIED:** `to_regclass('contract_templates')`
not null; ALL policy present; account isolation holds.

### 0051 budget_payments (BUD-03) — APPLIED LIVE

Per-item `due_date date` + project-scoped `budget_payments` ledger. `actual_amount` **not** renamed
(now means Actual/cost; Paid = Σ ledger only). No backfill. Composite FK
`(project_id, budget_item_id) → budget_items(project_id, id)` ON DELETE CASCADE via unique
`budget_items_project_id_id_key`. RLS: single `FOR ALL` `can_access_project` (mirrors `budget_items`
write gate — WRITE-01 sharp edge). Read rewire: `paidTotal = Σ payments`;
`committed = max(allocated − paidTotal, 0)` (planned-but-not-yet-paid); over-plan alert still
compares category Actual vs Estimate.

### 0052 payment_schedule (BUD-SCHED-01) — paste by hand

Dated installments per budget item (`amount`, `due_on`, optional `label`). Backfills existing
`budget_items.due_date` → one "Balance" row (once). **Does not drop `due_date`** (write-dead in app;
drop in 0053+ after parity). RLS: `can_access_project` FOR ALL — WRITE-01 sharp edge. Waterfall:
ledger paid covers installments by due_on order; Past-due filter uses next uncovered installment.

### Column reference (v28 additions; v27 entries unchanged)

**`budget_items` (0010 + 0026 + 0048 + 0051):** `planned_amount` (Estimate); `actual_amount` (Actual
cost — not Paid); **`due_date` date nullable (0051)**; `project_vendor_id` optional link. Unique
`(project_id, id)` index for payment composite FK.

**`budget_payments` (0051):** project-scoped ledger rows — `amount`, `paid_on` date, optional `note`.
Paid is derived only from this table. Deletes cascade with the parent item.

**`projects` (0001 + 0010 + 0044 + 0045 index):** `wedding_date` date nullable; `total_budget`
numeric(12,2) nullable; `archived_at` timestamptz nullable (0044). **New unique index
`projects_account_id_id_key` on `(account_id, id)` (0045)** — enables the `calendar_events` composite
FK; do not drop it.

**`files` (0011 + 0016 + 0046):** project-scoped uploaded files. `kind` (incl. `'contract'`);
`status` draft/sent/signed (0016); `name`, `created_at`, `project_id`; private `project-files` bucket,
path `{projectId}/{uuid}-{sanitizedName}` (`buildStoragePath`). **`category` text nullable (0046)** —
VENDOR_CATEGORIES id, meaningful for `kind='contract'`, NULL = uncategorized, in-app validated, NO
DB CHECK. Writes ride the existing `FOR ALL` `can_access_project` policy.

**`calendar_events` (0045):** see the DDL above. Account-scoped; optional same-account project link;
`event_kind` CHECK; `all_day` for date-only entries (render by local date — no tz off-by-one).

**`contract_templates` (0047):** see the DDL above. Account-scoped; `body` holds the `{{token}}`
template; `category` optional VENDOR_CATEGORIES id.

**No-migration slices to date (append v28):** …ARCH-01a; CHK-02; CHK-03; **DASH-01; VND-08; VND-08a;
CON-01**. (v27 list carries forward.)

---

## 6. Shell & routing

One login. `lib/post-login-path.ts` routes by account kind.
- **Planner (business):** `/dashboard`, `PlannerShell` + `PlannerProjectSidebar`. Dashboard splits
  Active vs Archived wedding lists (`DashboardWeddingList`); sidebar and Active-weddings count read
  only `archived_at is null`. Cross-project Urgent / vendors-needing-action / tasks-due aggregates
  filter to **active project IDs only** (ARCH-01a).
- **Couple (personal):** into their project workspace (`CoupleShell`), gated by onboarding.
- **Invited member (no account):** into the invited project via `/projects` (couple **or**
  collaborator — same path; role only affects `can_edit_project` / future WRITE-01 gates). Archive
  does not revoke membership.

### Planner sidebar nav (v28)

**Dashboard / Calendar / Leads / Vendors / Contracts / Billing** — all business-account-kind gated,
never `project_members.role`. (Calendar / Vendors / Contracts are the three v28 account workspaces.)

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

`getDirectProjectIds(supabase)` (INV-03) queries `project_members` `.eq("user_id", uid)`. The
`user_id` filter is load-bearing (RLS alone does NOT scope it — a planner legitimately sees couples'
rows). It must never throw.

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
authenticated → `acceptProjectInvitation(token)` → `/projects/{projectId}` or `?error=`. The route
MUST NOT resolve the token before authentication. `consumePendingInvite` runs at BOTH auth entry
points. INV-08 closed the Next 16 Server-Component cookie-write crash — do not move the write back
into `InvitePage`.

### Dashboard — Urgent grouped by wedding (DASH-01)

The "Urgent across all weddings" section is regrouped from a flat mixed list into **collapsible
per-wedding cards** (`components/dashboard/urgent-by-wedding.tsx`, client). Each card = couple name +
total count (tasks + vendors), collapsed by default, expand to recessed rows; rows reuse the existing
`urgentHref` / `urgentTitle` / `urgentVariant` / `urgentLabel` helpers (task rows → checklist, vendor
rows → Vendors tab). Cards sorted by wedding date asc; tasks before vendors within a card. Still
`activeProjectIds`-scoped (ARCH-01a) — archived weddings never appear. The Urgent definition is
unchanged (overdue / ≤7-day tasks + `to_contact|contacted` vendors).

### Shared project workspace

`app/(app)/projects/[projectId]/layout.tsx`: tabs from `lib/project-tabs.ts`, role-gated
(`plannerOnly`). Couple working surfaces use Soft stack vocabulary. Canonical two-column split:
`lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]` with `lg:sticky lg:top-6 lg:self-start` rail.

- **Overview / Checklist / Budget / Vendors / Day-of timeline / Guests / Registry / Notes / Seating /
  Website editor / Contracts** — as recorded in v27 (unchanged). The **project** Contracts tab
  (`FileManager`, `kind='contract'`) now also captures/edits a vendor **category** per contract
  (`setFileCategory`, CON-01a).
- **Access (planner-only)** — INV-02 + INV-07 + INV-02b, unchanged.

### Account-scoped planner surfaces

- `/leads`, `/leads/[leadId]`, `/leads/[leadId]/proposals/[proposalId]/contract`, `/account/billing`
  (as before).
- **`/vendors` (VND-08 / 08a)** — Vendor library. Business-gated. All account `vendors` grouped by
  category (collapsible groups; count badges reflect the All / Preferred-only filter; empty categories
  hidden under Preferred-only), each with contact/notes + a preferred toggle. **Add creates a
  `vendors` row with the business `account_id`, `source='manual'`, and NO `project_vendors` link.**
  Orphaned vendors (zero links) appear as normal entries. **Guarded delete (unlinked only).** Actions
  in `app/(app)/vendors/actions.ts`: `createAccountVendor` / `updateAccountVendor` / `setVendorPreferred`
  / `deleteAccountVendor`. Reference-only — not couple-facing.
- **`/calendar` (CAL-01)** — authorable calendar. Business-gated. Canonical two-column split: month
  grid (prev / next / Today) + sticky 7-day Upcoming rail. Events render via a **source model** —
  `authored` (`calendar_events`, editable via `app/(app)/calendar/actions.ts`:
  `createCalendarEvent` / `updateCalendarEvent` / `deleteCalendarEvent`) and `wedding` (active
  projects' `wedding_date`, READ-ONLY marker, not editable from here). Task-due dates are a future
  third source (CAL-01a) — the render must not hardcode two sources. Event kinds:
  meeting/call/site_visit/tasting/fitting/deadline/other. All-day events render by local date (no tz
  off-by-one).
- **`/contracts` (CON-01 / 01a / 02)** — `ContractsWorkspace` with **Archive | Templates** tabs.
  Business-gated. **Archive:** all `files` `kind='contract'` across ALL projects (incl. archived —
  §3 repository rule), filter by wedding + date + category, status chips (signed→sage, sent→clay,
  draft→muted), signed-URL download via `getDownloadUrl` (`createSignedUrl`, 60s). **Templates:**
  author (textarea + token chips + optional category), fill against a wedding (+ optional vendor) via
  server merge (`template-actions.ts` + `lib/contract-template-tokens.ts`), editable preview,
  Print/Save-as-PDF (reuses the contract print CSS). No new sidebar entry for templates — they live on
  `/contracts`.

### Public surfaces (no auth, outside `(app)`)

`app/w/[slug]` (Tier 3 templates, anon read), `app/w/[slug]/rsvp`, `app/w/[slug]/registry`,
`app/invite/[token]` (Tier 2, NO data read). Marketing `/` → `components/marketing/` (LAND-03 audience
toggle); `/pricing` (PRICE-01). Marketing copy must not lead with "AI."

---

## 7. Features built

Pattern: a folder under the relevant scope with `page.tsx` (server read) + `actions.ts` (`'use server'`
writes by id + `revalidatePath`); RLS authorizes.

**The full per-slice build narratives for v1–v27 (seating, registry, meals, RSVP, website, invites,
vendors, budget, timeline, archive, checklist, marketing) are preserved in v27 §7 and carry forward
unchanged.** Current feature state and the key invariants are summarized across §3/§4/§6/§13/§14; the
v28 additions are below in full.

### v28 — Planner workspace expansion (DASH-01 / VND-08 / VND-08a / CAL-01 / CON-01 / CON-01a / CON-02)

#### DASH-01 — Urgent grouped by wedding. NO SCHEMA.

The flat "Urgent across all weddings" list (a mix of tasks and vendors) is regrouped into collapsible
per-wedding cards. Both kinds group under the same wedding card (preserves the Urgent definition;
matches the planner mental model). Row rendering + links reuse existing helpers unchanged
(`urgentHref` / `urgentTitle` / `urgentVariant` / `urgentLabel`) — task rows → checklist, vendor rows →
Vendors tab. Collapsed by default; count = tasks + vendors; cards sorted by wedding date asc; tasks
before vendors. `activeProjectIds` scope preserved (archived weddings absent).

**Files:** `app/(app)/dashboard/page.tsx`, `components/dashboard/{account-dashboard,urgent-by-wedding}.tsx`.

#### VND-08 — account vendor library (planner reference view). NO SCHEMA.

`/vendors` — planner-only, account-scoped list of all the account's `vendors`, grouped by category,
with contact/notes + a preferred toggle. Reference-only (not couple-facing). Add creates a `vendors`
row with the business `account_id`, `source='manual'`, and **no `project_vendors` link**
(`createAccountVendor`). Orphaned vendors surface as normal entries. **Guarded delete
(`deleteAccountVendor`) refuses any vendor with ≥1 `project_vendors` link** — only unlinked library
entries are removable (safe orphan cleanup; never cascades a vendor out of a wedding's booked band or
wipes outreach history). Category is a `VENDOR_CATEGORIES` picker (id at rest, `vendorCategoryLabel`
to display). **Closes the standing "orphaned account-level vendors" open item.**

**Files:** `app/(app)/vendors/{page,actions}.tsx`, `VendorLibrary` / `VendorLibraryRow` /
`AddAccountVendorForm`, sidebar.

#### VND-08a — collapsible category groups. NO SCHEMA.

Each category group is a collapsible card (header = label + count Pill + chevron; collapsed by
default; recessed vendor rows inside). The count + which categories render both reflect the active
filter: under Preferred-only the count is preferred-only and empty categories are hidden. Reuses the
DASH-01 collapse pattern.

#### CAL-01 — authorable planner calendar. Migration **0045**.

`calendar_events` (account-scoped; optional same-account project link via composite FK;
`event_kind` CHECK). `/calendar` — month grid (prev/next/Today) + 7-day Upcoming rail, canonical
two-column split. Events render via a **source model**: `authored` (editable `calendar_events`) +
`wedding` (active projects' `wedding_date`, READ-ONLY marker; wedding dates are edited only on the
project overview). All-day events render by local date (no tz off-by-one). Deferred: **CAL-01a**
task-due overlay (a future third source — the render is built not to hardcode two sources); recurring
events; reminders/notifications.

**Files:** `0045_calendar_events.sql`, `app/(app)/calendar/{page,actions}.tsx`, calendar components,
sidebar.

#### CON-01 — contracts archive. NO SCHEMA.

`/contracts` Archive tab. Aggregates `files` `kind='contract'` across ALL the account's projects —
**including archived weddings** (§3 repository divergence — deliberately NOT `archived_at is null`).
Filter by wedding + date; status chips (signed→sage / sent→clay / draft→muted); signed-URL download
reusing `getDownloadUrl` (`createSignedUrl`, 60s) — never a public URL. Read/find/download only;
upload stays in the project Contracts tab.

**Files:** `app/(app)/contracts/page.tsx`, `ContractsWorkspace` / `ContractsArchive`, sidebar.

#### CON-01a — contract vendor-category. Migration **0046**.

`files.category` (VENDOR_CATEGORIES id, no CHECK, in-app validated). Captured at upload via
`recordFile` and editable inline via `setFileCategory` (rides the existing `files` `FOR ALL`
`can_access_project` policy — no new policy). Archive gains a category filter + column
(`vendorCategoryLabel`); null → "Uncategorized".

**Files:** `0046_file_category.sql`, `recordFile` (+category), `setFileCategory`, project Contracts
tab, `/contracts` archive.

#### CON-02 — contract templates (author + fill + print). Migration **0047**.

`contract_templates` (account-scoped). Templates tab on `/contracts`: author in a plain textarea with
clickable token chips + optional category; fill against a selected wedding (+ optional vendor) via a
server merge; editable merged preview; **Print/Save-as-PDF reusing the CRM `ContractDocument` print
CSS** (`window.print`). **No PDF dependency; no file bytes; no write into `files`.** Server merge lives
in `template-actions.ts` (`fillContractTemplate`) + `lib/contract-template-tokens.ts`
(`applyTemplateTokens`; null → `__________`; unknown tokens left literal).

**Token catalog:** `{{couple_name}}`=`projects.name`, `{{wedding_date}}` (formatWeddingDate en-US),
`{{total_budget}}` (format-currency), `{{business_name}}`=`accounts.name`, `{{today}}`; vendor tokens
`{{vendor_name|category|contact_name|email|phone|address}}` (from the selected `project_vendors`⋈
`vendors`); `{{amount}}`=`project_vendors.quoted_price`. Vendor / amount tokens fill only when a
vendor is selected; otherwise blank placeholder.

**Files:** `0047_contract_templates.sql`, `app/(app)/contracts/template-actions.ts`,
`lib/contract-template-tokens.ts`, `ContractsWorkspace` (Templates tab), template editor + fill UI.

#### CON-03 — DEFERRED (manual path).

Real PDF-byte generation → auto-save the filled template into the project Contracts (files
`kind='contract'`) → appears in the archive. NOT built: the app is deliberately print-only (no PDF
dependency anywhere). The manual path works end to end (fill → Save-as-PDF → upload to the project
Contracts tab → in archive); CON-03 only removes one re-upload step at the cost of a permanent PDF
dependency. Revisit only if the re-upload is a felt pain; if built, client-side html2pdf (accept
rasterized output) is preferred over standing up serverless Chromium (which would also fork the
contract layout — a second source to maintain).

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
> `wedding_profile` row at all** — which is why Mila & Griffin reads null, and why that's correct.

> **Invited couples never see the wizard.** The discriminator is whether the user owns the account
> that owns the project, not `wedding_profile.onboarded_at`.

**The generator's response shape (ONB-01; still current):**
```json
{
  "checklist":        [ { "title": string, "monthsBeforeWedding": number } ],
  "budget":           [ { "category": string, "plannedAmount": number } ],
  "vendorCategories": [ { "category": string, "note": string } ]
}
```
**`phase` is NOT in this shape and must not be added back.** It is derived from the clamped offset via
`phaseFromMonthsBefore`. `vendorCategories[].category` MUST be one of `VENDOR_CATEGORIES`' ids.

---

## 9. AI assistant

Reactive tool-use agent in `lib/assistant/` + `components/assistant/`, per-project history in
`assistant_messages`, account-kind-aware system prompt, RLS-protected actions, plain prose.

**Tools: read + additive-write only. No delete tools.** A system-prompt **honesty rule** requires the
assistant to say plainly when it has no tool for something.

**Loop semantics:** capped at `MAX_TOOL_ITERATIONS = 8`. Cap-hit WITH committed writes → `ok:true` +
honest summary; cap-hit with NO writes → persists nothing. **Cost controls:** static tools+system
prefix prompt-cached; history windowed to 10; read-tool payloads compacted; state from LIVE reads.

> **Read coverage is complete for project-scoped planning entities but NOT for account-scoped
> entities.** As of v28 the account-scoped surfaces WITHOUT assistant coverage now include leads,
> proposals, invitations, seating, **the calendar (`calendar_events`), contract templates
> (`contract_templates`), and the account vendor library**. Website has a narrow write
> (`set_website_travel`); RSVP / full website authoring remain out of scope. The assistant has no
> vendor-removal tool and should not get one.

> **Assistant write-tool canonical audit (v27 / CHK-03). COMPLETE — closed.** 12 write tools; zero
> pass an unvalidated canonical value to the DB. Enforced-canonical: `add_task`, `update_task_status`,
> `update_guest_rsvp`, `add_vendor_target`, `set_website_travel`. Free-text-by-design (correct, not a
> gap): `add_budget_item` category, `add_timeline_event(s)` owner/section, note/guest text, website
> schedule text. **Re-run this audit when a new write tool ships — especially any leads / proposals /
> RSVP / seating / calendar / templates / contracts tool.**

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
| **1 — App chrome** | `app/(app)/`, most of `components/`, planner, forms, seating canvas, assistant, settings, Access tab, **the new `/vendors` / `/calendar` / `/contracts` workspaces** | Soft stack palette + Figtree; two depth levels; three radii; **no** accent flood; **no** Cormorant/Great Vibes |
| **2 — Emotional** | Landing, onboarding hero/welcome, empty-state heroes, `/invite/[token]` | Same palette + Figtree; larger display scale; **exactly one** deep field `--deep` per surface |
| **3 — Website + print** | `components/website/`, public `/w/[slug]`, `RunSheetDocument.tsx` print header, **the contract print document (CRM contract + CON-02 template fill)** | `--ws-*` colour + Cormorant + (Romance) Great Vibes + Hanken; the contract/run-sheet print carve-out may use Cormorant on the print header |

**Serif / script location rule:** Cormorant Garamond and Great Vibes may appear **only** in
`components/website/`, the run-sheet print header, and the contract print document.

**Status-colour meaning:** sage = settled/done/booked/signed/rsvp-yes; clay = in flight; rosewood =
wrong/overdue/over-plan/declined/rsvp-no; well/muted = neutral. **Kind is never encoded in a status
colour** (esp. seating table kinds and calendar event kinds — the calendar is NOT rainbow-coloured by
kind; kind is a neutral chip label).

> **rosewood is also the DESTRUCTIVE-ACTION colour** (muted at rest, rosewood on hover/focus). Row-level
> actions need spatial separation from status readouts and a real hover/focus affordance (VND-05b).

**Budget:** no pie/donut/circular progress; Allocated is items-only; quote money never enters a
headline figure.

**Collapse pattern (v28):** the DASH-01 per-wedding cards and the VND-08a category groups share ONE
chevron/expand affordance — do not fork a second animation/style.

**Date formatting (LAND-01a):** public/couple-identifying long wedding dates → shared
`formatWeddingDate` in `components/website/template-utils.ts`, locale **`en-US`**.

### Open design items

| Item | Status |
|---|---|
| Legacy CSS aliases (`--plum`, `--stone`, …) | **Open** — temporary; no new alias consumers |
| `design/reference.html` regenerate | **Open** |
| `design/theme-direction.html` delete | **Open** |
| Font-load scoping | **Open** (optimisation) |
| **Dom live Soft stack + LAND-01 visual checkpoint — now incl. `/vendors` / `/calendar` / `/contracts`** | **Open** — the standing human gate |
| Tier 1 date locale policy | **Open** |
| Run sheet legacy classnames | **Accepted for now** |

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
double-click; ONB-01 distribution query; INV-01 forwarded-link refusal; INV-02 revoke-then-open;
VND-05 two-count SQL pair; VND-05a reading the generated email; CHK-03 distribution. **v28 exemplars:
CAL-01 all-day-lands-on-exact-date (tz off-by-one); VND-08 `count(project_vendors)=0` after a
library add (secret-link bug) + guarded delete; CON-01 contract-still-listed-after-archive
(repository divergence); CON-01a edit-then-`select category` (silent no-op); CON-02 same-template-two-
weddings-different-couple-names (real merge vs stub).**

**Verification lessons (v18–v27, carried forward):**
1. Confirm the migration landed before believing any checkpoint (`to_regclass` / `to_regprocedure` /
   `pg_policies` first). A file on disk is NOT an applied migration.
2. Absence-shaped assertions pass trivially when the feature doesn't exist.
3. Reproduce the defect BEFORE applying the fix.
4. Scoped Step 0 questions return scoped answers — ask for EVERY writer/read site, require a count.
5. Cursor answering a Step 0 question is not Cursor acting on it — when Step 0 produces a list, say
   explicitly what happens to every item, including "left alone, and why."
6. A control the spec author cannot find on the page has not shipped.
7. An insert-only writer looks broken after a clear-and-rebuild unless you separate stale from fresh.
8. A guard that silently no-ops and a broken guard that doubles rows look identical in the UI — count
   the rows.

**Verify schema claims by introspection, not narration** (one statement at a time; coerce long defs to
booleans). **Checkpoint reports must be literal** (paste rows/counts/error codes/generated text).
**Step 0 is load-bearing — when Step 0 contradicts the prompt, Step 0 wins.** **Don't diagnose from a
screenshot — get the rows.**

**Documentation discipline:** the bible is written from the reasoning in the working session, not a
code scan. A code scan reliably catches **factual drift** (migration numbers, file paths, existence) —
use it for that, as a findings list, not as bible prose. It cannot reconstruct *why* (a deliberate
deferral, a "closed not deferred," a derive-vs-coerce choice). **Section-level diffs over full
regenerations.** Cursor does not author the bible.

**Drift watchlist (append v28):**
- Adding `archived_at is null` to the Contracts archive (it deliberately spans archived — §3).
- Creating a `project_vendors` link from the account Vendor library (account-only add is the point).
- Deleting a linked vendor from the library (guarded — orphans only).
- Adding a PDF dependency to close the template loop without a deliberate CON-03 decision.
- Linking a `calendar_events` row to a project outside its account (composite FK forbids it).
- Bare `ON DELETE SET NULL` on the `calendar_events` composite FK (must be `(project_id)`).
- DB-CHECKing `files.category` / `contract_templates.category` ad hoc (ONB-02's single decision).
- Rainbow-colouring the calendar by event kind (kind is a neutral chip, not a status colour).
- (All prior watchlist items from v27 carry forward.)

---

## 12. Compliance & security notes

- **Stripe:** webhook verifies raw-body signature; service-role only in webhook (+ billing/admin);
  entitlement read only from the `subscriptions` row. **Stripe Tax NOT set up.**
- **Public website / registry / meal-options read:** anon `SELECT` gated to a published site.
- **Public registry claim / RSVP write:** anon INSERT (claims) / `submit_rsvp` RPC only; `project_id`
  server-derived; honeypot + soft throttle. No anon SELECT on claims / submissions / attendees /
  guests. **Collects guest PII** → privacy policy.
- **Invitations:** raw tokens 32 random bytes base64url, stored only as sha256 hex; acceptance bound
  to `auth.email()`; expiry 14 days; revocation immediate. Pending-invite cookie httpOnly,
  `sameSite: lax`, secure in prod, 30-min, consumed once, **set in middleware** (INV-08).
- **Archive:** `set_project_archived` definer, `can_manage_project_access`, authenticated only.
- **Calendar / contract templates (v28):** `calendar_events` and `contract_templates` are
  account-scoped (`is_account_member` FOR ALL), authenticated only, **no anon policy, no service-role
  path**. `calendar_events.project_id` links only within the owning account (composite FK).
- **Contracts archive (v28):** downloads use time-limited signed URLs on the private `project-files`
  bucket (`createSignedUrl`, 60s) — never a public URL. `files.category` writes ride the existing
  `can_access_project` FOR ALL policy.
- **Contract templates fill (v28):** merge is server-side (RLS-scoped reads of the account's own
  project/vendor data); output is browser print only — **no file is generated or stored** (CON-03
  deferred).
- **Vendor removal (v19):** deletes the project link only; hard-deletes `outreach_messages` via FK
  cascade (the confirm names this). **The account Vendor library delete (VND-08) removes a `vendors`
  row only when it has zero `project_vendors` links** — it cannot reach a vendor used on a wedding.
- **Gmail OAuth:** `gmail.send` sensitive scope → needs verification. Testing mode caps apply.
- **Signup:** `auth.signUp` only; no tenant created at signup (bootstrap on OnboardingForm, guarded).
- **Production infra:** prod belongs in a **separate Supabase org on Pro**. Fresh prod project,
  migrations **0001–0047** applied by hand once each in order (NEVER `db push`), storage buckets
  (`project-files` + `website-media`) + policies recreated, real SMTP, prod domain in auth redirect
  URLs. See the Launch Prep Runbook.
- Set Anthropic + Google Cloud + Stripe + Supabase billing/spend alerts.

---

## 13. Known caveats / things to verify

**Closed by earlier versions (v10–v27):** BUD-02 rail + variance; 0026 introspection; ONB-00/ONB-01;
the `projects.onboarded_at` misclaim; invitation RLS asymmetry (0029); vendor category three-
vocabularies (0030 + VND-05/05a); no vendor removal (`removeProjectVendor`); duplicate discovered-
vendor links; `replied` unreachable (0031); booked-slot vs category-slot independence (VND-06/07);
multi-owner run sheets (TL-04); one-vendor-many-slots (VND-07); one-line-per-vendor (BUD-04/0032);
dance floor (SEAT-11); registry (REG-01…03); meals + RSVP match (MEAL-01…03); household-gated RSVP
(RSVP-01/01a); website photos + sections (WEB-*); collaborator invites (INV-07); planner create
(CREATE-01); pricing/marketing (LAND-02/03, PRICE-01); archive (ARCH-01/01a); invite cookie (INV-08);
checklist delete + assistant phase/date (CHK-02/03); Has-access live membership (INV-02b). Full detail
in v27 §13.

**Closed by v28:**
- **Orphaned account-level vendors** — CLOSED by VND-08: orphans surface in the vendor library as
  normal entries and are exactly the guarded-delete set. An account-level vendor library UI now exists
  and handles them, as anticipated in the v19 open item.

**Open — v28 (deliberate deferrals + gaps):**
- **CON-03 deferred (manual PDF path).** Filled templates print/save via the browser only; auto-save
  into the Contracts archive needs a PDF-byte mechanism the app deliberately lacks. Manual re-upload
  is the path. Deferred like INV-06.
- **CAL-01a deferred (task-due calendar overlay).** The calendar shows authored events + active
  wedding dates only; task deadlines are not yet a calendar source (they live in dashboard Urgent).
  The source model is built to accept them without a refactor.
- **Contract category axis is vendor-only.** `files.category` / `contract_templates.category` reuse
  `VENDOR_CATEGORIES` — there is no "couple/client agreement" bucket. If a party-type axis (vendor vs
  couple) is wanted, it's a small additive field, not a rebuild.
- **`{{amount}}` has no project-level source.** It fills only from `project_vendors.quoted_price`
  (vendor contracts). A couple contract's `{{amount}}` is a blank placeholder (the only project-level
  money is `total_budget`, which is not the same thing) — the planner types it.
- **`files.category` rides the existing `can_access_project` FOR ALL write gate** (WRITE-01 note — no
  new debt; inherits `files`' existing posture).
- **Two more NO-CHECK canonical columns** — `files.category` + `contract_templates.category` join
  `vendors.category` + `vendor_targets.category`; ONB-02's category-constraint decision now spans all
  four against one list.

**Open — security / schema (carried forward + v28):**
- **`viewer` can write on every project-scoped table except `projects` and the WRITE-01 exemplars**
  (`registry_items`, `registry_claims` editor writes, `meal_options`, `guest_members`, `website-media`
  storage). `project_vendors`, `tasks`, `budget_items`, **`budget_payments` (BUD-03 / 0051)**,
  **`payment_schedule` (BUD-SCHED-01 / 0052)**, `guests`,
  `notes`, `timeline_events`, `seating_*`, `files` (incl. the new `category`), rsvp member writes, etc.
  still gate writes on `can_access_project`, which a `viewer` passes. Unreached today (Access issues only
  `{couple, collaborator}`). **WRITE-01 before any `viewer` invite.**
- **`projects` has NO DELETE policy** (silent-no-op shape, unreached).
- **Four category columns have NO CHECK** — form pickers + in-app validation keep garbage out in
  practice; the gap is structural. **ONB-02 (next-free / 0048+) owns the decision** across
  `vendors` / `vendor_targets` / `files` / `contract_templates`.
- **`guests.meal_choice` still present (inert).** Drop in **MEAL-03a / 0048+** after backfill
  verification.
- **`website-media` public SELECT has no published gate** — intentional; do not "fix" without a
  product decision.
- **`project_invitations.invited_by` / `accepted_by` have no FK to `auth.users`** — cosmetic.
- **`budget_items.category` / `timeline_events.owner`/`section` free-text** — deliberate; do not enum.
- **`tasks.phase` free-text**; past `wedding_date` still permitted — phase is derived by every writer
  (§3), the column carries no CHECK.

**Open — invitation feature (deliberate gaps):**
- A user who ALREADY has a personal account can accept an invitation, but routing sends personal users
  to `getCoupleDestinationPath` — their direct project stays invisible. Test with an account-less
  fixture.
- Dual-account foreclosed by 0027, deliberately (reversible in one `create or replace`).
- No email delivery (INV-06). `viewer` invite deferred (WRITE-01). Collaborator shipped (INV-07).
  Pending-invite cookie lives in **middleware** (INV-08).

**Open — Soft stack / design (the standing human gate):**
- **Dom live Soft stack + LAND-01 / LAND-01a visual checkpoint** across couple tabs, planner
  dashboard/leads/billing/Access, **`/vendors` / `/calendar` / `/contracts`**, landing, `/pricing`,
  login, `/invite/[token]`, and `/w/[slug]` date hydration.
- Tier 1 date locale policy; `design/reference.html` stale; `design/theme-direction.html` to delete;
  legacy CSS aliases; font-load scoping.

**Open — other (carried forward):**
- VND-05 checkpoints a/c/e/f/g believed good (g spot-check if outreach quality looks off).
- Website-media storage orphans after clear/remove (content URL cleared; object not deleted).
- WeddingCountdown hydration (SSR vs client day-boundary) — prefer client-only mount if it reappears.
  **Same tz class as CAL-01 all-day placement — keep both on local-date derivation.**
- Assistant QA slices typecheck clean; not all live-verified in one session.
- Seating occupancy action-enforced; seats all guests regardless of RSVP; still per `guests.id`.
- Lead→project conversion NOT built (Phase 4).
- Currency helpers duplicated — prefer `lib/format-currency.ts`.
- **Apply + Dom-checkpoint 0034–0047 live** if any not yet pasted (0040 `guest_members`; 0042
  website photos; 0043 gated full-name; 0044 archive; **0045 calendar; 0046 file category; 0047
  contract templates**).

**Dev DB state (baseline — re-introspect before relying on rows):**
- `dominicciccaglione@gmail.com` — **personal**, "Dom & Jordyn 2027", wedding 2027-02-13.
- `d.ciccaglione1@gmail.com` — **business**, "Events by Jordyn". Planner projects include Mila &
  Griffin (planner-created, no `wedding_profile`, 2027-02-15, $40,000, 0 members — must remain) and
  Matt & Courtney (2027-06-13, the v27 checklist test project — task rows are churn). (Screenshots this
  cycle also show a "Bryce & Emma — No date set" planner project and "Faulkner" / "Florals" / "Pacific
  Brides Mobile Makeup and Hair" vendors in the library — expected fixtures, re-introspect.)
- `d.ciccaglione@icloud.com` — **orphaned auth user, 0 memberships** (invited-couple fixture).

---

## 14. Roadmap

**Done (v1–v27):** unified shell + routing; timeline; couple onboarding → AI plan; AI assistant;
Contracts; lead pipeline; proposals → printable contract; Stripe billing; website builder + 5-template
gallery; public RSVP; seating through SEAT-11; Soft stack chrome; landing overhaul; planner invites
couples + collaborators (INV-01…08); vendor category/status/removal + booked slots + packages
(VND-04…07b); many budget lines per vendor (BUD-04); dance floor (SEAT-11); gift registry
(REG-01…04); meals + RSVP match (MEAL-01…03); household-gated RSVP (RSVP-01/01a); photo-led website
(WEB-*); guest polish (GST-01); create fix + pricing (CREATE-01, LAND-02/03, PRICE-01); archive
(ARCH-01/01a); invite cookie (INV-08); checklist delete + assistant hygiene (CHK-02/03); Has-access
live membership (INV-02b). Migrations **0001–0044**.

**Done (v28 — planner workspace expansion):**
- **DASH-01** — No schema. Urgent grouped by wedding (collapsible, tasks+vendors, active-scoped).
- **VND-08 / 08a** — No schema. Account vendor library (account-only add, guarded orphan-only delete,
  collapsible categories). Closes the orphaned-vendor open item.
- **CAL-01** — Migration **0045**. Authorable calendar (`calendar_events`, composite FK, month grid +
  upcoming rail, active wedding overlay, source model).
- **CON-01** — No schema. Contracts archive (spans archived; wedding+date filters; signed download).
- **CON-01a** — Migration **0046**. `files.category` capture + filter.
- **CON-02** — Migration **0047**. Contract templates (author + server merge + Print/Save-as-PDF; no
  PDF deps).
- **CON-03** — DEFERRED (manual path).

Current through **0047**; next-free **0048** (MEAL-03a drop preferred; ONB-02 may take it).

**In progress:** Dom Soft stack + LAND-01 live visual checkpoint (human) — now incl. `/vendors`,
`/calendar`, `/contracts`. Dom apply + checkpoint any un-pasted migrations through 0047.

**Remaining couple side:** moodboard; optional seating depth (per-seat / SEAT-07); **MEAL-03a
(0048+)**; **ONB-02 (0048+)**; **BUD-03 (pre-launch)**; optional website-media orphan GC.

**Remaining planner side:** invoicing accepted proposals; deeper CRM; INV-06 (email delivery);
**`viewer` invite (after WRITE-01)**; PRICE-02 (Stripe Prices + checkout); **CAL-01a (task-due
calendar overlay)**; **CON-03 (real PDF + save-to-archive) if the manual re-upload proves painful**.

**Phase 4 — bridge:** lead→project conversion. **Re-audit every write policy when this ships.**

**Phase 5 — automation:** PROACTIVE assistant.

**Decided (append v28):**
- **Operational planner views are active-scoped; the Contracts archive is a repository that spans
  archived weddings.** Do not add `archived_at is null` to `/contracts`.
- **The account Vendor library add creates NO `project_vendors` link; its delete is orphan-only.** A
  vendors-row delete anywhere else remains not exposed.
- **The app stays print-only — no PDF dependency.** CON-02 reuses `window.print`; CON-03 (real PDF) is
  deferred; if ever built, client-side html2pdf is preferred over serverless Chromium.
- **`calendar_events.project_id` links only within the owning account** (composite FK, 0026 pattern);
  `all_day` events render by local date (no tz off-by-one).
- **Calendar events author via `calendar_events`; wedding dates are a READ-ONLY overlay** (edited only
  on the project overview).
- **`files.category` / `contract_templates.category` store canonical `VENDOR_CATEGORIES` ids**, in-app
  validated, no DB CHECK — the CHECK-or-not decision is ONB-02's, across all four category columns.
- **Contract templates merge server-side; output is browser-print only** (no file bytes until CON-03).
- (All prior "Decided" items from v27 carry forward: AI = Claude; Gmail outreach; Stripe flat monthly;
  Soft stack chrome; signup creates no tenant; invited members get project membership only; hashed
  invite tokens; seating per `guests.id`; budget Allocated items-only; near-duplicate vendors are a
  soft warning; `vendors.category` stores ids; `timeline_events.owner` free-text SET-at-read; every
  `tasks` writer derives phase + floors due_date; registry price display-only; RSVP write is
  `submit_rsvp` only; `guests.party_size` is the invited cap; website photos in-product; gated RSVP
  exact full-name; marketing copy must not lead with "AI"; pending-invite cookie set in middleware;
  `projects.archived_at` written only via `set_project_archived`.)

---

## 15. Start here next (pick-up point)

The couple product is feature-complete, shareable, and payable; the planner product now has a CRM +
collaborator invites + wedding archive + **an account Vendor library, an authorable Calendar, and a
cross-project Contracts archive with reusable contract templates**. Plan is **couples-first launch**.
Bible at **v28**. Schema through **0047**; next-free **0048**.

**Do not** resume a Modern romantic / VND-01 layout pass. **Do not** reintroduce category eyebrows /
`PACKAGE` label (VND-07a) or suppress single-category chips (VND-07b). **Do not** store a registry
claim counter; **do not** add anon SELECT on `registry_claims` / `rsvp_attendees` / `guest_members` /
`guests`; **do not** restore anon INSERT on `rsvp_submissions`; **do not** drop `guests.meal_choice`
until MEAL-03a; **do not** auto-match RSVPs to guests; **do not** put Supabase imports in
`components/website/`; **do not** add a published gate to `website-media` SELECT; **do not** pull
@dnd-kit into the website editor; **do not** offer `viewer` from Access until WRITE-01; **do not** fork
a second invitation mechanism; **do not** wire PRICE-01 CTAs to invented Stripe Price IDs; **do not**
lead marketing copy with "AI"; **do not** write `archived_at` except via `set_project_archived`;
**do not** let any writer author free-text task phases or unclamped due dates; **do not** harden
`budget_items.category` / `timeline_events.owner`/`section` to enums; **do not** set the pending-invite
cookie from InvitePage render (middleware only).

**Do not (v28):**
- **Do not add `archived_at is null` to the Contracts archive** — it deliberately spans archived
  weddings (repository, not operational).
- **Do not create a `project_vendors` link from the account Vendor library** — account-only add is the
  point; delete is orphan-only.
- **Do not add a PDF dependency to close the template loop without a deliberate decision** — CON-03 is
  deferred; the manual path stands.
- **Do not link a `calendar_events` row to a project outside its account** — the composite FK forbids
  it; keep it (and keep `SET NULL (project_id)` parenthesized).
- **Do not DB-CHECK `files.category` / `contract_templates.category` ad hoc** — that is ONB-02's single
  decision across all four category columns.
- **Do not rainbow-colour the calendar by event kind** — kind is a neutral chip label.

**A. Dom Soft stack + LAND-01 / LAND-01a live visual checkpoint (still open).** Walk couple tabs,
planner dashboard/leads/billing/Access, **`/vendors` (library grouping + preferred filter + no-link
add + guarded delete), `/calendar` (month toggle, all-day placement, active wedding overlay,
archive-drops-marker), `/contracts` (Archive incl. archived + signed download; Templates fill →
Print)**, landing, `/pricing`, login, `/invite/[token]`, `/w/[slug]`. Confirm no hydration mismatch
(countdown + calendar all-day share the tz class). Fix only real regressions.

**A2. Invite Jordyn for real** (prefer an INV-07 collaborator invite; confirm
`project_members.role = 'collaborator'` in SQL after accept).

**A3 (optional). TL-04 live checkpoint** (DJ / Officiant sheets both include the shared event; group
by owner shows the combined string at rest).

**A4. Apply + checkpoint any un-pasted migrations through 0047.** Without 0040 Add person fails
(PGRST205); without 0042 photo uploads fail; without 0043 gated full-name breaks; without 0044 archive
errors; **without 0045 the calendar RPC/table is missing; without 0046 contract category writes fail
against a missing column; without 0047 templates no-op against a missing table.**

**A5. MEAL-03a — drop `guests.meal_choice`. Migration 0048+** (after backfill verification).

**B. ONB-02 — `commitPlan` atomicity + category CHECKs. Migration 0048+.** Three sequential non-atomic
inserts → a SECURITY DEFINER function. **Also owns the category-constraint decision** across
`vendor_targets.category`, `vendors.category`, **`files.category`, and `contract_templates.category`**
— apply one CHECK against one canonical list, or decide deliberately not to and record why.

**C. BUD-03 — budget payments + deadlines (pre-launch).** `budget_payments` child table (0051 live);
derive Paid / `committed` from ledger (`committed` = planned-but-not-yet-paid). Data-model + item-row
UI shipped this slice; Category/Unpaid/Paid-in-full/Past-due filter + dashboard overhaul = next.
Do **not** dual-source Paid from `actual_amount`. Assistant `getBudget` double-count still stale.

**D. WRITE-01 — project-scoped write policy audit. BEFORE ANY `viewer` INVITE.** Enumerate every
project-scoped table; decide per table `can_access_project` (read-alike) vs `can_edit_project` (write);
migrate the ones that should change in one pass. `removeProjectVendor`, `deleteTask`,
`files.category`/`setFileCategory`, **`budget_payments` / `addBudgetPayment` /
`removeBudgetPayment` (BUD-03)**, and **`payment_schedule` / `addScheduleInstallment` /
`removeScheduleInstallment` (BUD-SCHED-01)** are the sharp `can_access_project` writes a `viewer`
would pass. Collaborators (INV-07) are intended editors and already pass `can_edit_project`. Re-run
after Phase-4.

**E. Launch (after ONB-02 + BUD-03 + visual QA).** Separate prod Supabase org on Pro + migrations
**0001–0047** (+ 0048 if MEAL-03a shipped) by hand — never `db push` — + storage buckets + SMTP;
Vercel + domain + env; Stripe live + webhook + Portal + Tax; prod Places key; Gmail testing mode;
privacy + ToS; monitoring; **full prod smoke — real signup, deliberate double-click, a couple + a
collaborator invite round trip, planner New-wedding create (CREATE-01), archive/unarchive (ARCH-01), a
vendor add/remove + package link cycle (VND-07), a vendor-library no-link add + guarded delete
(VND-08), a calendar event round trip incl. all-day + archive-overlay (CAL-01), multi-line budget
vendor links (BUD-04), a seating dance-floor cycle (SEAT-11), a plated RSVP + match (MEAL), a gated QR
+ full-name RSVP (RSVP-01/01a), a hero/gallery upload + five-template render (WEB), checklist delete
(CHK-02), an assistant-built checklist (canonical phases, no past dates — CHK-03), a contracts archive
filter + signed download (CON-01), a template fill + Print/Save-as-PDF (CON-02), and a registry
claim.**

**F. Planner depth / revenue (post-launch).** Invoicing accepted proposals; INV-06 email; `viewer`
invite (after WRITE-01); PRICE-02; **CAL-01a (task-due calendar overlay)**; **CON-03 (real PDF +
save-to-archive)**; lead→project conversion (Phase 4 — re-audit write policies).

**G. Seating — remaining (OPTIONAL).** SEAT-07 assistant mock-up (no schema); per-member seating is a
separate future slice.

**H (other rounding-out):** moodboard; assistant tools for leads/proposals/RSVP/seating/invitations/
calendar/templates (re-run the §9 write-tool audit when any ship); per-seat UI; `projects` DELETE
policy decision; personal-user-with-direct-project visibility; website caching; website-media orphan
GC; currency-helper consolidation; regenerate `reference.html` / delete `theme-direction.html` / retire
CSS aliases; font-load scoping; countdown + calendar all-day hydration harden.

**Recommended path:** **visual checkpoint incl. the three new workspaces + invite Jordyn (A/A2)** →
**MEAL-03a (A5)** → **ONB-02 / 0048 (B)** → **BUD-03 (C)** → **Launch (E)** → WRITE-01 before `viewer`
(D) → invoicing → INV-06 / PRICE-02 / CAL-01a / CON-03 → conversion (F) → remaining H.