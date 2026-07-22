# Wedding Planning SaaS — Project Bible (v15)

Canonical state document. **Supersedes v14.** Drop this into the Project's instructions/knowledge so
any new chat picks up cold. Lives in-repo at `PROJECT_BIBLE_v15.md`. The repo's `.cursor/design.mdc`,
`app/globals.css`, `design/reference.html` (stale — see §10), and `supabase/migrations/` remain the
live source of truth; this summarizes them and the decisions behind them. Current through migration
**0027** and the build of: the planner CRM, Stripe billing (both audiences), the wedding website
builder + full 5-template gallery, public RSVP, the seating builder through sweetheart/head treatment
+ rotation + kind-aware seat layout + **SEAT-08…10**, the **page-by-page polish pass** (CHK-01,
SET-01, TL-01/02/03, BUD-01/02/01a), the **signup + plan-generation repair** (ONB-00 / 0027, ONB-01),
the **Soft stack (C1) chrome pass** (v11), and the **landing overhaul** (**LAND-01** product-preview
marketing surface + **LAND-01a** `formatWeddingDate` consolidation / `en-US` pin). **LAND-01 /
LAND-01a / SEAT-08…10: no schema.** Tier 3 public websites keep `--ws-*` + Cormorant; marketing
embeds a real Romance template thumbnail so serif stays in `components/website/`.

**v15 records LAND-01 + LAND-01a.** Soft stack chrome landed in **v11**; v12 was a documentation
sync. v10 fixed the couple's first ninety seconds (ONB-00 / ONB-01). v13–v14 completed seating
drag/rotate + seat-count edit + by-table breakdown. v15 rebuilds the marketing landing into
product-preview cards (hero tabbed Checklist/Budget/Seating demos, workspace mini-mockups, scroll
reveal, one `--deep` CTA) and consolidates wedding-date formatting so public `/w/[slug]` dates
render identically for every visitor (`en-US`, shared helper). No migration.

**Verification status (READ THIS):**
- **v10's flags remain closed** (BUD-02 / BUD-01a live-verified; 0026 constraintdef introspected;
  ONB-00 / ONB-01 live-verified including deliberate double-click and phase distribution).
- **Soft stack (v11) is code-complete and typecheck-clean.** Dom has **not** yet run a full live
  visual checkpoint across every Soft-stacked surface the way ONB slices were verified. Treat visual
  QA as the next human gate — Cursor cannot authenticate to the app.
- **SEAT-08 live-verified by Dom.** **SEAT-09 / SEAT-10 implemented** (formal SEAT-09 guard
  checkpoint remains Dom's if not already closed).
- **LAND-01 implemented** (typecheck-clean; Cursor browser verified tabs / checklist % / five-template
  date harness). Dom owns the full LAND-01 live checkpoint (serif audit, reduced-motion, mobile,
  interactions) — Cursor cannot authenticate for Overview/run-sheet hydration checks while logged out.
- **LAND-01a implemented** (shared `formatWeddingDate` + survivors; zero `toLocaleDateString(undefined`
  left). **Open follow-up:** the repo-wide `en-US` pin also hit many Tier 1 due-date / stamp formatters
  that may *want* viewer locale — confirm before treating that as intentional product policy (see §10).
- **Nothing schema-blocking.** Next-free migration is still **0028** (reserved for ONB-02).

Sections changed from v14: header (v15 + LAND-01/01a), **§5** (no-migration list), **§6**
(marketing landing), **§7** (LAND-01 / LAND-01a), **§10** (new tokens + date formatting), **§14**
(Done v15 + Decided), **§15** (pick-up). Current through migration **0027**; **next-free migration
is 0028.**

**Companion doc:** a separate **Launch Prep Runbook** exists (ops checklist for going to production).
This bible covers product/architecture state; the runbook covers deployment. Keep both.

**Repo home:** `PROJECT_BIBLE_v15.md`. Also paste into Cursor project instructions/knowledge for cold
starts. Repo truth for design is `.cursor/design.mdc` + `app/globals.css` (Soft stack **live** —
do not treat design.mdc as still waiting on STYLE-01 token application).

---

## 1. What this is

An AI-native wedding-planning SaaS competing with Zola, The Knot, and Aisle Planner, serving BOTH
couples and wedding planners on one platform.

**Core architecture — "unified foundation, two experiences":** one app, one auth, one data model.
A couple is a `personal` account owning exactly ONE project (their wedding); a planner is a
`business` account owning MANY projects (one per client). Not two products — two experiences over
one foundation, differentiated by routing and role-gated tabs. (The "two separate products" approach
was explicitly rejected.)

The app spans: the couple planning product (onboarding → AI plan, checklist, vendors, guests, budget,
notes, files, day-of timeline, in-app AI assistant, seating builder), a planner CRM (contracts, lead
pipeline, proposals → accepted agreement → printable contract), Stripe billing for both audiences,
and a public, shareable wedding website with a 5-template gallery and public RSVP intake. The couple
product is feature-complete, shareable, and payable — Soft stack chrome is applied in code; launch
is pending ONB-02 / BUD-03 / production deployment (see §15), not a Modern romantic polish pass.

---

## 2. Stack

- Next.js (App Router, TypeScript, React Server Components)
- Supabase (Postgres **17.6**, Auth, Row Level Security, Storage)
- Tailwind CSS (v4 `@theme inline` — Soft stack tokens mapped in `app/globals.css`)
- Anthropic Claude — model centralized in `lib/anthropic-model.ts` as `ANTHROPIC_MODEL`
  (`claude-sonnet-4-6`, env-overridable). Plan generation, outreach drafts, vendor enrichment,
  the assistant.
- Google Places API (New) — vendor discovery
- Gmail OAuth (scope `gmail.send`) — sending outreach from the couple's own mailbox
- Stripe — subscription billing for couples and planners (flat monthly, test mode)
- @dnd-kit (`core`, `sortable`, `utilities`) — lead pipeline kanban only. Seating uses its own SVG
  pointer drag (SEAT-08) plus click-to-place / click-empty-to-move / arrow nudge — **not** @dnd-kit
  (see §7).
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
  `can_access_project`. (RSVP submissions and seating — tables AND assignments — ARE project-scoped.)
- **Resolve the BUSINESS account explicitly** (`accounts.kind = 'business'` inner join), never naive
  first-membership. Couples resolve the `personal` account. Helpers in `lib/billing/resolve-account.ts`.
  **v10 note:** `lib/account-context.ts` violated this rule for months — fixed by ONB-00; see §6/§13.
- **CHECK-constrain status enums.** EXCEPTION: Stripe-owned vocabularies aren't constrained.
  (Known gap: `project_vendors.status` has NO CHECK — see §13.)
- **Billing source of truth = the webhook-updated `subscriptions` row.** Never granted from a
  checkout redirect/success URL/client claim.
- **Self-contained snapshot for public surfaces.** Public-rendered content stores its displayed data
  on its own row — never joins live into private tables.
- **Service-role key is server-only and rare.** ONLY the Stripe webhook + billing/admin path.
- **Anon READ = one published-only RLS policy + the anon key.**
- **Anon WRITE = tightly-scoped INSERT-only RLS + server-derived scope.** The ONLY public write is
  RSVP intake; the server action derives `project_id` from the slug — never trusts a client-sent id.
- **Discrete writes over client-authoritative state.** Every mutation writes by id + `revalidatePath`;
  there is NO client-authoritative-for-session / skip-revalidate exception anywhere in the app.
  `useOptimistic` is the sanctioned in-pattern fallback if a round-trip is ever noticeable.
- **Keep public/reusable UI pure via prop injection.** `components/website/` imports NO Supabase/auth/
  server-only modules; interactive/public-write UI is injected as a prop (e.g. `rsvpSlot`).
- **Structural enforcement beats action enforcement when it's cheap.** Where a DB constraint can make
  an invalid state unrepresentable, prefer it over an app-code check. BUD-02's composite FK is the
  exemplar. **ONB-00's `already_bootstrapped` guard is the second** — it lives in the SECURITY DEFINER
  function because *the function is the only writer*. Contrast seating occupancy, which remains
  action-enforced because a constraint would have been expensive.
- **A dedicated action owns an integrity obligation.** Don't extend a generic
  `update<Thing>(id, fields)` writer with a field that carries a constraint the generic writer
  doesn't understand. `setSeatingTableKind`, `rotateSeatingTable`, `setSeatingTableSeatCount`,
  `setBudgetItemProjectVendor` all exist for this reason.
- **One terminal routing decision point per audience (ONB-00).** `/projects` is the ONLY place
  allowed to make a terminal routing decision for a personal account. Every other reader of account
  context falls back to `/projects` and lets it decide. Five call sites currently rely on this
  property. A sixth that decides for itself rebuilds ONB-00's dead end somewhere new. See §6/§13.
- **Two fields that can disagree are a bug waiting to happen; derive one from the other (ONB-01).**
  The plan generator emitted `phase` AND `monthsBeforeWedding` as independent fields; the fix was
  **deleting the field**. The model emits the offset only; phase is derived. Same family as
  "summing two different things into one headline figure" (BUD-01) and "naming two different things
  with one word" (TL-01).

**Soft stack design don'ts (Tier 1 chrome — see §10 / `.cursor/design.mdc`):**
- No raised-inside-raised stacking.
- No Tier 1 accent floods (`--accent-wash` for pills/washes only).
- No Cormorant or Great Vibes outside Tier 3 (and the run-sheet print-header carve-out).
- No ad-hoc radius utilities — use `--radius-card` / `--radius-inner` / `--radius-pill`.
- No florals, photographic ornament, gold/metal gradients, decorative (non-hierarchical) shadows.
- Do not import Tier 1 Soft stack tokens as website colour; websites read `--ws-*` only.

---

## 4. The access model (the spine)

Tables: `accounts` (kind: personal | business), `account_members`, `projects`, `project_members`.

Access functions (SECURITY DEFINER, `public`, granted to `authenticated`):
- `can_access_project(project_id)` — member of the owning account OR direct project member.
- `is_account_member(account_id)` — project create/update AND account-scoped features
  (leads, proposals, subscriptions).
- `can_read_vendor(vendor_id)`, `bootstrap_account_and_project(...)`.
- `account_members` RLS uses a plain `user_id = auth.uid()` predicate to avoid recursion.

> **`bootstrap_account_and_project` is the ONLY insert path into `accounts` / `account_members`**
> (verified at ONB-00 Step 0: no TS inserts, no `on auth.users` trigger, no `handle_new_user`).
> That fact is what makes 0027's in-function idempotency guard airtight. **If a second writer is ever
> introduced, the guard stops being sufficient** — put the guard where the writer is, or don't add
> the writer.

> **Note the `projects` UPDATE gate (relevant to SET-01 and the budget target editor):** the "members
> update projects" policy gates on **`is_account_member(account_id)` ONLY** — NOT
> `can_access_project`. This is stricter than the read gate on project surfaces. Today the two
> coincide (no cross-account direct project membership is live); they diverge under Phase-4
> lead→project conversion. See §13.

**The two public (anon) surfaces:**
1. **Read:** `wedding_websites` has an anon `SELECT` policy `using (published = true)` (0022).
2. **Write:** `rsvp_submissions` has an anon `INSERT` policy gated to published sites (0023), NO anon
   read/update/delete. The only anonymous write in the app.

Everything else (including all seating tables and `budget_items`) is `authenticated`-only, gated by
the appropriate access function.

---

## 5. Migrations (source of truth: `supabase/migrations/`)

Applied in order. **You are the source of truth on the next number — next free is 0028.**

> **How migrations are applied here (READ THIS BEFORE SUGGESTING ANY CLI COMMAND):** by hand-pasting
> each file into the Supabase SQL editor and running it once, in order. There is NO CLI
> migration-history tracker; `supabase migration repair` and `schema_migrations` are irrelevant.
> **`supabase db push` is FORBIDDEN** — it reads a tracker that is empty here and would try to apply
> all 27 files from the top. Cursor suggested it at BUD-02 and was overruled. `supabase db query
> --linked` for READS is sanctioned and is the correct introspection path.
>
> Re-pasting an already-applied `CREATE TABLE` produces a harmless `42P07 ... already exists`. Cursor
> sometimes applies a new migration to the remote DB itself while building a slice; if so, your
> hand-paste is the second apply and `42P07`s — benign, ignore, confirm exactly one file per table
> exists. **0027 is `create or replace function`, so re-pasting it is idempotent — no `42P07`.**

> **SQL editor gotcha (v10):** the Supabase SQL editor renders only the **last** statement's result
> set, and wide cells truncate at the pane edge. Run introspection queries **one at a time**, and when
> the answer is a long definition, coerce it to a boolean (`... like '%clause%' as flag`) so it cannot
> clip. This ate two attempts at reading 0026 and 0027.

- 0001 core tenancy (incl. `projects.wedding_date` — date, nullable) · 0002 checklist (`tasks`)
  · 0003 write access (`is_account_member`, `bootstrap_account_and_project`)
- 0004 vendors_account · 0005 discovery_and_outreach · 0006 guests · 0007 email_credentials
- 0008 outreach_app_columns · 0009 notes · 0010 budget (`budget_items` + `projects.total_budget`)
  · 0011 files (private bucket + `files`)
- 0012 wedding_profile (incl. **`wedding_profile.onboarded_at`** — see §8's correction) · 0013
  vendor_targets · 0014 assistant_messages · 0015 timeline_events
- 0016 contract_status · 0017 leads · 0018 proposals · 0019 proposal_acceptance
- 0020 subscriptions · 0021 wedding_websites · 0022 wedding_websites_public_read (anon SELECT)
- 0023 rsvp_submissions — project-scoped RSVP intake. Anon INSERT only (gated to a published site),
  `authenticated` SELECT/UPDATE/DELETE via `can_access_project`. No service-role, no anon read.
- 0024 seating_tables — project-scoped. `id`, `project_id` (FK→projects cascade), `label`, `shape`
  (CHECK `round|square|rectangle`), `seat_count` (CHECK 1–20), `kind` (CHECK
  `standard|sweetheart|head`, default `standard`), `pos_x`/`pos_y` (numeric), `rotation` (numeric
  default 0), `created_at`; index `(project_id)`. Four RLS policies for `authenticated`, each gated by
  `can_access_project`. **Schema verified live.**
- 0025 seating_assignments — project-scoped guest→table join. `id`, `project_id` (FK→projects
  cascade), `table_id` (FK→seating_tables cascade), `guest_id` (FK→guests cascade), `seat_index`
  (int NULLABLE, CHECK `>= 0`), `created_at`. **unique `(project_id, guest_id)`**; **partial unique
  index `(table_id, seat_index) WHERE seat_index IS NOT NULL`**. Indexes `(table_id)`, `(project_id)`.
  Four RLS policies via `can_access_project`. Occupancy (assignments ≤ seat_count) is action-enforced,
  NOT a DB constraint. **Schema verified live.**
- **0026 budget_item_project_vendor** — adds `budget_items.project_vendor_id` (uuid, nullable). Adds
  `unique (project_id, id)` on `project_vendors` as the FK target (redundant against its PK, required
  for a composite reference). Partial unique index
  `(project_id, project_vendor_id) where project_vendor_id is not null`. Index `(project_vendor_id)`.
  No new RLS policies — `budget_items`' four existing `can_access_project` policies cover the column.
  **INTROSPECTION-VERIFIED in v10** (`pg_get_constraintdef`, recorded verbatim — this replaces v9's
  narration-sourced description):
  ```
  budget_items_pkey                  PRIMARY KEY (id)
  budget_items_project_id_fkey       FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  budget_items_project_vendor_fkey   FOREIGN KEY (project_id, project_vendor_id)
                                       REFERENCES project_vendors(project_id, id)
                                       ON DELETE SET NULL (project_vendor_id)
  ```
  **`ON DELETE SET NULL (project_vendor_id)` — column-specific, parenthesized, exactly one column
  named.** This is the PG 17.6 form that was the whole point of the slice. A *bare* `ON DELETE SET
  NULL` on a composite FK nulls EVERY referencing column including the NOT NULL `project_id`; it
  creates without complaint and detonates at delete time.
- **0027 bootstrap_idempotency (v10)** — `create or replace function
  bootstrap_account_and_project(...)`, same signature / return type / `security definer` /
  `set search_path = public`, body byte-identical to 0003 except ONE new guard immediately after the
  `auth.uid() is null` check:
  ```sql
  if exists (select 1 from account_members where user_id = auth.uid()) then
    raise exception 'already_bootstrapped' using errcode = 'P0001';
  end if;
  ```
  **Deliberately NOT a unique constraint on `account_members.user_id`** — that would foreclose a user
  legitimately holding both a personal and a business account at the schema level. The guard lives in
  the function because the function is the only writer (§4). **INTROSPECTION-VERIFIED:**
  `pg_get_functiondef(oid) like '%already_bootstrapped%'` → **true**; `prosecdef` → **true**.

**`tasks` table columns (migration 0002; no later migration alters `tasks`):**
- `id` uuid PK · `project_id` uuid FK · `title` text
- `status` text, **CHECK `todo | in_progress | done`, default `todo`** (three states — the UI treats
  done = `status='done'` only; `in_progress` is NOT counted done)
- `phase` text **NULLABLE, free-text (NO CHECK/enum)** — canonical order lives in
  `lib/checklist-phases.ts`: `12+ months`, `9 months`, `6 months`, `3 months`, `1 month`, `week of`.
  **As of ONB-01, generated plans can no longer produce a non-canonical phase** (it's derived, not
  model-emitted) — but the column is still free-text and other writers still set it. See §13.
- `due_date` date NULLABLE · `vendor_id` uuid nullable · `position` integer default 0 · `notes` text
  · `created_at` timestamptz
- **No assignee/owner column.**

**`budget_items` table columns (0010 + 0026):**
- `id` uuid PK default `gen_random_uuid()` · `project_id` uuid NOT NULL FK→projects cascade
- `category` text **NULLABLE, free-text (NO CHECK)** — the live Uncategorized bucket handles
  null/empty
- `label` text NOT NULL · `planned_amount` numeric(12,2) NOT NULL default 0
- `actual_amount` numeric(12,2) NULLABLE · `notes` text nullable
- `created_at` timestamptz NOT NULL default now()
- **`project_vendor_id` uuid NULLABLE (0026)** — composite FK to `project_vendors(project_id, id)`
- Index `(project_id, category)`; index `(project_vendor_id)`; partial unique
  `(project_id, project_vendor_id) where not null`
- RLS on; four member policies via `can_access_project(project_id)`

**`projects.total_budget`** — numeric(12,2), NULLABLE, added by 0010. Edited via `setBudgetTarget`.

**`project_vendors` columns (live introspection at BUD-02 Step 0):**
- `id` uuid NOT NULL default `gen_random_uuid()` — **PK is named `vendors_pkey`** (artifact of the
  0004 rename; expected, don't "fix" it)
- `project_id` uuid NOT NULL FK→projects · `vendor_id` uuid NOT NULL FK→`vendors(id)`
- `status` text NOT NULL default `'lead'` — **NO CHECK constraint** (see §13). Canonical booked value
  is **`'booked'`**, lowercase; BUD-02's rail card counts on it.
- `quoted_price` numeric NULLABLE · `role` text nullable · `notes` text nullable
- `created_at` timestamptz NOT NULL default now()
- Indexes: `vendors_pkey`, `project_vendors_project_id_idx`, `project_vendors_vendor_id_idx`,
  + `unique (project_id, id)` (0026)
- RLS: SELECT `using (can_access_project(project_id))`; ALL `using` + `with check` same.

> **Naming trap:** `project_vendors.vendor_id` → `vendors(id)` and `budget_items.project_vendor_id` →
> `project_vendors(id)` are DIFFERENT things one join apart. The budget column is deliberately named
> `project_vendor_id`, not `vendor_id`. Don't "simplify" it.

> **No-migration slices to date:** the 5-template pack; the v4 assistant QA pass (V3-QA-01…06);
> SEAT-02/03; SEAT-05/05a; **SEAT-08**; **SEAT-09**; **SEAT-10**; CHK-01; SET-01; TL-01/02/03; BUD-01;
> BUD-01a; **ONB-01**; **Soft stack chrome pass (v11)**; **LAND-01**; **LAND-01a**. All reuse existing
> columns/policies. The guests table (0006) has a **single `full_name` column** (not first/last); the
> shared `formatGuestName` helper handles that.

---

## 6. Shell & routing

One login. `lib/post-login-path.ts` routes by account kind.
- **Planner (business):** `/dashboard`, `PlannerShell` + `PlannerProjectSidebar` (Dashboard, Leads,
  Billing). Soft stack denser chrome (v11).
- **Couple (personal):** into their project workspace (`CoupleShell`), gated by onboarding; header
  nav has a Billing link. Soft stack Tier 1 chrome (v11).

### The signup → workspace path (rewritten by ONB-00 — read this before touching routing)

```
signup (auth.signUp only — NO bootstrap here)
  → email confirm → /auth/callback → exchangeCodeForSession → getPostLoginPath
  → getAccountContext:
      no account_members row      → /projects → OnboardingForm  → bootstrap RPC
      kind = business             → /dashboard
      personal + firstProjectId   → getCoupleDestinationPath
      personal + 0 projects       → /projects → createProject CTA
  → getCoupleDestinationPath: wedding_profile.onboarded_at null ? /onboarding : /projects/{id}
```

**`lib/account-context.ts` — `getAccountContext`.** The most load-bearing resolver in the app: it
decides which shell every user gets. **Fixed by ONB-00** — before v10 it (a) took `memberships[0]`
from an *unordered* `limit(1)` with no kind filter (the §3 naive-first-membership pattern this repo
explicitly banned during the CRM build), and (b) counted projects with a **bare RLS-scoped select
across every project the user could see**, not scoped to the resolved account. Now: memberships
ordered `created_at asc`, projects `.eq("account_id", ...)`, and it returns **both**
`singleProjectId` (`length === 1`) and **`firstProjectId`** (`projectIds[0] ?? null`).

**`singleProjectId` is a HINT, not an answer.** Five call sites read it — `post-login-path`,
`dashboard`, and the three `leads` pages — and **every one falls back to `/projects` when it's null**,
where the real decision gets made. That property is load-bearing. See §3's terminal-decision rule.
`/projects` and `/onboarding` both gate on **`firstProjectId`**, and **they must move together** —
`/projects` redirects personal users to `/onboarding` and `/onboarding` redirects back to `/projects`,
so changing one guard's key and not the other ships an infinite redirect.

Shared **project workspace** (`app/(app)/projects/[projectId]/layout.tsx`): tabs from
`lib/project-tabs.ts`, role-gated (`plannerOnly`). Invalid → `notFound()`.

Couple working surfaces use Soft stack vocabulary (v11): progress / allocation bands, **raised**
cards (`--surface` + `--shadow-raised` + `--radius-card`) containing **recessed** rows/wells
(`--well` + `--shadow-recessed` + `--radius-inner`), sticky context rails, Figtree display numerals.
Canonical two-column split: `lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]` with
`lg:sticky lg:top-6 lg:self-start` rail.

- **Overview tab** hosts the hero. Planner Overview uses **`SlimHero`**; couple Overview uses
  **`WeddingHero`**. Both host the inline wedding-date editor (Set date / Edit / Clear) plus the
  "days to go" countdown.
- **Checklist tab** — CHK-01 layout + Soft stack: progress band (big %, thick sage track, phase chips)
  above a two-column body (raised phase cards, recessed task rows + rail).
- **Budget tab** — BUD-01/02/01a logic + Soft stack: allocation band (total budget + inline target
  editor, stacked spent/committed bar, four stat cells) above category blocks as **raised cards**
  with recessed item rows + context rail. **No pie/donut/circular progress.** Quote money never
  enters a headline figure.
- **Day-of timeline tab** — TL-01/02/03 + Soft stack: collapsed read-only rows, display-to-edit
  reveal, day-summary strip, sticky rail with owner filter chips, gap/overlap detection, Unscheduled
  bucket. Per-vendor printable run sheet at a separate authenticated route (TL-02). Run sheet is
  Tier 3 for print (Cormorant header carve-out); chrome around it Soft-stacks via token aliases.
- **Vendors / Guests / Notes / Seating / Website editor / Contracts** — Soft-stacked in v11.
  Website **templates** (public render) remain Tier 3 / `--ws-*` only. Guests tab hosts the RSVP
  inbox. Seating: tables raised on canvas; outlines `--ring`; selection `--accent`; full occupancy
  `--sage`; kind = form + text, never a status colour.

**Account-scoped planner surfaces:** `/leads`, `/leads/[leadId]`,
`/leads/[leadId]/proposals/[proposalId]/contract`, `/account/billing`. Soft-stacked in v11 leftover
token sweep.

**Public surface (no auth, outside `(app)`):** `app/w/[slug]/page.tsx` + `app/w/layout.tsx`,
`force-dynamic`, anon reads via `utils/supabase/anon-server.ts`. Colocated: `RsvpForm.tsx` and
`actions.ts` (`submitRsvp`, anon client, server-validated). **Tier 3 — Soft stack does not touch
template colour or Cormorant/Great Vibes.**

**Marketing / landing (`/` → `components/marketing/`):** Tier 2 Soft stack (Figtree + same palette).
**LAND-01** rebuilt the route into product-preview surfaces (see §7). Exactly one deep field
`--deep` on the landing route (`FinalCta`). Page stays a server component; interactivity is
leaf `'use client'` only (nav scroll hairline, hero tabs + checkable checklist, scroll-reveal,
bar width animate-in). No schema, no data access, no persistence (demo state is in-memory only).
Website feature card embeds a scaled real `RomanceTemplate` / `WeddingSiteView` thumbnail — Cormorant
stays in Tier 3; **no marketing Cormorant carve-out**.

---

## 7. Features built

Pattern: a folder under the relevant scope with `page.tsx` (server read) + `actions.ts` (`'use server'`
writes by id + `revalidatePath`); RLS authorizes. v1 (checklist, vendors, outreach, guests, notes,
budget, files, timeline), v2 (Contracts + status; lead pipeline + kanban; proposals → accepted →
printable contract; Stripe billing; website builder + dispatcher + public route), v3 (5-template
gallery + `blush` theme; public RSVP) unchanged. Seating v5–v7 unchanged. Polish pass v8–v9
(CHK-01, SET-01, TL-01/02/03, BUD-01/02/01a) unchanged in behavior and fully verified. ONB-00/01
(v10) unchanged.

### v10 — signup + plan generation repair (unchanged; still load-bearing)

#### ONB-00 — signup double-bootstrap. MIGRATION 0027. FULLY LIVE-VERIFIED.

**The symptom:** a fresh couple signup landed on `/projects` showing "No projects yet." — no
onboarding wizard, no buttons, nothing clickable anywhere on the page.

**The cause, from the DB (not from narration):** one `auth.users` row, TWO personal accounts, two
memberships, two identical projects from a human double-submit eight seconds apart. Guarding
`exactly one` project then collapsed routing into a dead branch.

**Four defects, ranked:** (1) no idempotency in `bootstrap_account_and_project`; (2) no pending
state on `OnboardingForm`; (3) unscoped unordered `getAccountContext`; (4) `/projects` fallthrough
was dead text.

**The fix:** 0027's `already_bootstrapped` guard; catch + redirect to `getPostLoginPath`; ordered +
account-scoped context + `firstProjectId`; `useFormStatus` pending label; `/projects` + `/onboarding`
gate on `firstProjectId`; personal 0-projects CTA.

> **The double-click IS the checkpoint.** "Fresh signup works" proves nothing about this fix.

#### ONB-01 — plan generation respects the actual runway. NO SCHEMA. FULLY LIVE-VERIFIED.

**The symptom:** plans born overdue; phase labels disagreed with offsets.

**The fix:** `lib/date-months.ts` (day-clamped month math); prompt gets today + `runwayMonths`;
`phase` deleted from model schema — derived via `phaseFromMonthsBefore`;
`effective = max(0, min(model.monthsBeforeWedding, runwayMonths))`.

> **The distribution check is the real checkpoint.** A clamp-flattened plan can look "not overdue"
> and still be garbage. `group by phase` distinguishes scheduling from backstop collapse.

### v11 — Soft stack (C1) chrome pass. NO SCHEMA. CODE-COMPLETE; LIVE VISUAL QA PENDING.

**What changed:**
- Soft stack tokens are live in `app/globals.css` (`--canvas`, `--surface`, `--well`, `--ink`,
  `--muted`, `--hairline`, `--ring`, `--accent`, `--accent-wash`, status colours, three radii,
  `--shadow-raised` / `--shadow-recessed`). Legacy Modern romantic names (`--plum`, `--stone`,
  `--porcelain`, etc.) remain as **temporary aliases** pointing at Soft stack values — do not add
  new references to alias names.
- Figtree is `--font-sans`. `.font-display` / `.couple-name` are Figtree 800 (not serif).
- Hanken is `--ws-font-sans` for Tier 3 body. Cormorant / Great Vibes stay Tier 3 (+ run-sheet header).
- Shared primitives Soft-stacked (Card, PageHeader, Eyebrow, Button, Input, Select, Textarea, Pill,
  EmptyState, SectionHeader, StatCard, SlimHero, topbar, shells).
- Couple tabs Soft-stacked: Checklist, Budget, Timeline, Overview, Notes, Vendors, Guests, Seating,
  Website **editor**, Contracts.
- Planner dashboard + shell + account dashboard Soft-stacked.
- Marketing / landing Soft-stacked as Tier 2; one `--deep` deep field on `FinalCta`.
- Leftover chrome token sweep: auth/login, billing, leads board/detail, assistant panel, onboarding
  wizard, proposals/contracts chrome, project workspace nav.

**What did NOT change:**
- Schema / migrations (still 0027).
- Public `/w/[slug]` templates and `--ws-*` colour system.
- Feature behavior of BUD/TL/CHK/ONB slices — visual vocabulary only (plus token renames in classnames).

**Seating builder (v5–v7 + SEAT-08…10):** `seating_tables` (0024) + `seating_assignments` (0025) on a
fixed 1200×800 SVG canvas (`viewBox`, `<g transform="translate… rotate…">`). SEAT-01…05a +
**SEAT-08 / 09 / 10** — all writes by id + `revalidatePath`; **no new schema** for any of these
(`seat_count` / `pos_x` / `pos_y` / `rotation` / `kind` already on 0024).

**Occupancy model (authoritative — do not regress):**
- Occupancy = **COUNT of `seating_assignments` rows** for the table (`occupancyByTable` in
  `SeatingWorkspace`). Canvas lights seats `0..(count-1)` by that count.
- `assignGuestToTable` upserts `seat_index: null` (table-level assign). Seat-specific UI is a later
  slice. A guard that queries `seat_index >= N` is **wrong** and would pass a full table.
- Full table: occupancy colour `--sage` (canvas badge + by-table card). Selection: `--accent`. Kind
  is form + text only — never a status colour.

**Gestures (current):**
- **Place:** arm a shape → click canvas → `addSeatingTable` (toolbar seat count at create).
- **Select:** click table (toggle). Selection lives as `selectedTableId` in `SeatingWorkspace`.
- **Reposition:** (1) drag table → transient local transform on `pointermove` → **one**
  `moveSeatingTable` on drop; (2) click empty canvas with a selection; (3) arrow-key nudge
  (Shift = fine). Server `clampPosition` owns bounds — no client-side clamp for persistence.
- **Rotate:** `rotateSeatingTable(tableId, "cw"|"ccw")` — **fixed 45° step** (`ROTATION_STEP`),
  normalized mod 360. Panel labels ±45°.
- **Edit seat count (SEAT-09):** selected-panel stepper (− / value / +), 1–20 via `clampSeatCount`.
  Dedicated action `setSeatingTableSeatCount(tableId, seatCount): AssignResult`. Refuses with
  `{ ok:false, error }` if occupancy count > requested next (message names the count; **no write**).
  Same inline rosewood `errorMessage` surface as full-table assign refusal. Growing / shrinking when
  occupancy fits succeeds + revalidates.
- Drag/click disambiguation: travel under ~4px (screen) = select; at/over threshold = drag
  (suppresses selection toggle). Pointer capture on `<svg>` retargets click — select is applied on
  `pointerup` when it was not a drag; the retargeted SVG click is swallowed so empty-canvas move
  does not fire.

**By-table breakdown (SEAT-10):** page-wide sibling **below** the roster+canvas `lg:flex-row` (not
inside `flex-1`). `SeatingTableBreakdown` — derived read from the same `tables` / `guests` /
`assignments` props + `occupancyByTable` for N (do **not** recount). `guestsByTable` groups names;
sort by `full_name` + `id` tiebreak (`formatGuestName`). Raised Soft stack cards in
`sm:grid-cols-2 xl:grid-cols-3`; names inside each card are a **vertical** recessed list
(`flex flex-col`), not a multi-column name grid. Empty tables still get a card ("No one seated yet").

**Not built:** dance floor / floor objects (SEAT-06, deferred), assistant seating mock-up (SEAT-07),
per-seat assignment UI.

### v15 — LAND-01 landing overhaul + LAND-01a date formatting. NO SCHEMA.

#### LAND-01 — marketing product-preview landing. CODE-COMPLETE; DOM LIVE CHECKPOINT PENDING.

**What changed:**
- Landing sections match the product-preview mockup structure: sticky nav (hairline on scroll),
  hero + tabbed Checklist/Budget/Seating preview (checklist is interactive → live % + bar),
  "both sides" cards with mini stat rails, six workspace cards each with a surface mini-mockup,
  how-it-works steps, one `--deep` `FinalCta`, footer.
- Preview treatments follow **live product** where mockup hex disagreed: budget spent=`--sage` /
  committed=`--accent`; vendor Pills match outreach variants; owner chips = `Pill accent`; seating
  selection=`--accent`, full-table fill uses `--sage-wash` (sole LAND-01 consumer —
  `seating-preview-figures.tsx`; do not retarget `Pill` sage).
- New Soft stack tokens (also recorded in `.cursor/design.mdc`): `--deep`, `--deep-eyebrow`,
  `--sage-wash`. `FinalCta` uses `var(--deep)` / `var(--deep-eyebrow)` (no raw `#3D2430` /
  `#E8B4C4` outside `globals.css` + design.mdc token tables).
- Restrained motion: IntersectionObserver reveal + bar fills; CSS card hover deepen; honor
  `prefers-reduced-motion`.
- Trust line / avatar cluster from the mockup **dropped** (duplicate subcopy / invented social proof).

**What did NOT change:** schema, RLS, server actions, live copy headlines/eyebrows/subcopy
(verbatim). No new dependencies.

#### LAND-01a — consolidate `formatWeddingDate`. CODE-COMPLETE.

**Decision:** public wedding websites must render the couple's date identically for every visitor —
not the guest's runtime locale. Shared helper in `components/website/template-utils.ts` is pinned
to `"en-US"` with `{ weekday: "long", month: "long", day: "numeric", year: "numeric" }`.

**Consolidation:**
- Matching locals collapsed → shared import: Classic template, `WeddingHero`, `RunSheetDocument`.
- **Survivors** (deliberate short format — `month: "short"`, no weekday): `account-dashboard.tsx`,
  `planner-projects-table.tsx` — still named `formatWeddingDate` locally; locale pinned `"en-US"`.
- Minimalist DateMonolith keeps its split visual layout; `aria-label` uses the shared long form.
- Checkpoint also cleared **all** `toLocaleDateString(undefined` in the repo (Tier 1 due dates /
  stamps included). **Open product question:** some Tier 1 surfaces may eventually want viewer
  locale — do not treat the sweep as a permanent "all dates are en-US" product rule without Dom
  confirmation (see §10).

Temporary harness: `/styleguide/date-check` renders all five templates for the same demo date —
delete after Dom's LAND-01a visual pass.

---

## 8. Onboarding → AI starting plan

3-step wizard captures `wedding_profile` + `wedding_date` + `total_budget`;
`generate-wedding-plan.ts` returns strict JSON (defensive parsing); editable preview; **Approve**
(`commitPlan`) inserts tasks/budget_items/vendor_targets, stamps `onboarded_at`, guards
double-commit. (`saveOnboarding` remains the ONLY onboarding-path write of `wedding_date`;
post-onboarding edits go through SET-01's `updateWeddingDate`.)

> **⚠️ CORRECTION — `onboarded_at` lives on `wedding_profile`, NOT on `projects`.** v8 and v9 both
> described it as a `projects` column and that was wrong across two versions. `lib/onboarding-gate.ts`
> reads `wedding_profile.onboarded_at` for a given `project_id`. **A planner-created project has no
> `wedding_profile` row at all** — which is why Mila & Griffin reads null, and why that's correct
> rather than a bug. Any query joining `projects` for `onboarded_at` will error with `42703`.

**The generator's response shape (CHANGED by ONB-01; still current):**
```json
{
  "checklist":        [ { "title": string, "monthsBeforeWedding": number } ],
  "budget":           [ { "category": string, "plannedAmount": number } ],
  "vendorCategories": [ { "category": string, "note": string } ]
}
```
**`phase` is NOT in this shape and must not be added back.** It is derived from the clamped offset via
`phaseFromMonthsBefore`. The prompt also carries **today's date and `runwayMonths`**.
`vendorCategories[].category` MUST be one of `VENDOR_CATEGORIES`' ids (free-text `note`).

> **Note the AI plan's shape:** it emits ONE budget item per category, with `label === category`
> ("Attire"/"Attire"). That's why BUD-01a's category blocks currently hold one row each — the
> structure earns its keep the moment a couple adds "Attire → alterations, veil".

---

## 9. AI assistant

Unchanged from v10. Reactive tool-use agent in `lib/assistant/` + `components/assistant/`, per-project
history in `assistant_messages`, account-kind-aware system prompt, RLS-protected actions, plain
prose. Entry point is a tab-bar chip (sparkle mark) with once-per-session, per-tab suggestion
tooltips. Soft stack chrome only (v11) — no tool/behavior change.

**Tools: read + additive-write only. No delete tools.** Read tools cover checklist, guests, budget,
vendors, vendor_targets, notes (+ `get_note(id)`), and the day-of timeline (`get_timeline`). A
system-prompt **honesty rule** requires the assistant to say plainly when it has no tool for
something. Write tools are additive-only; additive-BULK insert is permitted for timeline events
(`add_timeline_events`); bulk delete/update and outreach-send remain prohibited.

**Loop semantics:** capped at `MAX_TOOL_ITERATIONS = 8`. Writes commit independently. Cap-hit WITH
committed writes → `ok:true` + honest summary (`cap_hit_with_side_effects`), exchange persisted;
cap-hit with NO writes → "too many lookups" note, persists nothing. Persistence only on `ok:true`.
(**Write-without-read integrity** — if side effects committed, the exchange MUST persist.)

**Cost controls:** static tools+system prefix prompt-cached (single `cache_control: ephemeral`);
history windowed to last `ASSISTANT_HISTORY_WINDOW = 10`; `[assistant.usage]` logs token counts.
Read-tool payloads compacted; note bodies excerpted; `get_note(id)` fetches one full note on demand.
State derived from LIVE tool reads, not the transcript.

> **Read coverage is complete for project-scoped planning entities but NOT for account-scoped/public
> entities (leads, proposals, website, RSVP) nor for seating (0024/0025).** Completing that is the
> §15.D follow-up. Seating is the intended home of the assistant mock-up (SEAT-07).

---

## 10. Design system — Soft stack (C1)

> **This section is a POINTER.** Token VALUES live in `app/globals.css` (Soft stack live as of v11 /
> STYLE-01). RULES live in `.cursor/design.mdc`. Do not restate hex values or invent chrome rules
> here — if they disagree, those two files win. `design/reference.html` is a rendered example and is
> currently **stale** (still Modern romantic); regenerate against `.cursor/design.mdc`.
> `design/theme-direction.html` is superseded — delete when convenient.

**Direction:** Soft stack (C1) — calm tool organized by **depth**. Mauve-tinted canvas; raised white
cards; recessed wells for rows/tracks. Hierarchy = raised-contains-recessed. Romance lives in data
and Tier 3 website templates, not in chrome serifs.

### Three-tier surface taxonomy

| Tier | Where | What it gets |
|---|---|---|
| **1 — App chrome** | `app/(app)/`, most of `components/` except `components/website/`, planner, forms, seating canvas, assistant, settings | Soft stack palette + Figtree; two depth levels; three radii; **no** accent flood; **no** Cormorant/Great Vibes |
| **2 — Emotional** | Landing, onboarding hero/welcome, empty-state heroes | Same palette + Figtree; larger display scale; **exactly one** deep field `--deep` per surface; emotional card shadow OK |
| **3 — Website + print run sheet** | `components/website/`, public `/w/[slug]`, `RunSheetDocument.tsx` print header | `--ws-*` colour only; Cormorant + (Romance) Great Vibes; Hanken via `--ws-font-sans` for body. Soft stack chrome tokens must not leak as website colour |

**Serif / script location rule:** Cormorant Garamond and Great Vibes may appear **only** in
`components/website/` and the run-sheet print header. Nowhere else, at any size, for any reason.

**Status-colour meaning (unchanged):** sage = settled/done/booked/signed/rsvp-yes; clay = in flight;
rosewood = wrong/overdue/over-plan/declined/rsvp-no; well/muted = neutral. Kind is never encoded in
a status colour (esp. seating table kinds).

**Budget (unchanged product rules, Soft stack chrome):** no pie/donut/circular progress; bars reuse
checklist progress-band vocabulary; Allocated is items-only; quote money never enters a headline
figure. Category blocks are raised cards with recessed rows (Soft stack) — do not revert to
"flat hairline-only blocks" from Modern romantic polish notes.

**Seating canvas:** tables raised `--surface` on `--canvas`; outlines `--ring`; selection `--accent`;
full occupancy `--sage`; kind = form + text only. Marketing seating previews may use `--sage-wash`
for full-table fill (`seating-preview-figures.tsx` only).

**Date formatting (LAND-01a):**
- **Public / couple-identifying long wedding dates** → shared `formatWeddingDate` in
  `components/website/template-utils.ts`, locale **`en-US`** (stable SSR + identical for all guests).
- Short-format survivors stay local (`account-dashboard`, `planner-projects-table`) with explicit
  `en-US`.
- Zero `toLocaleDateString(undefined` remains. Tier 1 due-date / stamp formatters were pinned in the
  same sweep for hydration safety — **revisit if any chrome date should follow the viewer's locale.**

### STYLE-01 status (v11 + v15 token adds)

| Slice | Status |
|---|---|
| Soft stack rules + three-tier taxonomy in `.cursor/design.mdc` | **Done** (doc wording synced: Soft stack live, not “pending STYLE-01”) |
| Soft stack `:root` tokens in `app/globals.css` | **Done** (v15 also added `--deep`, `--deep-eyebrow`, `--sage-wash`) |
| Figtree → `--font-sans`; Hanken → `--ws-font-sans`; strip Cormorant from Tier 1/2 | **Done** |
| Couple tabs + planner + marketing Soft stack UI | **Done** (v11); marketing **product-preview** rebuild **LAND-01** (v15) |
| Leftover chrome classname sweep (`plum`/`stone`/`ink-muted` → Soft stack names) | **Done** for Tier 1/2 consumers |
| Legacy CSS aliases (`--plum`, `--stone`, …) still in `globals.css` | **Open** — temporary; do not add new alias consumers |
| `design/reference.html` regenerate | **Open** |
| `design/theme-direction.html` delete | **Open** |
| Font-load scoping (Great Vibes only on `/w/`, etc.) | **Open** (optimisation) |
| Dom live Soft stack visual checkpoint | **Open** (landing now includes LAND-01 interaction checklist) |
| Dom LAND-01 / LAND-01a live checkpoint | **Open** (Cursor code-complete; Dom owns auth-gated + reduced-motion + mobile) |
| Tier 1 date locale policy after LAND-01a sweep | **Open** — confirm which chrome dates may use viewer locale |
| Run sheet still uses legacy classnames (`stone`/`ink-muted`/`plum`) | **Accepted for now** — aliases map to Soft stack; intentional colour shift noted in design.mdc |

**Do NOT start a new "Modern romantic polish pass."** Layout language is Soft stack. Feature polish
(empty states, copy, reciprocal vendor↔budget line) is fine; cream/plum/serif chrome is not.

---

## 11. How to build new features (the workflow)

One vertical slice per prompt. Migration first (you apply it by hand), then the UI prompt. The §11
template has held across CRM, billing, website, template-pack (×2), RSVP, assistant QA (×6), the
seating builder (×6), the polish pass (CHK-01, SET-01, TL-01–03, BUD-01/02/01a), the v10 repair
(ONB-00, ONB-01), and the v11 Soft stack pass with low drift — keep using it:

```
## [ID] — [Feature]
Context · Builds on · Prerequisites
0. Verify before changing anything (report findings): confirm next migration number, locate
   patterns/resolvers/columns to reuse, confirm scoping, confirm single-source-of-truth lists.
   If any finding contradicts this prompt, STOP and say so.
1. Schema: new migration NNNN_name.sql (or NONE), correct scope, RLS by the right function,
   CHECK-constrain enums, read existing migrations, don't invent columns.
2. Data access: server reads scoped; 'use server' actions writing by id + revalidatePath. RLS only.
3. UI: routes/components using Soft stack primitives + `.cursor/design.mdc` (not the stale
   reference.html until it is regenerated).
Behavior · Constraints (don't drift) · Checkpoint (concrete, testable)
```

**The checkpoint is a LIVE run, not a typecheck.** **Cursor cannot authenticate to the app — Dom runs
every live checkpoint;** Cursor's agent browser lands on login. Cursor's "code-level ✅" against a
spec is narration, not verification.

**Design the checkpoint to fail.** v10's sharpest lesson. A checkpoint that only confirms the happy
path proves nothing about the fix:
- ONB-00: "fresh signup works" passes on the *broken* code. Only the **deliberate double-click**
  tests the guard.
- ONB-01: "nothing is overdue" passes on a plan where the clamp flattened eighteen tasks onto one
  date. Only the **distribution query** tests the prompt.
Ask, every time: *what would this checkpoint look like if the fix silently didn't work?* If the answer
is "the same," the checkpoint is decoration.

**Verify schema claims by introspection, not narration.** `supabase db query --linked` and the SQL
editor are the standard. Run introspection **one statement at a time** and coerce long definitions
to booleans so they can't truncate.

**Step 0 is load-bearing.** When Step 0 contradicts the prompt, Step 0 wins. Say so plainly and amend.

**Don't diagnose from a screenshot.** Get the rows.

**Drift watchlist:**
- Manual permission filters; naive first-membership lookups
- Cormorant / Great Vibes outside Tier 3; Tier 1 accent floods; raised-inside-raised; ad-hoc radii
- Kind encoded in status colour; trusting client-sent totals/entitlement/ids/angles
- Reaching for service-role; hardcoded lists instead of single sources
- Importing Supabase/auth into `components/website/`
- Skip-revalidate where a discrete write would do; numeric string coercion on arithmetic paths
- Sliding a *feature* (new stored field) into a *layout* polish slice
- Suggesting `supabase db push`
- Summing two different things into one headline figure
- Duplicating date math instead of `lib/date-months.ts`
- Storing two fields that can disagree when one could be derived
- Reintroducing Modern romantic chrome (porcelain/plum/stone classnames, cream canvas, serif chrome)
- Using Soft stack tokens as public website colour (websites read `--ws-*` only)

---

## 12. Compliance & security notes

- **Stripe:** webhook verifies raw-body signature; service-role only in webhook (+ billing/admin);
  entitlement read only from the `subscriptions` row. **Stripe Tax NOT set up** — register in a
  jurisdiction before collecting there; confirm home-state SaaS taxability with an accountant. (Not
  legal/tax advice.)
- **Public website read:** anon `using (published = true)` via anon key; self-contained snapshot.
- **Public RSVP write:** anon `INSERT` only, gated to published sites; `project_id` derived
  server-side; honeypot + soft throttle + human review. **Collects guest PII** → privacy policy.
- **Gmail OAuth:** `gmail.send` is a **sensitive** scope → needs sensitive-scope verification (not
  CASA). Testing mode: 7-day test-user token expiry, 100-test-user lifetime cap, warning screen —
  viable for planner + pilot couples only, NOT public. Core couple product doesn't depend on Gmail.
- **Signup:** `auth.signUp` only, then email confirmation. **No account/project is created at signup**
  — bootstrap happens on the OnboardingForm submit, behind the `already_bootstrapped` guard (0027).
- **Google Places / Files / Assistant / Seating / Budget:** store only `place_id`; private bucket +
  signed URLs gated by `<projectId>/`; assistant can't exceed RLS; seating and budget are
  `authenticated`-only, project-scoped, no anon/service-role.
- **Production infra:** prod belongs in a **separate Supabase org on Pro**; keep dev "wedding" on
  Free. Fresh prod project, migrations **0001–0027** applied by hand once each in order (NEVER
  `db push`), storage bucket + policies recreated, real SMTP, prod domain in auth redirect URLs.
  See the Launch Prep Runbook.
- Set Anthropic + Google Cloud + Stripe + Supabase billing/spend alerts.

---

## 13. Known caveats / things to verify

**Schema / v10 product flags:** nothing schema-blocking; ONB and BUD verification flags from v10 stay
closed. Soft stack visual QA is the open human gate (see below).

**Closed by v10 (still closed):**
- BUD-02 booked-vendor rail + BUD-01a quote variance — live-verified
- Migration 0026 introspection — verbatim in §5
- Signup dead-end — ONB-00
- Plans born overdue / phase-offset disagreement — ONB-01
- `setMonth` day-overflow — `lib/date-months.ts`
- `projects.onboarded_at` misclaim — corrected; it's on `wedding_profile`

**Closed / done by v11 (design):**
- Soft stack tokens live; Figtree chrome; three-tier taxonomy in `.cursor/design.mdc`
- Couple + planner + marketing Soft stack UI
- Leftover Tier 1/2 `plum`/`stone`/`ink-muted` classname sweep

**Open — Soft stack / design (v11 + v15):**
- **Dom live Soft stack + LAND-01 / LAND-01a visual checkpoint** across couple tabs, planner,
  landing (product-preview interactions), login, leads, billing, and `/w/[slug]` date hydration.
  Typecheck is not verification.
- **Tier 1 date locale after LAND-01a sweep** — confirm which chrome due dates / stamps should
  follow the viewer locale vs stay `en-US`.
- **`design/reference.html` is stale** (Modern romantic). Regenerate against `.cursor/design.mdc`.
- **`design/theme-direction.html` still present** — delete when convenient.
- **Legacy CSS aliases** in `globals.css` (`--plum`, `--stone`, `--porcelain`, …). Temporary; retire
  when no consumers remain. Pill / vendor-status may still accept a `plum` variant alias → accent.
- **Run sheet** still uses legacy classnames; aliases map colours. Acceptable; optional Soft stack
  classname pass later. Cormorant print header stays.
- **Font-load scoping** — root loads four families; `/w/` downloads Figtree unused and app downloads
  Great Vibes unused. Later optimisation.
- `.font-display` and `.couple-name` are near-identical — collapse when touching consumers.
- `/styleguide/date-check` LAND-01a harness — delete after Dom verifies.

**Open — signup / routing:**
- **`singleProjectId` is a hint, not an answer.** Five call sites fall back to `/projects` (§3/§6).
- **Dual-account is foreclosed, deliberately.** 0027 refuses bootstrap for *any* existing membership.
  Reversible in one `create or replace` the day it's required.
- **`createProject` may carry the naive-first-membership pattern** — reachable from personal
  0-projects CTA. **Unverified.** Quote next time that file is open.
- **`projects` UPDATE RLS asymmetry (Phase-4 caveat).** Write gate is `is_account_member` only; date /
  budget editors are reachable via `can_access_project`. Pin before Phase 4.

**Open — plan generation:**
- Clamp-ceiling pile-up on short runways; runway leaking into task titles; phase/date agreement is
  generation-time only; `generateStarterChecklist` still has latent phase/date split; bucket floors vs
  chip target windows; chip year omission; `tasks.phase` still free-text; past `wedding_date` permitted.

**Open — budget / vendors:**
- **`project_vendors.status` has NO CHECK.** Canonical booked = `'booked'` lowercase.
- **`budget_items.category` free-text/nullable** — Uncategorized bucket handles it.
- **0026 partial unique index** behavior-verified, not indexdef-introspected (minor).
- **Cross-project FK rejection** unverified by choice (one couple project in dev).
- **Currency helpers duplicated** — prefer `lib/format-currency.ts`.
- **Budget "Allocated" sums `planned_amount` only.** A quote is not a payment.
- **VND feature follow-ups (not layout):** reciprocal "linked to {category}" line on vendor rows
  (derived, no schema); seed an unbooked vendor before trusting empty/`to_contact` states; quote
  `createProject` while in that area. Soft stack already covered Vendors **chrome**.

**Open — seating / assistant / other:**
- Assistant QA slices: typecheck clean; not all live-verified in one session.
- Seating occupancy action-enforced; seats all guests regardless of RSVP; timeline `owner` free text.
- RSVP → guest matching NOT built; RSVP throttle soft.
- Lead→project conversion NOT built (Phase 4).
- Proposal `line_items` jsonb; planner billing flat monthly; website `force-dynamic`.
- Assistant has no tools for leads, proposals, website, RSVP, seating, or vendor→budget link.
- Confirm files under `<projectId>/`; confirm no Gmail token reaches the client.

**Dev DB state (as of v10; unchanged by Soft stack):**
- `dominicciccaglione@gmail.com` — **personal**, "Dom & Jordyn 2027", wedding 2027-02-13. Couple
  verification project (ONB / BUD-02).
- `d.ciccaglione1@gmail.com` — **business**, "Events by Jordyn", **Mila & Griffin** (planner-created,
  no `wedding_profile`, **must remain untouched**).
- `d.ciccaglione@icloud.com` — **orphaned auth user, 0 memberships** — free OnboardingForm fixture.

---

## 14. Roadmap

**Done (v1):** unified shell + routing; shared primitives (guests, notes, budget, files) + timeline;
couple onboarding → AI plan; AI assistant.

**Done (v2):** Contracts + status; lead pipeline + kanban; proposals → accepted → printable contract;
Stripe billing both audiences; website builder (editor + dispatcher + public route).

**Done (v3):** website template gallery (5 templates + `blush`); public RSVP (anon intake + inbox).

**Done (v4 — assistant QA):** chip + tooltips; timeline batch-write + honest cap-hit; prompt-caching +
history-windowing + usage logging; read-tool compaction; `get_timeline`. No schema.

**Done (v5–v7 — seating):** `seating_tables` (0024), `seating_assignments` (0025); SEAT-01…05a.

**Done (v8 — polish pass begins):** CHK-01 (checklist); SET-01 (wedding-date editor). No schema.

**Done (v9 — timeline + budget):** TL-01/02/03; SET-01 couple hero closed; BUD-01; BUD-02 (**0026**);
BUD-01a.

**Done (v10 — signup + plan generation repair):**
- **ONB-00** — Migration **0027**. Fully live-verified (incl. deliberate double-click).
- **ONB-01** — No schema. Fully live-verified (distribution checked).
- BUD-02 + BUD-01a closed; 0026 introspected verbatim.

**Done (v11 — Soft stack chrome):**
- Soft stack tokens live in `globals.css`; rules in `.cursor/design.mdc`.
- Figtree Tier 1/2; Hanken as `--ws-font-sans`; Cormorant/Great Vibes Tier 3 only.
- Couple workspace tabs Soft-stacked (incl. Vendors, Guests, Seating, Website editor).
- Planner + account dashboards Soft-stacked; marketing/landing Tier 2 Soft-stacked.
- Leftover chrome token sweep (auth, billing, leads, assistant, onboarding, proposals).
- **No schema.** Tier 3 public templates untouched.
- Page-by-page **Modern romantic** polish (VND-01 layout et al.) is **superseded** for chrome.
  Remaining VND items are **feature** follow-ups only (§13).

**Done (v12 — documentation sync):** Soft stack marked live in the bible; file renamed to v12. No
product/schema change.

**Done (v13 — SEAT-08):** drag-to-reposition (commit-on-drop via existing `moveSeatingTable`);
rotation step 15° → 45°. No schema. Live-verified (incl. select-after-capture fix).

**Done (v14 — SEAT-09 + SEAT-10):**
- **SEAT-09** — `setSeatingTableSeatCount`; selected-panel stepper; count-based occupancy refuse
  (no silent drop). No schema.
- **SEAT-10** — `SeatingTableBreakdown` below roster+canvas; same props as Guests box;
  `occupancyByTable` for N; vertical name lists. No schema.

**Done (v15 — LAND-01 + LAND-01a):**
- **LAND-01** — Landing product-preview overhaul (Tier 2): tabbed hero demos, workspace mini-mockups,
  scroll reveal / bar animate-in, `--deep` / `--deep-eyebrow` / `--sage-wash` tokens, Romance
  template thumbnail embed (no marketing Cormorant carve-out). No schema.
- **LAND-01a** — Shared `formatWeddingDate` (`en-US`); Classic / WeddingHero / RunSheet collapsed to
  shared; short-format survivors kept; repo cleared of `toLocaleDateString(undefined`. No schema.

Current through **0027**; next-free **0028**.

**In progress:** Dom Soft stack + LAND-01 live visual checkpoint (human). Not a Cursor slice.

**Remaining couple side:** moodboard; optional seating depth (per-seat UI / SEAT-07); ONB-02;
BUD-03 (pre-launch).

**Remaining planner side:** invoicing accepted proposals; deeper CRM.

**Phase 4 — bridge:** lead→project conversion. Resolve §13 `projects` UPDATE RLS asymmetry here.

**Phase 5 — automation:** PROACTIVE assistant.

**Decided:**
- AI = Claude (`claude-sonnet-4-6`). Outreach = couple's Gmail. Payments = Stripe (flat monthly).
  Website = curated template gallery via dispatcher. Prod = separate Supabase org on Pro.
- Seating = SVG pointer interactions (click place/select/empty-move, arrow nudge, **drag
  reposition**); not @dnd-kit. SEAT-06 deferred by choice. Rotation step = **45°**. Post-place
  `seat_count` edits via dedicated action + count-based occupancy guard. By-table breakdown is a
  derived read (no second fetch).
- **Budget: Allocated is items-only; quote money never enters a headline figure.** No pie/donut.
- **Chrome = Soft stack (C1).** Do not reopen Modern romantic. Tier 3 websites stay on `--ws-*`.
- **Public wedding long dates = shared `formatWeddingDate`, locale `en-US`** (stable for all visitors /
  SSR). Short dashboard/table dates may keep a local short formatter with an explicit locale.
- **Marketing website preview embeds real Tier 3 template** (scaled, non-interactive) — do not put
  Cormorant on the marketing route outside that embed.
- **Signup creates NO tenant.** Bootstrap once on OnboardingForm, guarded in DB (0027).
- **ONB-02 owns migration 0028** (`commitPlan` atomicity + `vendor_targets.category` CHECK).
  **BUD-03** takes next-free at build time (v9's 0027 reservation is void; 0027 was spent on ONB-00).
- **Photos: declined twice, permanently. Not deferred.**

---

## 15. Start here next (pick-up point)

The couple product is feature-complete, shareable, and payable; the plan is **couples-first launch**.
Bible is at **v15**. Soft stack chrome (v11) is **code-complete**; **LAND-01 / LAND-01a** are
code-complete (no schema). Dom's live visual checkpoint (Soft stack + landing interactions + date
hydration on Overview / `/w/[slug]`) is the open human gate. Schema still through **0027**;
next-free **0028**.

**Do not resume a Modern romantic / VND-01 layout polish pass.** Vendors chrome is Soft-stacked.
Optional VND **feature** work (reciprocal budget link line, seed unbooked statuses, quote
`createProject`) can ride along another vendors visit — it is not the thrust.

**A. Dom Soft stack + LAND-01 / LAND-01a live checkpoint (now).**
Walk couple tabs (Overview, Checklist, Budget, Timeline, Vendors, Guests, Seating, Website editor,
Notes), planner dashboard/leads/billing, **landing** (hero tabs, checklist %, scroll bars,
reduced-motion, mobile, serif-only-in-website-thumb, single `--deep` field), login, and public
`/w/[slug]`. Confirm no hydration mismatch on Overview hero / run sheet / published sites. Optional:
delete `/styleguide/date-check` after the five-template date pass. Fix only real regressions — don't
invent a second design system. If any Tier 1 due-date should follow viewer locale, reverse those
pins deliberately (LAND-01a open question).

**B. ONB-02 — `commitPlan` atomicity + `vendor_targets.category` CHECK. Migration 0028.**
Three sequential non-atomic inserts (tasks, budget_items, vendor_targets) with no transaction: a
failure on insert #2 leaves tasks, no budget, and `onboarded_at` unstamped. v10 proved onboarding is
where this product breaks — this is the last known un-hardened step in that path.

**C. BUD-03 — budget payments + deadlines. DEFERRED BY CHOICE, BUT PRE-LAUNCH.**
Migration: next-free at build time.

**Why a `due_date` column is the WRONG model (settled — don't relitigate):** a deadline on an item
with a partial `actual_amount` cannot say whether the item is handled. Payments can:
"Balance · $16,000 · due Friday · unpaid" — and disappear when marked paid.

**The model:** `budget_payments` — child table, project-scoped, `budget_item_id` FK, `amount`,
`due_date`, `paid_at` nullable, `label` ("deposit"/"balance"). Then `spent` = sum of paid,
`committed` = planned − paid, Upcoming box from `due_date where paid_at is null`.

**Step 0 decision:** derive-and-backfill `actual_amount` from paid payments (refuse dual sources of
truth). Report how many rows and every read site of `actual_amount`.

**Why pre-launch:** backfill is cheap now; post-launch it's a production money migration.

**UI:** separate **"Upcoming"** rail card ABOVE "Needs attention". Date math server-side via
`lib/date-months.ts` — do not write a fourth copy.

**D. Launch (after ONB-02 + BUD-03 + Soft stack visual QA).**
Follow the **Launch Prep Runbook**: separate prod Supabase org on Pro + migrations **0001–0027** (by
hand — **never `db push`**) + storage + SMTP; Vercel + domain + env; Stripe live + webhook + Portal +
Tax; prod Places key; Gmail stays testing mode during sensitive-scope verification; privacy + ToS;
monitoring; **full prod smoke — including real signup and deliberate double-click.**

**E. Planner depth / revenue (after launch, or sooner if planner-led).**
- Invoicing accepted proposals (recommended first post-launch).
- Lead→project conversion (Phase 4) — resolve §13 UPDATE RLS asymmetry; unlocks BUD-02 cross-project
  FK check.

**F. Seating — remaining (OPTIONAL).**
- **SEAT-08** drag-to-reposition + 45° rotation step: **DONE** (v13). No schema.
- **SEAT-09** edit `seat_count` after placement + occupancy guard: **DONE** (v14). No schema.
- **SEAT-10** by-table breakdown (derived read): **DONE** (v14). No schema.
- **SEAT-06** dance floor / floor objects: DEFERRED BY CHOICE.
- **SEAT-07** assistant seating mock-up: NO new schema. `get_seating` + additive bulk writes.

**G (other rounding-out):** moodboard; assistant tools for leads/proposals/website/RSVP/seating;
per-seat assignment UI; per-seat planner billing; website caching; RSVP→guest matching; checklist
Other/Unscheduled phase-bucket; `project_vendors.status` CHECK; currency-helper consolidation;
project-settings on Overview; regenerate `reference.html` / delete `theme-direction.html` /
retire CSS aliases; font-load scoping.

**Recommended path:** **Dom Soft stack + LAND-01/01a checkpoint (A)** → **ONB-02 / 0028 (B)** →
**BUD-03 (C)** → **Launch (D)** → invoicing → conversion (E) → remaining G. SEAT-07 when the
differentiator is wanted; SEAT-06 stays parked.
