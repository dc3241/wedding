# Wedding Planning SaaS — Project Bible (v18)

Canonical state document. **Supersedes v15.** Drop this into the Project's instructions/knowledge so
any new chat picks up cold. Lives in-repo at `PROJECT_BIBLE_v18.md`. The repo's `.cursor/design.mdc`,
`app/globals.css`, `design/reference.html` (stale — see §10), and `supabase/migrations/` remain the
live source of truth; this summarizes them and the decisions behind them. Current through migration
**0029**; **next-free migration is 0030** (reserved for ONB-02).

**v18 records the planner→couple invitation feature**, built and verified as five slices:

| Slice | What | Schema |
|---|---|---|
| **INV-01** | `project_invitations` + `accept_project_invitation` + `project_members` DELETE policy | **0028** |
| **INV-03** | Routing for account-less project members | none |
| **INV-04** | Couples/collaborators may UPDATE their project; `account_id` immutable | **0029** |
| **INV-05** | `/invite/[token]` acceptance route (both auth entry points) | none |
| **INV-02** | Planner Access tab — issue / list / revoke / copy link | none |

**INV-06** (transactional email delivery) is deliberately NOT built — planners copy the link and send
it themselves. See §7.

Everything in v15 that isn't touched by the above carries forward unchanged: the Soft stack (C1)
chrome pass (v11), the landing overhaul (LAND-01 / LAND-01a, v15), the seating builder through
SEAT-10, the polish pass (CHK-01, SET-01, TL-01/02/03, BUD-01/01a/02), the v10 signup repair
(ONB-00 / ONB-01), the planner CRM, Stripe billing, the website builder + 5-template gallery, and
public RSVP.

**Verification status (READ THIS):**
- **INV-01 (0028) fully live-verified** via an 11-block JWT-simulation harness in the SQL editor:
  forwarded-link refusal, duplicate-live rejection, expired, revoked, real accept,
  `account_members = 0`, double-accept idempotency, planner revoke removes the row.
- **INV-03 fully live-verified** including the fresh-signup regression (the ONB-00 failure shape)
  and `account_members = 0`.
- **INV-04 (0029) live-verified with one caveat, recorded honestly:** checkpoint 1
  (reproduce the defect BEFORE applying the migration) was **not run** — 0029 was applied before the
  checkpoint began. The `viewer`-refused test substituted and is arguably stronger: couple edits
  persist, viewer edits don't, same code path, same user, only `project_members.role` differing.
- **INV-05 fully live-verified** including the password-login path specifically (see §6 — password
  login never passes through `/auth/callback`).
- **INV-02 fully live-verified** including the direct-URL route guard and a revoke-then-open-link
  test.
- **Still open from v15 (unchanged, human gate):** Dom's live Soft stack + LAND-01 / LAND-01a
  visual checkpoint. Typecheck is not verification. See §13.

Sections changed from v15: header, **§3** (drift watchlist + new principle), **§4** (third user
class, four new/replaced DB objects), **§5** (0028, 0029), **§6** (routing decision table,
invitation acceptance path), **§7** (v16–v18), **§10** (Access tab), **§11** (three new lessons),
**§12**, **§13**, **§14**, **§15**.

**Companion doc:** a separate **Launch Prep Runbook** exists (ops checklist for going to
production). This bible covers product/architecture state; the runbook covers deployment. Keep both.

**Repo home:** `PROJECT_BIBLE_v18.md`. Also paste into Cursor project instructions/knowledge for cold
starts. Repo truth for design is `.cursor/design.mdc` + `app/globals.css` (Soft stack **live**).

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
(contracts, lead pipeline, proposals → accepted agreement → printable contract, **project access /
invitations**), Stripe billing for both audiences, and a public, shareable wedding website with a
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
  **NOT used for invitations** — see §7 INV-05.
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
  `can_access_project`. (RSVP submissions, seating, and **invitations** are project-scoped.)
- **Resolve the BUSINESS account explicitly** (`accounts.kind = 'business'` inner join), never naive
  first-membership. Couples resolve the `personal` account. Helpers in `lib/billing/resolve-account.ts`.
- **CHECK-constrain status enums.** EXCEPTION: Stripe-owned vocabularies aren't constrained.
  (Known gap: `project_vendors.status` has NO CHECK — see §13.)
- **Billing source of truth = the webhook-updated `subscriptions` row.**
- **Self-contained snapshot for public surfaces.** Public-rendered content stores its displayed data
  on its own row — never joins live into private tables.
- **Service-role key is server-only and rare.** ONLY the Stripe webhook + billing/admin path.
  **The invitation feature does NOT use it** — not for creating users, not for sending mail.
- **Anon READ = one published-only RLS policy + the anon key.**
- **Anon WRITE = tightly-scoped INSERT-only RLS + server-derived scope.** The ONLY public write is
  RSVP intake. **There are exactly TWO anon surfaces and v18 did not add a third** — see §4.
- **Discrete writes over client-authoritative state.** Every mutation writes by id +
  `revalidatePath`. `useOptimistic` is the sanctioned in-pattern fallback.
- **Keep public/reusable UI pure via prop injection.** `components/website/` imports NO Supabase/auth/
  server-only modules.
- **Structural enforcement beats action enforcement when it's cheap.** Where a DB constraint can make
  an invalid state unrepresentable, prefer it over an app-code check. Exemplars: BUD-02's composite
  FK; ONB-00's `already_bootstrapped` guard; **0028's partial unique index (one live invitation per
  email per project)**; **0029's `projects_account_id_immutable` trigger**. Contrast seating
  occupancy, which remains action-enforced because a constraint would have been expensive.
- **A dedicated action owns an integrity obligation.** Don't extend a generic
  `update<Thing>(id, fields)` writer with a field that carries a constraint the generic writer
  doesn't understand. `setSeatingTableKind`, `rotateSeatingTable`, `setSeatingTableSeatCount`,
  `setBudgetItemProjectVendor` all exist for this reason.
- **One terminal routing decision point per audience (ONB-00).** `/projects` is the ONLY place
  allowed to make a terminal routing decision for a personal or account-less account. Every other
  reader of account context falls back to `/projects` and lets it decide. **This rule paid for itself
  at INV-03:** `lib/post-login-path.ts` needed ZERO changes to support invited couples, because it
  already returned `/projects` for a null account. See §6.
- **Two fields that can disagree are a bug waiting to happen; derive one from the other (ONB-01).**
- **NEW (v18) — a missing RLS policy on a writable table is a SILENT NO-OP that returns success,
  not an error.** Postgres does not error when a write matches zero rows under RLS; PostgREST
  reports success. Three instances surfaced during the invitation build:
  1. `project_members` had ONLY a SELECT policy → any app-path delete reported success and removed
     nothing. Fixed in 0028.
  2. `projects` UPDATE gated on `is_account_member` only → invited couples could read the project,
     see the wedding-date and budget-target editors, and have every save silently discarded.
     Fixed in 0029.
  3. `projects` still has NO DELETE policy — same shape, currently unreached. Flagged in §13.

  **The rule that follows:** every time a new class of user gains READ access to a table, audit
  every WRITE policy on that table for whether the new class passes it. This will recur at Phase-4
  lead→project conversion.

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
**`project_invitations`** (0028).

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
- Policies: SELECT `can_access_project(project_id)` (0001); **DELETE
  `can_manage_project_access(project_id)` (0028)**. NO INSERT policy, NO UPDATE policy —
  `accept_project_invitation` is the only writer.

> **The `project_members` SELECT policy is recursive BY SHAPE ONLY and is SAFE. Do not re-flag it,
> and do not narrow it.** It calls `can_access_project`, which itself reads `project_members`.
> Verified v16: `can_access_project` is SECURITY DEFINER owned by `postgres`, and `postgres` has
> `rolbypassrls = true`; `project_members.relforcerowsecurity = false`. Two independent reasons the
> inner read is not RLS-scoped. Narrowing it to a plain `user_id = auth.uid()` predicate (the
> `account_members` pattern) would ALSO break INV-02, which needs the planner to see their couple's
> membership row in order to revoke it.

### Access functions (SECURITY DEFINER, `public`, granted to `authenticated`)

- **`can_access_project(project_id)`** — member of the owning account OR direct project member.
  The READ gate on every project-scoped surface.
- **`is_account_member(account_id)`** — account-scoped features (leads, proposals, subscriptions),
  project INSERT.
- **`can_manage_project_access(project_id)` (0028)** — `is_account_member` of the project's owning
  account. Gates all four `project_invitations` policies AND the `project_members` DELETE policy.
  Only the OWNING ACCOUNT issues, lists, or revokes access; an invited couple cannot see other
  invitations or evict their partner.
- **`can_edit_project(project_id)` (0029)** — `is_account_member` of the owning account **OR** a
  `project_members` row for `auth.uid()` with `role in ('couple','collaborator')`. Gates the
  `projects` UPDATE policy. **`viewer` is deliberately excluded — that is the role's entire purpose.**
- `can_read_vendor(vendor_id)`, `bootstrap_account_and_project(...)`.
- `account_members` RLS uses a plain `user_id = auth.uid()` predicate to avoid recursion.

> **`bootstrap_account_and_project` is STILL the ONLY insert path into `accounts` /
> `account_members`.** `accept_project_invitation` deliberately inserts into `project_members` ONLY.
> That is what keeps 0027's `already_bootstrapped` guard airtight (§5). **If a second writer into
> `accounts`/`account_members` is ever introduced, the guard stops being sufficient.**

> **`projects` UPDATE — replaced in 0029.** The old `"members update projects"` policy gated on
> `is_account_member(account_id)` ONLY, which was stricter than the read gate. It is now
> `"editors update projects"` on `can_edit_project(id)` in both `using` and `with check`.
> **`projects` INSERT still gates on `is_account_member` and should stay that way** — creating a
> project is an account-ownership act.

> **`projects` has NO DELETE policy.** Same silent-no-op shape as the two defects fixed in 0028/0029,
> currently unreached because nothing in the app deletes a project. Flagged, not fixed. See §13.

### The two public (anon) surfaces — still exactly two

1. **Read:** `wedding_websites` has an anon `SELECT` policy `using (published = true)` (0022).
2. **Write:** `rsvp_submissions` has an anon `INSERT` policy gated to published sites (0023), NO anon
   read/update/delete.

**`project_invitations` has NO anon policy of any kind.** `/invite/[token]` is a public ROUTE, but it
does not resolve the token before authentication — it renders generic copy only. Token resolution
happens entirely inside the post-auth SECURITY DEFINER function. This was a deliberate design
constraint, not an oversight: adding an anon read to preview the project name would have made this a
third anon surface. See §7 INV-05.

---

## 5. Migrations (source of truth: `supabase/migrations/`)

Applied in order. **You are the source of truth on the next number — next free is 0030.**

> **How migrations are applied here (READ THIS BEFORE SUGGESTING ANY CLI COMMAND):** by hand-pasting
> each file into the Supabase SQL editor and running it once, in order. There is NO CLI
> migration-history tracker. **`supabase db push` is FORBIDDEN.** `supabase db query --linked` for
> READS is sanctioned and is the correct introspection path.

> **⚠️ CORRECTION TO v15's ADVICE (learned the hard way at 0028).** v15 said a re-pasted
> `CREATE TABLE` produces a "harmless `42P07 ... already exists`" that can be ignored. **That advice
> is dangerous and caused a silent failure.** The Supabase SQL editor wraps a multi-statement paste
> in ONE transaction: **any single error rolls back the ENTIRE file.** At 0028 the error was
> dismissed as benign, nothing committed, and eleven checkpoint blocks then ran against an empty
> schema producing vacuous "passes" (`account_members = 0` because no accept ever ran;
> `project_members = 0` because nothing was ever inserted).
>
> **New rule: a migration paste must return clean. Any error means NOTHING applied.** After every
> migration, confirm with `to_regclass` / `to_regprocedure` / `pg_policies` before running any
> checkpoint.
>
> **Second new rule: write migrations to be re-runnable.** `create or replace` for functions;
> `drop ... if exists` before every `create policy` and `create trigger`. 0029 was edited to this
> standard after a bare `create trigger` made the file non-idempotent.

> **SQL editor gotcha:** the editor renders only the **last** statement's result set, and wide cells
> truncate. Run introspection queries **one at a time**, and coerce long definitions to booleans
> (`... like '%clause%' as flag`) so they cannot clip.

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

### 0028 project_invitations (INV-01) — FULLY VERIFIED

**Table `project_invitations`** (project-scoped):
- `id` uuid PK default `gen_random_uuid()`
- `project_id` uuid NOT NULL FK→projects cascade
- `email` text NOT NULL
- `role` **`project_role` NOT NULL default `'couple'`** — the invitation carries the role; the accept
  function inserts THIS value rather than leaning on `project_members.role`'s column default. A
  future role picker is therefore a UI change with no migration.
- `token_hash` text NOT NULL **UNIQUE** — sha256 hex. **The raw token is NEVER stored.**
- `invited_by` uuid NOT NULL · `expires_at` timestamptz NOT NULL
- `accepted_at` / `accepted_by` / `revoked_at` nullable · `created_at` NOT NULL default now()
- Index `(project_id)`
- **Partial unique index `(project_id, lower(email)) where accepted_at is null and revoked_at is
  null`** — one LIVE invitation per email per project, enforced structurally. Both predicate clauses
  are load-bearing: without them a revoked invitation would permanently block re-inviting that email.

**RLS:** enabled; four `authenticated` policies (SELECT/INSERT/UPDATE/DELETE) all gated by
`can_manage_project_access(project_id)`. **NO anon policy.**

**Also adds:** the `project_members` DELETE policy (`can_manage_project_access`). No INSERT, no
UPDATE.

**`accept_project_invitation(p_token text) returns uuid`** — SECURITY DEFINER,
`set search_path = public, extensions` (pgcrypto lives in `extensions`). Guard order matters:

1. `auth.uid()` null → `not_authenticated`
2. hash miss → `invalid_invitation`
3. `lower(email)` ≠ `lower(auth.email())` → **`invitation_email_mismatch`** — without this, a
   forwarded link is a free seat on someone's wedding
4. already accepted: same user → **idempotent early return of `project_id`, no re-insert** (so a
   revoked-then-removed couple cannot re-grant themselves with an old link); different user →
   `invitation_already_accepted`
5. `revoked_at` not null → `invitation_revoked`
6. `expires_at <= now()` → `invitation_expired`
7. `insert into project_members (project_id, user_id, role) values (…, auth.uid(), v_inv.role)
   on conflict (project_id, user_id) do nothing` — composite PK is the conflict target
8. stamp `accepted_at` / `accepted_by`

**It NEVER writes `accounts` or `account_members`.**

### 0029 project_member_updates (INV-04) — VERIFIED (see caveat in header)

No new table. Three objects:

- **`can_edit_project(p_project_id uuid)`** — SECURITY DEFINER, `stable`, `search_path = public`.
  Account member of the owner OR `project_members` row for `auth.uid()` with
  `role in ('couple','collaborator')`. **`viewer` excluded.**
- **Replaces the UPDATE policy:** drops `"members update projects"`, creates
  `"editors update projects"` with `using` AND `with check` = `can_edit_project(id)`.
- **`guard_project_account_id()` + `projects_account_id_immutable` (BEFORE UPDATE, FOR EACH ROW)** —
  raises `project_account_id_immutable` (P0001) if `account_id` changes.

> **Why the trigger exists — do not remove it.** RLS `with check` re-evaluates against the **NEW**
> row. Without column-level immutability, a direct project member could rewrite
> `projects.account_id`, still satisfy `can_edit_project` as a member of the moved row, and silently
> remove the project from the planner's book. RLS cannot express column-level rules; a trigger can.
> Step 0 confirmed no code path writes `account_id` (`updateWeddingDate` writes only `wedding_date`;
> `setBudgetTarget` only `total_budget`; `saveOnboarding` only those two), so the trigger is
> universal rather than member-scoped. Phase-4 lead→project conversion CREATES projects, it does not
> move them — if that ever changes, this is one `create or replace` to relax.

> **Recursion note — new shape, verified safe.** `can_edit_project` reads `projects` while guarding
> `projects`. This is the first function in the repo that reads the same table its policy guards.
> Verified v17: `projects.relforcerowsecurity = false` and the function is SECURITY DEFINER owned by
> `postgres` (`rolbypassrls = true`).

### Column reference (unchanged from v15)

**`tasks` (0002):** `status` CHECK `todo | in_progress | done` default `todo`; `phase` text
**NULLABLE, free-text (NO CHECK)** — canonical order in `lib/checklist-phases.ts`. As of ONB-01
generated plans can no longer produce a non-canonical phase (it's derived), but the column is still
free-text. No assignee column.

**`budget_items` (0010 + 0026):** `category` text NULLABLE free-text (Uncategorized bucket handles
null/empty); `planned_amount` numeric(12,2) NOT NULL default 0; `actual_amount` nullable;
`project_vendor_id` uuid nullable (composite FK).

**`project_vendors` (0004 + 0026):** PK is named `vendors_pkey` (artifact of the 0004 rename —
expected, don't "fix" it). `status` text NOT NULL default `'lead'` — **NO CHECK**. Canonical booked
value is **`'booked'`**, lowercase.

**`projects.total_budget`** — numeric(12,2) NULLABLE (0010). **`projects.wedding_date`** — date
NULLABLE (0001).

> **Naming trap:** `project_vendors.vendor_id` → `vendors(id)` and `budget_items.project_vendor_id` →
> `project_vendors(id)` are DIFFERENT things one join apart. Don't "simplify" it.

> **No-migration slices to date:** the 5-template pack; V3-QA-01…06; SEAT-02/03/05/05a/08/09/10;
> CHK-01; SET-01; TL-01/02/03; BUD-01; BUD-01a; ONB-01; Soft stack chrome pass (v11); LAND-01;
> LAND-01a; **INV-03; INV-05; INV-02**.

---

## 6. Shell & routing

One login. `lib/post-login-path.ts` routes by account kind.
- **Planner (business):** `/dashboard`, `PlannerShell` + `PlannerProjectSidebar`.
- **Couple (personal):** into their project workspace (`CoupleShell`), gated by onboarding.
- **Invited couple (no account):** into the invited project via `/projects` — see below.

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

**`lib/account-context.ts` — `getAccountContext`.** Decides which shell every user gets. Fixed by
ONB-00: memberships ordered `created_at asc`, projects `.eq("account_id", …)`, returns both
`singleProjectId` (`length === 1`) and `firstProjectId` (`projectIds[0] ?? null`).

> **`AccountContext.kind` is NON-NULLABLE and `getAccountContext` returns `null` for account-less
> users. INV-03 deliberately did NOT widen it.** ~15 call sites do `account?.kind ?? "personal"`;
> widening the type would ripple through every one for no benefit. Account-less users are answered
> by a **separate resolver** instead:

**`getDirectProjectIds(supabase): Promise<string[]>` (INV-03, same file).** Reads
`supabase.auth.getUser()`, queries `project_members` **`.eq("user_id", uid)`** ordered
`created_at asc`. **The `user_id` filter is load-bearing** — RLS alone does NOT scope this, because a
planner reading `project_members` legitimately sees their couples' rows. **It must never throw:** a
brand-new signup calls it before their account exists, and an exception there rebuilds ONB-00's dead
end.

### `/projects` — the only terminal routing decision point

| account context | direct projects | → |
|---|---|---|
| `null` | 0 | `OnboardingForm` (bootstrap) |
| `null` | 1 | `/projects/{id}` — **no onboarding gate** |
| `null` | >1 | minimal Card list (id, name, wedding_date) |
| `personal` | — | `getCoupleDestinationPath(firstProjectId)` |
| `business` | — | `/dashboard` |

Only the `!accountContext` branch changed in INV-03. `/onboarding`'s null-account branch was changed
from `/dashboard` to `/projects` so account-less users reach the decider rather than bouncing.

> **`lib/post-login-path.ts` needed ZERO changes to support invited couples** — it already returned
> `/projects` for a null account. That is the one-terminal-decision-point rule paying for itself.
> Five call sites read `singleProjectId` (post-login-path, dashboard, three leads pages) and every
> one falls back to `/projects`. **A sixth that decides for itself rebuilds ONB-00's dead end.**

### Why the workspace needed no changes for invited couples

Step 0 for INV-03 found the `?? "personal"` fallback scattered across the app is **correct by
construction** for account-less users:

| Surface | Behavior for null account |
|---|---|
| `app/(app)/layout.tsx` | → `"personal"` → CoupleShell ✅ |
| `tabsForAccountKind` | → `"personal"` → Contracts + Access hidden ✅ |
| `coupleOnboardingRedirect` | `!account` → returns null → **wizard never forced** ✅ |
| `contracts/page.tsx` | `kind !== "business"` → redirect ✅ |
| Billing / entitlement | **no gate exists** in front of project tabs ✅ |

That is why INV-03 was one new function plus two small edits rather than a rewrite.

> **`plannerOnly` resolves from ACCOUNT KIND, never from `project_members.role`.** A planner opening
> their own project has no `project_members` row at all; reading role there would break planners.
> Do not "improve" this.

### Invitation acceptance path (INV-05)

```
/invite/[token]
  authenticated   → acceptProjectInvitation(token)
                    → /projects/{projectId}   or   ?error=<reason>
  unauthenticated → setPendingInvite(token)   [httpOnly cookie, 30 min]
                    → STATIC generic invite page (Sign up / Log in)
```

**The route MUST NOT resolve the token before authentication** — no project name, no planner name,
no validity check. That would require an anon read policy on `project_invitations` and would make
this a third anon surface (§4). Generic copy only.

**`consumePendingInvite` runs at BOTH auth entry points:**
1. `app/auth/callback/route.ts` — after `exchangeCodeForSession`, before destination resolution
2. `app/login/actions.ts` — immediately before `getPostLoginPath`

**Password login never passes through `/auth/callback`** (verified at Step 0). With only one call
site, a couple who signs up, confirms their email, and later logs in with a password would never
receive their membership.

**Cookie, not a `next=` query param.** The token must survive signup → email confirmation →
click-through-from-inbox. A query param would have to ride in `emailRedirectTo` and would then
appear in server logs, browser history, and referrer headers. The httpOnly cookie survives the round
trip and leaks nowhere. **The raw token is never logged, echoed, or persisted.**

`consumePendingInvite` returns `null` on the first cookie read for every normal login, deletes the
cookie regardless of outcome, and **must never throw** — it sits in the login path for every user in
the app.

### Shared project workspace

`app/(app)/projects/[projectId]/layout.tsx`: tabs from `lib/project-tabs.ts`, role-gated
(`plannerOnly`). Invalid → `notFound()`. Couple working surfaces use Soft stack vocabulary: progress
/ allocation bands, **raised** cards containing **recessed** rows/wells, sticky context rails,
Figtree display numerals. Canonical two-column split:
`lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]` with `lg:sticky lg:top-6 lg:self-start` rail.

- **Overview** — `WeddingHero` (couple) / `SlimHero` (planner); inline wedding-date editor +
  countdown. **The date editor now works for invited couples (0029).**
- **Checklist** — CHK-01 progress band + two-column body.
- **Budget** — BUD-01/02/01a + allocation band. **No pie/donut/circular progress.** Quote money
  never enters a headline figure. Target editor now works for invited couples (0029).
- **Day-of timeline** — TL-01/02/03; per-vendor printable run sheet at a separate authenticated route.
- **Vendors / Guests / Notes / Seating / Website editor / Contracts** — Soft-stacked in v11.
- **Access (NEW, planner-only)** — `app/(app)/projects/[projectId]/access/page.tsx`. See §7 INV-02.

**Account-scoped planner surfaces:** `/leads`, `/leads/[leadId]`,
`/leads/[leadId]/proposals/[proposalId]/contract`, `/account/billing`.

**Public surfaces (no auth, outside `(app)`):** `app/w/[slug]` (Tier 3 templates, anon read) and
**`app/invite/[token]`** (Tier 2, NO data read). Marketing landing at `/` →
`components/marketing/` (Tier 2, LAND-01).

---

## 7. Features built

Pattern: a folder under the relevant scope with `page.tsx` (server read) + `actions.ts` (`'use server'`
writes by id + `revalidatePath`); RLS authorizes. v1 (checklist, vendors, outreach, guests, notes,
budget, files, timeline), v2 (Contracts + status; lead pipeline + kanban; proposals → accepted →
printable contract; Stripe billing; website builder + dispatcher + public route), v3 (5-template
gallery + `blush` theme; public RSVP), v4 (assistant QA), v5–v7 + v13–v14 (seating through SEAT-10),
v8–v9 (polish pass), v10 (ONB-00 / ONB-01), v11 (Soft stack chrome), v15 (LAND-01 / LAND-01a) all
unchanged. See v15 for their detail; the invariants that matter are restated in §5 and §10.

**Seating occupancy model (authoritative — do not regress):** occupancy = **COUNT of
`seating_assignments` rows** for the table. `assignGuestToTable` upserts `seat_index: null`. A guard
querying `seat_index >= N` is **wrong** and would pass a full table. Rotation step is **45°**.
Drag/click disambiguation: travel under ~4px = select; at/over threshold = drag.

**Not built (seating):** dance floor / floor objects (SEAT-06, deferred by choice), assistant seating
mock-up (SEAT-07), per-seat assignment UI.

### v16–v18 — Planner invites couples (INV-01 … INV-05)

**The product shape:** a planner enters an email. That is the entire planner-side input; everything
else is generated. The couple receives a link, signs up normally, and lands in exactly one project.

**Rejected alternatives, permanently:**
- **Planner-set passwords.** Would require service-role `admin.createUser` (a new consumer of the
  most dangerous credential, for a convenience feature); would make every write on the project
  unattributable between couple and planner; and would move a credential in plaintext through
  whatever channel the planner uses. The real want — low friction for non-technical couples — is
  better served by magic-link / OTP sign-in.
- **`inviteUserByEmail` / `admin.createUser`.** Same service-role objection, plus it would rewrite
  the signup path ONB-00 had just hardened.
- **Giving invited couples their own account.** Would introduce a second writer into
  `accounts`/`account_members` and quietly weaken 0027's `already_bootstrapped` guard.

#### INV-01 — schema + accept function. MIGRATION 0028. FULLY VERIFIED.

Detail in §5. `lib/invitations/actions.ts` wraps the RPC:
- `createProjectInvitation(projectId, email)` — generates 32 random bytes via
  `crypto.randomBytes(32).toString('base64url')`, stores only the sha256 hex, `expires_at` = now +
  14 days. **Returns the RAW token to the caller exactly once. It is never persisted and never
  recoverable.**
- `revokeProjectInvitation(invitationId)` — sets `revoked_at`.
- `acceptProjectInvitation(token)` — calls the RPC, maps P0001 messages to
  `{ ok:false, error: 'expired'|'revoked'|'email_mismatch'|'invalid'|'already' }`. No throw to the UI.
- `removeProjectMember(projectId, userId)` — deletes by the composite pair, not by id.

> **The verification lesson from this slice:** the first checkpoint run produced eleven "passing"
> results against a schema where nothing had been applied — `account_members = 0` because no accept
> ever ran, `project_members = 0` because nothing was ever inserted, planner delete "success, 0 rows"
> because there was nothing to delete. **Absence-shaped assertions pass trivially when the feature
> doesn't exist.** Confirm the migration landed before believing any of them.

#### INV-03 — routing for account-less members. NO SCHEMA. FULLY VERIFIED.

`getDirectProjectIds` + the `/projects` decision table + `/onboarding`'s null branch. Detail in §6.

Also fixed in-slice: **`createProject` carried the naive-first-membership pattern §3 bans**
(`.limit(1).single()` with no `.order()`), confirmed by Step 0. Added
`.order("created_at", { ascending: true })`. One line; latent rather than live (0027 forecloses dual
accounts) but it sat in the exact file the slice touched.

#### INV-04 — couples may edit their own project. MIGRATION 0029.

Detail in §5. **No app-code or UI change** — the wedding-date and budget-target editors already
rendered for anyone who could read the project; RLS was the only blocker, and authorization stays in
the database (§3). The decision that couples MAY edit (rather than hiding the controls) is settled:
it is their wedding date, and it matches the Aisle Planner model where couples maintain their own
details.

#### INV-05 — `/invite/[token]`. NO SCHEMA. FULLY VERIFIED.

Detail in §6. Files: `lib/invitations/pending-invite.ts` (`setPendingInvite` /
`consumePendingInvite`), `app/invite/[token]/page.tsx`, plus the two auth call sites.

Error copy maps the action's error strings: `email_mismatch` → wrong address, offer sign-out;
`expired` → ask your planner for a new link; `revoked` → no longer active; `invalid` → check the
link; `already` → treated as SUCCESS when a `projectId` comes back (the accept function is
idempotent for the same user).

#### INV-02 — planner Access tab. NO SCHEMA. FULLY VERIFIED.

`lib/project-tabs.ts` gains `{ label: "Access", segment: "access", plannerOnly: true }` after
Contracts. Route `app/(app)/projects/[projectId]/access/page.tsx` carries **its own route guard**
copied from the Contracts pattern (`if (account?.kind !== "business") redirect(...)`) —
**hiding a tab is not gating a route**, and both the self-serve couple (`"personal"`) and the invited
couple (`undefined`) must fail it.

Components: `InviteForm.tsx` (invite + one-time link well; maps `23505` to a friendly duplicate
message), `CopyInviteLink.tsx` (clipboard leaf only), `AccessActions.tsx` (Revoke / Remove over the
existing actions). **No new server actions were written.**

> **The members list is derived from accepted INVITATIONS, not from `project_members`.**
> `project_members` has only `user_id`, and `auth.users` is not client-readable — an invitation row
> is the only place an email lives. `accepted_by` supplies the `user_id` for revoke. A
> `project_members` row with no invitation (not currently produced —
> `bootstrap_account_and_project` inserts `accounts` + `account_members` + `projects` only, verified
> Step 0) would simply not be listed, which is correct: this surface manages invited access, not
> account ownership.

> **The token reveal is load-bearing UI.** The raw token is shown ONCE in a recessed well with a
> Copy button and a plain sentence saying it cannot be retrieved later — if lost, revoke and reissue.
> Navigating away loses it permanently, and the checkpoint tested exactly that. Do not add a "show
> again" affordance; there is nothing to show.

**No role picker.** `role` is hardcoded `'couple'` even though the column supports `collaborator` and
`viewer`. Adding a picker later is a UI change with no migration, because the invitation carries the
role.

#### INV-06 — transactional email. NOT BUILT, DELIBERATELY.

There is no transactional email provider in this stack. Gmail `gmail.send` is the COUPLE's mailbox
for vendor outreach and is the wrong instrument entirely. Rather than couple a vendor integration
(Resend/Postmark + templates + deliverability) to the risky routing work, INV-02 ships a **Copy
invite link** button and the planner sends it themselves — which many planners will prefer anyway,
since they are already in a thread with the couple. Email delivery remains available as a standalone
slice whenever wanted.

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
> whether the user owns the account that owns the project. The planner's plan stands.

**The generator's response shape (ONB-01; still current):**
```json
{
  "checklist":        [ { "title": string, "monthsBeforeWedding": number } ],
  "budget":           [ { "category": string, "plannedAmount": number } ],
  "vendorCategories": [ { "category": string, "note": string } ]
}
```
**`phase` is NOT in this shape and must not be added back.** It is derived from the clamped offset
via `phaseFromMonthsBefore`. The prompt carries today's date and `runwayMonths`.
`vendorCategories[].category` MUST be one of `VENDOR_CATEGORIES`' ids.

---

## 9. AI assistant

Unchanged. Reactive tool-use agent in `lib/assistant/` + `components/assistant/`, per-project history
in `assistant_messages`, account-kind-aware system prompt, RLS-protected actions, plain prose. Entry
point is a tab-bar chip with once-per-session, per-tab suggestion tooltips.

**Tools: read + additive-write only. No delete tools.** Read coverage spans checklist, guests,
budget, vendors, vendor_targets, notes (+ `get_note(id)`), timeline (`get_timeline`). A system-prompt
**honesty rule** requires the assistant to say plainly when it has no tool for something.

**Loop semantics:** capped at `MAX_TOOL_ITERATIONS = 8`. Cap-hit WITH committed writes → `ok:true` +
honest summary, exchange persisted; cap-hit with NO writes → persists nothing.

**Cost controls:** static tools+system prefix prompt-cached; history windowed to
`ASSISTANT_HISTORY_WINDOW = 10`; read-tool payloads compacted; state derived from LIVE tool reads.

> **Read coverage is complete for project-scoped planning entities but NOT for account-scoped/public
> entities (leads, proposals, website, RSVP), seating, or invitations.**

---

## 10. Design system — Soft stack (C1)

> **This section is a POINTER.** Token VALUES live in `app/globals.css`. RULES live in
> `.cursor/design.mdc`. If they disagree with this file, those two win. `design/reference.html` is
> **stale** (still Modern romantic); regenerate. `design/theme-direction.html` is superseded — delete.

**Direction:** Soft stack (C1) — calm tool organized by **depth**. Mauve-tinted canvas; raised white
cards; recessed wells for rows/tracks. Hierarchy = raised-contains-recessed. Romance lives in data
and Tier 3 website templates, not in chrome serifs.

### Three-tier surface taxonomy

| Tier | Where | What it gets |
|---|---|---|
| **1 — App chrome** | `app/(app)/`, most of `components/`, planner, forms, seating canvas, assistant, settings, **Access tab** | Soft stack palette + Figtree; two depth levels; three radii; **no** accent flood; **no** Cormorant/Great Vibes |
| **2 — Emotional** | Landing, onboarding hero/welcome, empty-state heroes, **`/invite/[token]`** | Same palette + Figtree; larger display scale; **exactly one** deep field `--deep` per surface |
| **3 — Website + print run sheet** | `components/website/`, public `/w/[slug]`, `RunSheetDocument.tsx` print header | `--ws-*` colour only; Cormorant + (Romance) Great Vibes; Hanken via `--ws-font-sans` |

**Serif / script location rule:** Cormorant Garamond and Great Vibes may appear **only** in
`components/website/` and the run-sheet print header. Nowhere else, at any size, for any reason.

**Status-colour meaning:** sage = settled/done/booked/signed/rsvp-yes; clay = in flight; rosewood =
wrong/overdue/over-plan/declined/rsvp-no; well/muted = neutral. **Kind is never encoded in a status
colour** (esp. seating table kinds).

**Budget:** no pie/donut/circular progress; bars reuse checklist progress-band vocabulary; Allocated
is items-only; quote money never enters a headline figure.

**Seating canvas:** tables raised `--surface` on `--canvas`; outlines `--ring`; selection `--accent`;
full occupancy `--sage`; kind = form + text only. Marketing seating previews may use `--sage-wash`
(`seating-preview-figures.tsx` only).

**Date formatting (LAND-01a):** public/couple-identifying long wedding dates → shared
`formatWeddingDate` in `components/website/template-utils.ts`, locale **`en-US`**. Short-format
survivors stay local (`account-dashboard`, `planner-projects-table`) with explicit `en-US`. Zero
`toLocaleDateString(undefined` remains.

### Open design items (carried from v15)

| Item | Status |
|---|---|
| Legacy CSS aliases (`--plum`, `--stone`, …) in `globals.css` | **Open** — temporary; do not add new alias consumers |
| `design/reference.html` regenerate | **Open** |
| `design/theme-direction.html` delete | **Open** |
| Font-load scoping (Great Vibes only on `/w/`, etc.) | **Open** (optimisation) |
| Dom live Soft stack + LAND-01 / LAND-01a visual checkpoint | **Open** — the standing human gate |
| Tier 1 date locale policy after LAND-01a sweep | **Open** — confirm which chrome dates may use viewer locale |
| Run sheet legacy classnames | **Accepted for now** |
| `/styleguide/date-check` harness | Delete after Dom's five-template date pass |

**Do NOT start a new "Modern romantic polish pass."** Layout language is Soft stack.

---

## 11. How to build new features (the workflow)

One vertical slice per prompt. Migration first (you apply it by hand), then the UI prompt. The
template has held across CRM, billing, website, template-pack, RSVP, assistant QA, seating, the
polish pass, the v10 repair, the v11 Soft stack pass, LAND-01, and **all five INV slices** with low
drift:

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

**NEW (v18) — three verification lessons from the invitation build:**

1. **Confirm the migration landed before believing any checkpoint.** The SQL editor wraps a paste in
   one transaction; one error rolls back everything. Eleven blocks once "passed" against an empty
   schema. Use `to_regclass` / `to_regprocedure` / `pg_policies` first.
2. **Absence-shaped assertions pass trivially when the feature doesn't exist.** `count(*) = 0` proves
   nothing unless you know the code path ran.
3. **Reproduce the defect BEFORE applying the fix, or you lose the ability to.** INV-04's
   before/after was forfeited by applying 0029 early. When that happens, substitute a test that
   discriminates *within* the fix (couple edits persist / viewer edits don't) rather than across it.

**Verify schema claims by introspection, not narration.** Run introspection **one statement at a
time** and coerce long definitions to booleans so they cannot truncate.

**Step 0 is load-bearing. When Step 0 contradicts the prompt, Step 0 wins.** During the INV build
Step 0 correctly caught: the `project_role` enum nobody had recorded; that `project_members` had ONLY
a SELECT policy; that password login bypasses `/auth/callback`; that `createProject` carried the
naive-first-membership pattern; and that `/projects` has no project list at all. Every one changed
the slice.

**Don't diagnose from a screenshot.** Get the rows.

**Drift watchlist:**
- Manual permission filters; naive first-membership lookups
- **A new user class gaining read access without auditing every write policy on that table**
- **Assuming a missing policy errors — it silently succeeds and writes nothing**
- **Non-idempotent migrations (`create policy` / `create trigger` without `if exists` drops)**
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
- Reintroducing Modern romantic chrome
- Using Soft stack tokens as public website colour
- **Hiding a tab and calling it authorization — gate the ROUTE**

---

## 12. Compliance & security notes

- **Stripe:** webhook verifies raw-body signature; service-role only in webhook (+ billing/admin);
  entitlement read only from the `subscriptions` row. **Stripe Tax NOT set up** — register in a
  jurisdiction before collecting there. (Not legal/tax advice.)
- **Public website read:** anon `using (published = true)`; self-contained snapshot.
- **Public RSVP write:** anon `INSERT` only, gated to published sites; `project_id` derived
  server-side; honeypot + soft throttle. **Collects guest PII** → privacy policy.
- **Invitations (v18):** raw tokens are 32 random bytes, base64url, **stored only as sha256 hex**.
  Never logged, echoed into a URL the user lingers on, or persisted client-side. Acceptance is bound
  to `auth.email()` — a forwarded link cannot be redeemed by the wrong person. Expiry is 14 days;
  revocation is immediate. **No anon RLS policy was added; no service-role path was added; no user is
  created on the couple's behalf.** The pending-invite cookie is httpOnly, `sameSite: lax`, secure in
  production, 30-minute lifetime, consumed once.
- **Gmail OAuth:** `gmail.send` is a **sensitive** scope → needs sensitive-scope verification.
  Testing mode: 7-day test-user token expiry, 100-test-user cap — viable for planner + pilot couples
  only, NOT public. **Invitations do not depend on Gmail.**
- **Signup:** `auth.signUp` only, then email confirmation. **No account/project is created at
  signup** — bootstrap happens on the OnboardingForm submit, behind the `already_bootstrapped` guard.
- **Google Places / Files / Assistant / Seating / Budget:** store only `place_id`; private bucket +
  signed URLs gated by `<projectId>/`; assistant can't exceed RLS.
- **Production infra:** prod belongs in a **separate Supabase org on Pro**. Fresh prod project,
  migrations **0001–0029** applied by hand once each in order (NEVER `db push`), storage bucket +
  policies recreated, real SMTP, prod domain in auth redirect URLs. See the Launch Prep Runbook.
- Set Anthropic + Google Cloud + Stripe + Supabase billing/spend alerts.

---

## 13. Known caveats / things to verify

**Closed by v10 (still closed):** BUD-02 rail + BUD-01a variance; 0026 introspection; signup dead-end
(ONB-00); plans born overdue (ONB-01); `setMonth` day-overflow; the `projects.onboarded_at` misclaim.

**Closed by v11 (design):** Soft stack tokens live; Figtree chrome; three-tier taxonomy; couple +
planner + marketing Soft stack UI; Tier 1/2 classname sweep.

**Closed by v16–v18 (invitations):**
- **`projects` UPDATE RLS asymmetry** — open since v10 as a Phase-4 caveat; became a live defect the
  moment INV-03 shipped; fixed by 0029.
- **`createProject` naive-first-membership** — flagged "unverified" since v10; confirmed by Step 0
  and fixed in INV-03.
- **`project_members` recursive-policy flag** — investigated and closed; safe by owner privilege
  (§4). **Do not re-flag.**
- **`project_members` had no DELETE policy** — fixed by 0028.

**Open — security / schema:**
- **`projects` has NO DELETE policy.** Silent-no-op shape, currently unreached (nothing deletes a
  project). Decide deliberately before anything does.
- **`project_invitations.invited_by` / `accepted_by` have no FK to `auth.users`**, unlike
  `project_members.user_id`. Minor; cosmetic integrity gap.
- **`project_vendors.status` has NO CHECK.** Canonical booked = `'booked'` lowercase.
- **`budget_items.category` free-text/nullable** — Uncategorized bucket handles it.
- **0026 partial unique index** behavior-verified, not indexdef-introspected (minor).
- **Cross-project FK rejection** unverified by choice (one couple project in dev).
- **`tasks.phase` still free-text**; past `wedding_date` still permitted.

**Open — invitation feature (known gaps, deliberate):**
- **A user who ALREADY has a personal account can accept an invitation** (0028 doesn't care), but
  INV-03's routing sends personal users to `getCoupleDestinationPath` — **their direct project stays
  invisible with no UI path to it.** Expected, not a regression. The `/projects` >1 list is the
  natural home for a fix. Test invitations with an account-less fixture, or expect this.
- **Dual-account is foreclosed, deliberately.** 0027 refuses bootstrap for *any* existing membership.
  Reversible in one `create or replace` the day it's required.
- **Next.js Server Component cookie write.** `setPendingInvite` writes a cookie from a Server
  Component and currently works. Next officially permits `cookies().set()` only in Server Actions and
  Route Handlers, so **this is version-dependent and may break on a Next upgrade.** If it does, the
  fix is a Route Handler at `app/invite/[token]/route.ts` that sets the cookie and redirects to a
  static `app/invite/page.tsx` — which also removes the token from the URL the user sits on.
- **No email delivery** (INV-06). Planners copy the link.
- **No role picker** — `collaborator` and `viewer` are supported by the schema and by
  `can_edit_project`, but nothing issues them. `viewer` refusal was live-tested.
- **Assistant has no tools for invitations**, nor for leads, proposals, website, RSVP, or seating.

**Open — Soft stack / design (the standing human gate):**
- **Dom live Soft stack + LAND-01 / LAND-01a visual checkpoint** across couple tabs, planner,
  landing, login, leads, billing, and `/w/[slug]` date hydration. **Now also covers the Access tab
  and `/invite/[token]`.** Typecheck is not verification.
- Tier 1 date locale policy after the LAND-01a sweep.
- `design/reference.html` stale; `design/theme-direction.html` to delete; legacy CSS aliases;
  font-load scoping; `.font-display` / `.couple-name` near-duplicates; `/styleguide/date-check`
  harness to delete.

**Open — other:**
- Assistant QA slices typecheck clean; not all live-verified in one session.
- Seating occupancy action-enforced; seats all guests regardless of RSVP; timeline `owner` free text.
- RSVP → guest matching NOT built; RSVP throttle soft.
- Lead→project conversion NOT built (Phase 4).
- Currency helpers duplicated — prefer `lib/format-currency.ts`.
- Confirm files under `<projectId>/`; confirm no Gmail token reaches the client.

**Dev DB state (verified v18):**
- `dominicciccaglione@gmail.com` (`6bf62d70-ae1c-47cf-aff1-2125bc90f444`) — **personal**,
  "Dom & Jordyn 2027", wedding 2027-02-13.
- `d.ciccaglione1@gmail.com` (`1779eba2-c4b4-456e-a95f-ba15661f5662`) — **business**,
  "Events by Jordyn", **Mila & Griffin** (`1f1a2a78-5c8f-4e7c-902b-74eb5e1318f9`, planner-created, no
  `wedding_profile`, `wedding_date = 2027-02-15`, `total_budget = 40000.00`, **0 project_members**).
  **Must remain at these values** — every INV checkpoint restored them.
- `d.ciccaglione@icloud.com` (`ed4c4b9b-b6b3-41ad-8764-aad854046841`) — **orphaned auth user, 0
  memberships, 0 project_members.** The invited-couple fixture; restored after every checkpoint.

---

## 14. Roadmap

**Done (v1–v15):** unified shell + routing; shared primitives; timeline; couple onboarding → AI plan;
AI assistant; Contracts; lead pipeline; proposals → printable contract; Stripe billing; website
builder + 5-template gallery; public RSVP; assistant QA; seating through SEAT-10; polish pass
(CHK-01, SET-01, TL-01/02/03, BUD-01/01a/02); signup + plan-generation repair (ONB-00 **0027**,
ONB-01); Soft stack chrome (v11); landing overhaul (LAND-01 / LAND-01a).

**Done (v16 — INV-01 + INV-03):**
- **INV-01** — Migration **0028**. `project_invitations`, `can_manage_project_access`,
  `accept_project_invitation`, `project_members` DELETE policy. Fully live-verified.
- **INV-03** — No schema. `getDirectProjectIds`, `/projects` decision table, `/onboarding` null
  branch, `createProject` ordering fix. Fully live-verified.

**Done (v17 — INV-04):**
- Migration **0029**. `can_edit_project`, `"editors update projects"`,
  `projects_account_id_immutable`. Verified (with the checkpoint-1 caveat in the header).

**Done (v18 — INV-05 + INV-02):**
- **INV-05** — No schema. `/invite/[token]`, pending-invite cookie, acceptance at BOTH auth entry
  points. Fully live-verified including the password-login path.
- **INV-02** — No schema. Planner Access tab: issue / list / revoke / remove / copy one-time link.
  Fully live-verified including the direct-URL route guard and revoke-then-open-link.

Current through **0029**; next-free **0030**.

**In progress:** Dom Soft stack + LAND-01 live visual checkpoint (human). Not a Cursor slice.

**Remaining couple side:** moodboard; optional seating depth (per-seat UI / SEAT-07); **ONB-02
(0030)**; **BUD-03 (pre-launch)**.

**Remaining planner side:** invoicing accepted proposals; deeper CRM; INV-06 (email delivery);
optional role picker (`collaborator` / `viewer`).

**Phase 4 — bridge:** lead→project conversion. **Re-audit every write policy when this ships** —
it introduces another path by which a user gains project access.

**Phase 5 — automation:** PROACTIVE assistant.

**Decided:**
- AI = Claude (`claude-sonnet-4-6`). Outreach = couple's Gmail. Payments = Stripe (flat monthly).
  Website = curated template gallery via dispatcher. Prod = separate Supabase org on Pro.
- Seating = SVG pointer interactions; not @dnd-kit. Rotation step = **45°**. SEAT-06 deferred.
- **Budget: Allocated is items-only; quote money never enters a headline figure.** No pie/donut.
- **Chrome = Soft stack (C1).** Do not reopen Modern romantic. Tier 3 websites stay on `--ws-*`.
- **Public wedding long dates = shared `formatWeddingDate`, locale `en-US`.**
- **Signup creates NO tenant.** Bootstrap once on OnboardingForm, guarded in DB (0027).
- **Invited couples get project membership and NO account of their own.** Not a compromise — the
  correct ownership model for planner-led engagements, and what keeps 0027's guard airtight.
- **No planner-set passwords. No service-role user creation. No anon read on invitations.**
- **Invitation tokens are hashed at rest and shown exactly once.**
- **`viewer` cannot edit.** That is the role's purpose.
- **`projects.account_id` is immutable** (trigger).
- **ONB-02 owns migration 0030** (`commitPlan` atomicity + `vendor_targets.category` CHECK).
  **BUD-03** takes next-free at build time.
- **Photos: declined twice, permanently. Not deferred.**

---

## 15. Start here next (pick-up point)

The couple product is feature-complete, shareable, payable, and now **shareable with a planner's
couples**. Plan is **couples-first launch**. Bible is at **v18**. Schema through **0029**; next-free
**0030**.

**Do not resume a Modern romantic / VND-01 layout polish pass.** Vendors chrome is Soft-stacked.

**A. Dom Soft stack + LAND-01 / LAND-01a live visual checkpoint (still open, now larger).**
Walk couple tabs (Overview, Checklist, Budget, Timeline, Vendors, Guests, Seating, Website editor,
Notes), planner dashboard/leads/billing/**Access**, landing (hero tabs, checklist %, scroll bars,
reduced-motion, mobile, single `--deep` field), login, **`/invite/[token]`**, and public `/w/[slug]`.
Confirm no hydration mismatch on Overview hero / run sheet / published sites. Fix only real
regressions — don't invent a second design system.

**A2. Invite Jordyn for real.** The honest end-to-end test, and the first time the design
collaborator sees her own view of the product. Use the Access tab on a planner project.

**B. ONB-02 — `commitPlan` atomicity + `vendor_targets.category` CHECK. Migration 0030.**
Three sequential non-atomic inserts (tasks, budget_items, vendor_targets) with no transaction: a
failure on insert #2 leaves tasks, no budget, and `onboarded_at` unstamped. v10 proved onboarding is
where this product breaks — this is the last known un-hardened step in that path.

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
`lib/date-months.ts` — do not write a fourth copy.

**D. Launch (after ONB-02 + BUD-03 + visual QA).**
Follow the **Launch Prep Runbook**: separate prod Supabase org on Pro + migrations **0001–0029** (by
hand — **never `db push`**) + storage + SMTP; Vercel + domain + env; Stripe live + webhook + Portal +
Tax; prod Places key; Gmail stays testing mode; privacy + ToS; monitoring; **full prod smoke —
including real signup, deliberate double-click, and a real invitation round trip.**

**E. Planner depth / revenue (after launch, or sooner if planner-led).**
- Invoicing accepted proposals (recommended first post-launch).
- INV-06 email delivery — turns the copy-link flow into a send-invitation flow.
- Lead→project conversion (Phase 4) — **re-audit write policies**; unlocks BUD-02 cross-project FK check.

**F. Seating — remaining (OPTIONAL).** SEAT-08/09/10 DONE. SEAT-06 deferred by choice.
**SEAT-07** assistant seating mock-up: no new schema.

**G (other rounding-out):** moodboard; assistant tools for leads/proposals/website/RSVP/seating/
invitations; per-seat assignment UI; role picker (`collaborator`/`viewer`); `projects` DELETE policy
decision; personal-user-with-direct-project visibility; website caching; RSVP→guest matching;
checklist Other/Unscheduled bucket; `project_vendors.status` CHECK; currency-helper consolidation;
regenerate `reference.html` / delete `theme-direction.html` / retire CSS aliases; font-load scoping.

**Recommended path:** **Visual checkpoint + invite Jordyn (A/A2)** → **ONB-02 / 0030 (B)** →
**BUD-03 (C)** → **Launch (D)** → invoicing → INV-06 → conversion (E) → remaining G.