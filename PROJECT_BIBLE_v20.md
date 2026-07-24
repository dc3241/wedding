# Wedding Planning SaaS — Project Bible (v20)

Canonical state document. **Supersedes v19.** Drop this into the Project's instructions/knowledge so
any new chat picks up cold. Lives in-repo at `PROJECT_BIBLE_v20.md`. The repo's `.cursor/design.mdc`,
`app/globals.css`, `design/reference.html` (stale — see §10), and `supabase/migrations/` remain the
live source of truth; this summarizes them and the decisions behind them. Current through migration
**0031**; **next-free migration is 0032** (reserved for ONB-02).

**v20 records booked-slot ownership, the outreach/in-flight split, and multi-owner run sheets**,
built as four slices (plus closing a v19 open):

| Slice | What | Schema |
|---|---|---|
| **VND-05b** | Remove affordance legibility (closes v19 open) | none |
| **VND-06** | Booked vendor ↔ category slot FK; `replied` in status CHECK; `vendors.address` | **0031** |
| **VND-06a** | Outreach = in-flight only; Decline as exit; declined group | none |
| **TL-04** | `timeline_events.owner` as a comma-separated SET at read (run sheet filter) | none |

Everything in v19 that isn't touched by the above carries forward unchanged: VND-04 / VND-05 /
VND-05a (0030), the planner→couple invitation feature (INV-01 … INV-05, migrations 0028/0029), the
Soft stack (C1) chrome pass (v11), the landing overhaul (LAND-01 / LAND-01a), the seating builder
through SEAT-10, the polish pass (CHK-01, SET-01, TL-01/02/03, BUD-01/01a/02), the v10 signup repair
(ONB-00 / ONB-01), the planner CRM, Stripe billing, the website builder + 5-template gallery, and
public RSVP.

> **Numbering note (read once):** v19 reserved **0031 for ONB-02**. Dom released that reservation so
> VND-06 could ship; **0031 is now `vendor_target_link` (VND-06)**. ONB-02 takes **0032**.

**Verification status (READ THIS):**
- **0031 applied live** (introspected): `vendor_targets.project_vendor_id` present; `vendors.address`
  present; `project_vendors_status_check` includes `'replied'`. Cross-project composite FK rejection
  verified (23503) in the VND-06 live pass.
- **VND-05b shipped** (Jul 22) — Remove separated from the status pill; muted → rosewood on
  hover/focus. Still present in `OutreachVendorRow.tsx`.
- **VND-06 / VND-06a** shipped in code; 0031 live-applied. Vendors page bands: Booked → Still to
  book → Outreach (in-flight) → Declined.
- **TL-04** shipped in code (typecheck clean). Live §5 checkpoint (Dom) optional — discriminating
  pair is DJ sheet showing both `"DJ"` and `"DJ, Officiant"` events, with owner strings unchanged
  at rest.
- **v19 carry-forward:** VND-05 checkpoint (b) fully live-verified (link-only delete). Checkpoints
  a/c/d/e/f/g reported without pasted output — believed good; (d) is now moot for `replied` (0031
  stores it).
- **Still open (human gate):** Dom's live Soft stack + LAND-01 / LAND-01a visual checkpoint. See §13.

Sections changed from v19: header, **§3** (owner SET note), **§5** (0031 + column reference),
**§6** (Vendors / Timeline blurbs), **§7** (VND-05b closed + VND-06 / 06a / TL-04), **§10** (design
open table), **§12** (prod migration range), **§13**, **§14**, **§15**.

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

**As of v18 there is a THIRD class of user: the invited couple.** A planner invites a couple by
email; that couple gets a `project_members` row on ONE project and **no account of their own** — no
`accounts` row, no `account_members` row. They see that project and nothing else in the planner's
book. This is the Aisle Planner model and it is what `can_access_project`'s "OR direct project
member" branch was designed for in 0001. See §4.

The app spans: the couple planning product (onboarding → AI plan, checklist, vendors, guests,
budget, notes, files, day-of timeline, in-app AI assistant, seating builder), a planner CRM
(contracts, lead pipeline, proposals → accepted agreement → printable contract, project access /
invitations), Stripe billing for both audiences, and a public, shareable wedding website with a
5-template gallery and public RSVP intake.

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
- **Anon WRITE = tightly-scoped INSERT-only RLS + server-derived scope.** The ONLY public write is
  RSVP intake. **There are exactly TWO anon surfaces.**
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
  `unlinkVendorFromTarget`** all exist for this reason.
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

**Soft stack design don'ts (Tier 1 chrome — see §10 / `.cursor/design.mdc`):**
- No raised-inside-raised stacking.
- No Tier 1 accent floods (`--accent-wash` for pills/washes only).
- No Cormorant or Great Vibes outside Tier 3 (and the run-sheet print-header carve-out).
- No ad-hoc radius utilities — use `--radius-card` / `--radius-inner` / `--radius-pill`.
- No florals, photographic ornament, gold/metal gradients, decorative (non-hierarchical) shadows.
- Do not import Tier 1 Soft stack tokens as website colour; websites read `--ws-*` only.

---

## 4. The access model (the spine)

Tables: `accounts` (kind: personal | business), `account_members`, `projects`, `project_members`,
`project_invitations` (0028).

### The three user classes

| Class | `accounts` | `account_members` | `project_members` | Sees |
|---|---|---|---|---|
| Self-serve couple | personal | 1 row | none | their one project |
| Planner | business | 1 row | none | all their projects |
| **Invited couple** | **none** | **none** | **1 row per project** | **only invited projects** |

**A planner opening their own project has NO `project_members` row.** An invited couple has NO
account kind. Any gate that reads only one of those inputs will break the other class. This is why
`plannerOnly` tab filtering resolves from ACCOUNT kind and must never be switched to
`project_members.role` — see §6.

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
  account. Gates all four `project_invitations` policies AND the `project_members` DELETE policy.
- **`can_edit_project(project_id)` (0029)** — `is_account_member` of the owning account **OR** a
  `project_members` row for `auth.uid()` with `role in ('couple','collaborator')`. Gates the
  `projects` UPDATE policy. **`viewer` is deliberately excluded — that is the role's entire purpose.**
  **It is currently used by exactly one policy.** Every other project-scoped write still gates on
  `can_access_project`, which a `viewer` passes.
- `can_read_vendor(vendor_id)`, `bootstrap_account_and_project(...)`.
- `account_members` RLS uses a plain `user_id = auth.uid()` predicate to avoid recursion.

> **`bootstrap_account_and_project` is STILL the ONLY insert path into `accounts` /
> `account_members`.** `accept_project_invitation` deliberately inserts into `project_members` ONLY.
> That is what keeps 0027's `already_bootstrapped` guard airtight (§5).

> **`projects` UPDATE — replaced in 0029.** Now `"editors update projects"` on
> `can_edit_project(id)` in both `using` and `with check`. **`projects` INSERT still gates on
> `is_account_member` and should stay that way.** **`projects` has NO DELETE policy** — same
> silent-no-op shape, currently unreached. Flagged in §13.

### The two public (anon) surfaces — still exactly two

1. **Read:** `wedding_websites` has an anon `SELECT` policy `using (published = true)` (0022).
2. **Write:** `rsvp_submissions` has an anon `INSERT` policy gated to published sites (0023), NO anon
   read/update/delete.

`project_invitations` has NO anon policy of any kind. `/invite/[token]` is a public ROUTE that does
not resolve the token before authentication.

---

## 5. Migrations (source of truth: `supabase/migrations/`)

Applied in order. **You are the source of truth on the next number — next free is 0032.**

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
- 0023 rsvp_submissions (anon INSERT only, gated to a published site)
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
**0031**. ONB-02 now owns **0032**.

### Column reference

**`tasks` (0002):** `status` CHECK `todo | in_progress | done` default `todo`; `phase` text
**NULLABLE, free-text (NO CHECK)** — canonical order in `lib/checklist-phases.ts`.

**`budget_items` (0010 + 0026):** `category` text NULLABLE free-text; `planned_amount` numeric(12,2)
NOT NULL default 0; `actual_amount` nullable; `project_vendor_id` uuid nullable (composite FK).

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

**`vendor_targets` (0013 + 0031):** project-scoped category slots. `category` text (still NO CHECK —
ONB-02 / 0032 owns that decision); `status` includes booked/needed vocabulary used by the UI;
**`project_vendor_id` uuid nullable (0031)** with composite FK to `project_vendors` and CHECK
`project_vendor_id is null or status = 'booked'`.

**`timeline_events` (0015):** day-of run sheet. `owner` text **NULLABLE, free-text, NO CHECK**. At
rest it is a string; at read (TL-04) it is a comma-separated SET via `lib/timeline-owners.ts`. Do not
normalize on write.

**FKs pointing AT `project_vendors`** — what a link delete touches:

| From | Constraint | On delete |
|---|---|---|
| `tasks.vendor_id` | `tasks_vendor_id_fkey` | **SET NULL** |
| `budget_items.project_vendor_id` | `budget_items_project_vendor_fkey` | **SET NULL** (column-specific) |
| `vendor_targets.project_vendor_id` | `vendor_targets_project_vendor_fkey` | **SET NULL** (column-specific) |
| `outreach_messages.project_vendor_id` | `outreach_messages_project_vendor_id_fkey` | **CASCADE — hard delete of outreach history** |

The cascade on outreach history is why `removeProjectVendor` requires an explicit confirm that names
it. Before delete, `removeProjectVendor` also resets any linked `vendor_targets` rows to
`project_vendor_id: null, status: 'needed'` so slots are not left booked-with-no-vendor by accident
of the SET NULL alone. See §7.

**`projects.total_budget`** — numeric(12,2) NULLABLE (0010). **`projects.wedding_date`** — date
NULLABLE (0001).

> **Naming trap:** `project_vendors.vendor_id` → `vendors(id)` and `budget_items.project_vendor_id` →
> `project_vendors(id)` are DIFFERENT things one join apart. Don't "simplify" it.

> **No-migration slices to date:** the 5-template pack; V3-QA-01…06; SEAT-02/03/05/05a/08/09/10;
> CHK-01; SET-01; TL-01/02/03; **TL-04**; BUD-01; BUD-01a; ONB-01; Soft stack chrome pass (v11);
> LAND-01; LAND-01a; INV-03; INV-05; INV-02; **VND-05; VND-05a; VND-05b; VND-06a**.

---

## 6. Shell & routing

Unchanged from v18. One login. `lib/post-login-path.ts` routes by account kind.
- **Planner (business):** `/dashboard`, `PlannerShell` + `PlannerProjectSidebar`.
- **Couple (personal):** into their project workspace (`CoupleShell`), gated by onboarding.
- **Invited couple (no account):** into the invited project via `/projects`.

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

### Invitation acceptance path (INV-05)

```
/invite/[token]
  authenticated   → acceptProjectInvitation(token)
                    → /projects/{projectId}   or   ?error=<reason>
  unauthenticated → setPendingInvite(token)   [httpOnly cookie, 30 min]
                    → STATIC generic invite page (Sign up / Log in)
```

**The route MUST NOT resolve the token before authentication.** `consumePendingInvite` runs at BOTH
auth entry points (`app/auth/callback/route.ts` and `app/login/actions.ts`) because **password login
never passes through `/auth/callback`**.

### Shared project workspace

`app/(app)/projects/[projectId]/layout.tsx`: tabs from `lib/project-tabs.ts`, role-gated
(`plannerOnly`). Invalid → `notFound()`. Couple working surfaces use Soft stack vocabulary: progress
/ allocation bands, **raised** cards containing **recessed** rows/wells, sticky context rails,
Figtree display numerals. Canonical two-column split:
`lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]` with `lg:sticky lg:top-6 lg:self-start` rail.

- **Overview** — `WeddingHero` (couple) / `SlimHero` (planner); inline wedding-date editor +
  countdown. The date editor works for invited couples (0029).
- **Checklist** — CHK-01 progress band + two-column body.
- **Budget** — BUD-01/02/01a + allocation band. **No pie/donut/circular progress.**
- **Vendors** — Gmail mailbox card, **Add vendor form (manual, VND-05)**, Vendors-to-book target
  cards, **Booked band** (slot-linked via VND-06), Outreach section with in-flight pipeline only
  (VND-06a), Declined group, select-all + Draft outreach, and the shortlist rows (category label,
  per-row pipeline, status pill, **Remove**).
- **Day-of timeline** — TL-01/02/03; **TL-04 multi-owner run sheets** (comma SET at read); per-owner
  printable run sheet at `/projects/[projectId]/timeline/run-sheet`.
- **Guests / Notes / Seating / Website editor / Contracts** — Soft-stacked in v11.
- **Access (planner-only)** — `app/(app)/projects/[projectId]/access/page.tsx` (INV-02).

**Account-scoped planner surfaces:** `/leads`, `/leads/[leadId]`,
`/leads/[leadId]/proposals/[proposalId]/contract`, `/account/billing`.

**Public surfaces (no auth, outside `(app)`):** `app/w/[slug]` (Tier 3 templates, anon read) and
`app/invite/[token]` (Tier 2, NO data read). Marketing landing at `/` → `components/marketing/`.

---

## 7. Features built

Pattern: a folder under the relevant scope with `page.tsx` (server read) + `actions.ts` (`'use server'`
writes by id + `revalidatePath`); RLS authorizes. v1–v15 features unchanged; see v15/v18 for their
detail. The planner→couple invitation feature (INV-01 … INV-05, migrations 0028/0029) is unchanged
from v18 — including **INV-06 (transactional email) deliberately NOT built**; planners copy the link
and send it themselves.

**Seating occupancy model (authoritative — do not regress):** occupancy = **COUNT of
`seating_assignments` rows** for the table. `assignGuestToTable` upserts `seat_index: null`. A guard
querying `seat_index >= N` is **wrong**. Rotation step is **45°**. Drag/click disambiguation: travel
under ~4px = select; at/over threshold = drag.

### v19 — Vendor category normalization, booked-at-add, and removal (VND-04 … VND-05b)

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
- **Soft duplicate warning** — on submit, if a vendor already in this project shares the same
  category and a close name match, an inline warning names the existing vendor and the submit button
  becomes **"Add anyway"**. Best-effort; it does **not** block. Live-confirmed firing correctly.
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
- `removeProjectVendor` — before deleting the link, resets linked targets to
  `{ project_vendor_id: null, status: 'needed' }`
- `updateVendorContactDetails` — phone + address only (never Places)

**UI:** `BookedVendorsSection.tsx`, `LinkVendorToTargetControl.tsx`, `VendorContactFields.tsx`.
Page order: Booked → Still to book → Outreach → Declined.

#### VND-06a — Outreach = in-flight only. NO SCHEMA.

Builds on verified VND-06.

| Rule | Detail |
|---|---|
| Outreach band | Only `to_contact \| contacted \| replied` (`IN_FLIGHT_STATUSES`) |
| Pipeline cycle | `to_contact → contacted → replied → booked → to_contact`; **Decline** is a separate exit |
| Drawn stops | `VENDOR_PIPELINE_STEPS` = To contact → Contacted → Replied → Booked; declined is not a stop |
| Declined | Collapsed `DeclinedVendorsGroup`; rosewood; restore → `to_contact` |
| Booked | Not listed in Outreach; lives in Booked band (slotted or unslotted with "Add to …") |

Closes v19 B2: drawn set and stored set agree; `replied` is reachable.

#### TL-04 — multi-owner run sheets. NO SCHEMA.

**Problem:** `owner = "DJ, Officiant"` was one distinct dropdown value and matched neither the DJ nor
Officiant sheet.

**Fix (read-layer only):** `lib/timeline-owners.ts` — `parseOwners` / `eventHasOwner` /
`collectOwners`. Comma is the only separator. Aggregates + `filterEventsByOwner` call the helper.
Form hint on add/edit. No write normalization; assistant write tools untouched; `get_timeline`
returns the raw owner string. `sameOwner` conflict detection still uses full-string equality
(deliberate). Stale `?owner=DJ,%20Officiant` yields the empty state, not the master sheet.

---

## 8. Onboarding → AI starting plan

3-step wizard captures `wedding_profile` + `wedding_date` + `total_budget`;
`generate-wedding-plan.ts` returns strict JSON (defensive parsing); editable preview; **Approve**
(`commitPlan`) inserts tasks/budget_items/vendor_targets, stamps `onboarded_at`, guards
double-commit. (`saveOnboarding` remains the ONLY onboarding-path write of `wedding_date`;
post-onboarding edits go through SET-01's `updateWeddingDate`.)

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

> **Read coverage is complete for project-scoped planning entities but NOT for account-scoped/public
> entities (leads, proposals, website, RSVP), seating, or invitations.** The assistant also has no
> vendor-removal tool and should not get one — it is a destructive action with a cascade.

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
full occupancy `--sage`; kind = form + text only.

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
   path that inserts into X" and require a count.**
5. **Cursor answering a Step 0 question is not Cursor acting on it.** VND-05's Step 0 dutifully
   listed **eight** read sites of `vendors.category`; the shipped summary reported fixing **one**.
   The other seven silently changed meaning. **Enumeration is not remediation — when Step 0 produces
   a list, the slice must say explicitly what happens to every item on it, including "left alone,
   and why."**
6. **A control the spec author cannot find on the page has not shipped.** Remove was rendered,
   functional, and invisible. Treat "I don't see it" from someone who wrote the requirement as a
   design defect, not a user error.

**Verify schema claims by introspection, not narration.** Run introspection **one statement at a
time** and coerce long definitions to booleans so they cannot truncate. **This bit again at 0030** —
the status CHECK definition clipped mid-array.

**Checkpoint reports must be literal.** Paste actual output — rows, counts, error codes, generated
text. "All set" is not a checkpoint report; it is a summary of one, and the bible records the
difference (see the v19 header).

**Step 0 is load-bearing. When Step 0 contradicts the prompt, Step 0 wins.** During the VND build
Step 0 correctly caught: that `project_vendors` already had DELETE coverage via an `ALL` policy (so
removal needed no migration); that no column was needed for manual vendors; that `'lead'` was dead;
and that `vendors.category` had three vocabularies. Every one changed the slice.

**Don't diagnose from a screenshot.** Get the rows.

**Drift watchlist:**
- Manual permission filters; naive first-membership lookups
- A new user class gaining read access without auditing every write policy on that table
- Assuming a missing policy errors — it silently succeeds and writes nothing
- Non-idempotent migrations (`create policy` / `create trigger` without `if exists` drops)
- **Adding a CHECK without reconciling the column's DEFAULT against it**
- **A free-text input wired to nothing where a canonical list exists**
- **Changing what a column CONTAINS without enumerating every reader of it**
- **Promising a constraint that has no shared key to act on**
- **Deleting the account-scoped parent when the user meant to remove the project-scoped link**
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
- Reintroducing Modern romantic chrome; using Soft stack tokens as public website colour
- Hiding a tab and calling it authorization — gate the ROUTE

---

## 12. Compliance & security notes

- **Stripe:** webhook verifies raw-body signature; service-role only in webhook (+ billing/admin);
  entitlement read only from the `subscriptions` row. **Stripe Tax NOT set up.**
- **Public website read:** anon `using (published = true)`; self-contained snapshot.
- **Public RSVP write:** anon `INSERT` only, gated to published sites; `project_id` derived
  server-side; honeypot + soft throttle. **Collects guest PII** → privacy policy.
- **Invitations:** raw tokens are 32 random bytes, base64url, **stored only as sha256 hex**.
  Acceptance is bound to `auth.email()`. Expiry 14 days; revocation immediate. No anon RLS policy,
  no service-role path, no user created on the couple's behalf. Pending-invite cookie is httpOnly,
  `sameSite: lax`, secure in production, 30-minute lifetime, consumed once.
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
  migrations **0001–0031** applied by hand once each in order (NEVER `db push`), storage bucket +
  policies recreated, real SMTP, prod domain in auth redirect URLs. See the Launch Prep Runbook.
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

**Open — from the v19/v20 build:**
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

**Open — security / schema:**
- **`viewer` can write on every project-scoped table except `projects`.** `can_edit_project` (0029)
  gates exactly ONE policy. `project_vendors`, `tasks`, `budget_items`, `guests`, `notes`,
  `timeline_events`, `seating_*` and the rest still gate writes on `can_access_project`, which a
  `viewer` passes. **`removeProjectVendor` is the sharpest example — a viewer can delete a vendor
  link and cascade its outreach history.** Unreached today because nothing issues `viewer`
  invitations (no role picker), but it is live the moment one does. **This is the v18
  "audit every write policy" rule coming due; it needs its own slice — see §15 WRITE-01.**
- **`projects` has NO DELETE policy.** Silent-no-op shape, currently unreached.
- **`vendors.category` has NO CHECK.** Deliberately deferred — **ONB-02 (0032) owns the
  category-constraint policy decision** and should apply it to `vendors.category` and
  `vendor_targets.category` together against one canonical list. Making the form a picker got ~95%
  of the benefit with no list duplicated into SQL.
- **`project_invitations.invited_by` / `accepted_by` have no FK to `auth.users`.** Cosmetic.
- **`budget_items.category` free-text/nullable** — Uncategorized bucket handles it.
- **0026 partial unique index** behavior-verified, not indexdef-introspected (minor).
- **`tasks.phase` still free-text**; past `wedding_date` still permitted.

**Open — invitation feature (deliberate gaps):**
- A user who ALREADY has a personal account can accept an invitation, but routing sends personal
  users to `getCoupleDestinationPath` — **their direct project stays invisible.** Test with an
  account-less fixture.
- Dual-account is foreclosed by 0027, deliberately. Reversible in one `create or replace`.
- **Next.js Server Component cookie write** (`setPendingInvite`) is version-dependent and may break
  on a Next upgrade. Fix would be a Route Handler at `app/invite/[token]/route.ts`.
- No email delivery (INV-06). No role picker.

**Open — Soft stack / design (the standing human gate):**
- **Dom live Soft stack + LAND-01 / LAND-01a visual checkpoint** across couple tabs, planner,
  landing, login, leads, billing, Access tab, `/invite/[token]`, and `/w/[slug]` date hydration.
- Tier 1 date locale policy; `design/reference.html` stale; `design/theme-direction.html` to delete;
  legacy CSS aliases; font-load scoping; `/styleguide/date-check` harness to delete.

**Open — other:**
- Assistant QA slices typecheck clean; not all live-verified in one session.
- Seating occupancy action-enforced; seats all guests regardless of RSVP; timeline `owner` free text
  at rest (SET at read — TL-04).
- RSVP → guest matching NOT built; RSVP throttle soft.
- Lead→project conversion NOT built (Phase 4).
- Currency helpers duplicated — prefer `lib/format-currency.ts`.

**Dev DB state (v20 — EXPECTED; re-introspect before relying on vendor rows):**
- `dominicciccaglione@gmail.com` (`6bf62d70-ae1c-47cf-aff1-2125bc90f444`) — **personal**,
  "Dom & Jordyn 2027" (`1c7878d1-c7dd-4c48-b355-d2d9f1e944bb`), wedding 2027-02-13.
- `d.ciccaglione1@gmail.com` (`1779eba2-c4b4-456e-a95f-ba15661f5662`) — **business**,
  "Events by Jordyn", **Mila & Griffin** (`1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9`, planner-created, no
  `wedding_profile`, `wedding_date = 2027-02-15`, `total_budget = 40000.00`, 0 project_members).
  **Must remain at these values.**
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

Current through **0031**; next-free **0032**.

**In progress:** Dom Soft stack + LAND-01 live visual checkpoint (human). Not a Cursor slice.

**Remaining couple side:** moodboard; optional seating depth (per-seat UI / SEAT-07); **ONB-02
(0032)**; **BUD-03 (pre-launch)**.

**Remaining planner side:** invoicing accepted proposals; deeper CRM; INV-06 (email delivery);
optional role picker (`collaborator` / `viewer`) — **which is gated on WRITE-01**.

**Phase 4 — bridge:** lead→project conversion. **Re-audit every write policy when this ships.**

**Phase 5 — automation:** PROACTIVE assistant.

**Decided:**
- AI = Claude (`claude-sonnet-4-6`). Outreach = couple's Gmail. Payments = Stripe (flat monthly).
  Website = curated template gallery via dispatcher. Prod = separate Supabase org on Pro.
- Seating = SVG pointer interactions; not @dnd-kit. Rotation step = **45°**. SEAT-06 deferred.
- **Budget: Allocated is items-only; quote money never enters a headline figure.** No pie/donut.
- **Chrome = Soft stack (C1).** Do not reopen Modern romantic. Tier 3 websites stay on `--ws-*`.
- **Public wedding long dates = shared `formatWeddingDate`, locale `en-US`.**
- **Signup creates NO tenant.** Bootstrap once on OnboardingForm, guarded in DB (0027).
- **Invited couples get project membership and NO account of their own.**
- **No planner-set passwords. No service-role user creation. No anon read on invitations.**
- **Invitation tokens are hashed at rest and shown exactly once.**
- **`viewer` cannot edit PROJECTS** (0029) — but see WRITE-01 for every other table.
- **`projects.account_id` is immutable** (trigger).
- **`vendors.category` stores canonical ids.** Labels are a display concern, resolved via
  `vendorCategoryLabel` at the read site or call site — never stored.
- **`vendors` is account-scoped; "remove vendor" always means remove the `project_vendors` link.**
  A vendors-row delete is not exposed anywhere and should not be added casually.
- **Near-duplicate vendors are a soft UI warning, never a constraint.** Cleanup is deletion.
- **A booked category slot may own a `project_vendors` row via `vendor_targets.project_vendor_id`
  (0031).** Linking requires `status = 'booked'` on the target.
- **Outreach lists in-flight statuses only** (`to_contact | contacted | replied`). Declined is an
  exit; booked lives in the Booked band.
- **`timeline_events.owner` is free text at rest and a comma-separated SET at read (TL-04).**
  `lib/timeline-owners.ts` is the sole parser.
- **ONB-02 owns migration 0032** (`commitPlan` atomicity + `vendor_targets.category` /
  `vendors.category` CHECK decision). **BUD-03** takes next-free at build time.
- **Photos: declined twice, permanently. Not deferred.**

---

## 15. Start here next (pick-up point)

The couple product is feature-complete, shareable, payable, shareable with a planner's couples, and
now maintains booked slots + an in-flight outreach pipeline + multi-owner run sheets. Plan is
**couples-first launch**. Bible is at **v20**. Schema through **0031**; next-free **0032**.

**Do not resume a Modern romantic / VND-01 layout polish pass.** Vendors chrome is Soft-stacked.

**A. Dom Soft stack + LAND-01 / LAND-01a live visual checkpoint (still open).**
Walk couple tabs (Overview, Checklist, Budget, Timeline, Vendors, Guests, Seating, Website editor,
Notes), planner dashboard/leads/billing/Access, landing, login, `/invite/[token]`, and public
`/w/[slug]`. Confirm no hydration mismatch. Fix only real regressions.

**A2. Invite Jordyn for real.** The honest end-to-end test, and the first time the design
collaborator sees her own view. Use the Access tab on a planner project.

**A3 (optional). TL-04 live checkpoint** on Dom & Jordyn if not already run — DJ / Officiant sheets
both include the shared event; `group by owner` proves strings unchanged at rest.

**B. ONB-02 — `commitPlan` atomicity + category CHECKs. Migration 0032.**
Three sequential non-atomic inserts (tasks, budget_items, vendor_targets) with no transaction: a
failure on insert #2 leaves tasks, no budget, and `onboarded_at` unstamped. v10 proved onboarding is
where this product breaks. **Also owns the category-constraint decision** — apply it to
`vendor_targets.category` and `vendors.category` together against one canonical list, or decide
deliberately not to and record why.

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

**D. WRITE-01 — project-scoped write policy audit. DO THIS BEFORE ANY ROLE PICKER SHIPS.**
`can_edit_project` (0029) gates exactly one policy. Every other project-scoped table still gates
writes on `can_access_project`, which a `viewer` passes — including `removeProjectVendor`, which
cascades outreach history. Enumerate every project-scoped table, decide per table whether the gate
should be `can_access_project` (read-alike) or `can_edit_project` (write), and migrate the ones that
should change in one pass. Unreached today only because nothing issues `viewer` invitations.
**Sequence this before the role picker, and re-run it after Phase-4 conversion.**

**E. Launch (after ONB-02 + BUD-03 + visual QA).**
Follow the **Launch Prep Runbook**: separate prod Supabase org on Pro + migrations **0001–0031** (by
hand — **never `db push`**) + storage + SMTP; Vercel + domain + env; Stripe live + webhook + Portal +
Tax; prod Places key; Gmail stays testing mode; privacy + ToS; monitoring; **full prod smoke —
including real signup, deliberate double-click, a real invitation round trip, and a vendor
add/remove + slot-link cycle.**

**F. Planner depth / revenue (after launch, or sooner if planner-led).**
- Invoicing accepted proposals (recommended first post-launch).
- INV-06 email delivery.
- Role picker (`collaborator` / `viewer`) — **gated on WRITE-01**.
- Lead→project conversion (Phase 4) — **re-audit write policies**.

**G. Seating — remaining (OPTIONAL).** SEAT-08/09/10 DONE. SEAT-06 deferred by choice.
**SEAT-07** assistant seating mock-up: no new schema.

**H (other rounding-out):** moodboard; assistant tools for leads/proposals/website/RSVP/seating/
invitations; per-seat assignment UI; `projects` DELETE policy decision; personal-user-with-direct-
project visibility; website caching; RSVP→guest matching; checklist Other/Unscheduled bucket;
orphaned-vendor handling / account vendor library; currency-helper consolidation; regenerate
`reference.html` / delete `theme-direction.html` / retire CSS aliases; font-load scoping.

**Recommended path:** **visual checkpoint + invite Jordyn (A/A2)** → **ONB-02 / 0032 (B)** →
**BUD-03 (C)** → **Launch (E)** → WRITE-01 before any role picker (D) → invoicing → INV-06 →
conversion (F) → remaining H.