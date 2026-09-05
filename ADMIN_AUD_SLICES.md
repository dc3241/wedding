# First Look Admin — Audience-Split slices (ADMIN-AUD)

Paste **one slice per Cursor chat**, in order. This file is prompts, not an implementation. Cursor must run **Step 0 on every slice** and **STOP and report back** if a finding contradicts this file — same discipline as `PROJECT_BIBLE_v43.md` §11.

Authored 2026-09-04 from the Audience-Split Handoff Spec + `first-look-ops.html` (v2 mockup) **plus a live-repo scan**. The original spec was written from the Bible without opening the repo; several assumptions were stale. Those corrections are baked in below. Re-verify anyway — a next-free number in this file can be taken the same day.

**Canonical sources for the implementing chat:** this file, `PROJECT_BIBLE_v43.md` §11, `.cursor/rules/design.mdc`, the v2 mockup at `c:\Users\dcicc\Downloads\first-look-ops.html`. If a hex disagrees, `app/globals.css` wins. If a rule disagrees, `design.mdc` wins. The mockup is a rendered example — **non-normative for type**. It uses Cormorant on pillar names; admin is Tier 1 chrome, so Figtree only. Do not copy `.font-serif` / `--font-serif` into `components/admin/` or `app/(admin)/`.

Migrations are hand-pasted into the Supabase SQL editor. **`supabase db push` is forbidden.** Create the numbered file under `wedding-app/supabase/migrations/`. Dom applies it.

---

## How to use this file

1. Resolve the **Open decisions** below (Dom) before pasting any gated slice. Do not let Cursor pick silently.
2. Paste **Global Step 0** into the first chat (or the ADMIN-AUD-00 chat, at the top). It is a recon pass — it writes nothing.
3. Paste one `## ADMIN-AUD-NN` block per chat. Do not combine slices.
4. Cursor runs that slice's Step 0, reports findings, then implements only if nothing contradicts.
5. Dom runs every **Checkpoint** live. Cursor cannot authenticate as admin.

---

## Open decisions (resolve these first — don't silently pick)

### 1. Media library — is ADMIN-AUD-05 a no-op?

**Authoring-scan finding (code, not a logged-in browser):** it is already live.

- Nav item `Media library` → `/admin/media` in `components/admin/admin-shell.tsx` — **no "Soon" tag**, not disabled.
- Page: `app/(admin)/admin/media/page.tsx` reads `media_assets` via `getMediaAssets` and renders `components/admin/media-library.tsx` (TUS upload, status, notes, signed download, delete).
- Schema: `media_assets` in `0103_admin_foundation.sql`; private `admin-media` bucket in `0104_admin_media_bucket.sql`.

The spec's "promote from a disabled Soon placeholder" describes the **mockup**, not the app. **ADMIN-AUD-05 is a no-op** beyond keeping Media library top-level/shared in ADMIN-AUD-01.

Implementing Cursor must still open `/admin/media` in the running app at that slice's Step 0 (Dom may need to be logged in). If it really is a Soon placeholder live, STOP — that would mean 0104 shipped on disk but the UI never wired, which is bigger than a nav move.

### 2. "Ideation" is two different things — **Dom must pick (a), (b), or (c) before ADMIN-AUD-04**

| | Spec's new nav items | Already shipped `/admin/ideation` (ADMIN-00 / 0103) |
|---|---|---|
| What | Static pillar-reference cards (hardcoded lists) | Generate N AI candidates, like/dislike + comment, few-shot on next generate |
| Data | None | `ideation_items` |
| Mockup | No generate button, no rating, no DB | Live page at `/admin/ideation` |

**Recommendation: (a)** — rename the new static pages to **Content pillars** (nav label "Content pillars"; routes `/admin/couples/pillars` and `/admin/planner/pillars`). Keep `/admin/ideation` (generate + rate) as its own top-level nav item, shared, not inside either audience group. Least disruptive; matches the mockup (pillar pages are pure reference).

(b) Fold the static list into the top of `/admin/ideation` as a collapsible panel, split by audience. No second page.
(c) Something else Dom prefers.

ADMIN-AUD-04 below is written for **(a)**. If Dom picks (b) or (c), rewrite that slice before pasting it. ADMIN-AUD-01 stubs must use the chosen label/route.

### 3. Reddit isn't a legal `content_bank_items.platform` value today

`0103` CHECK: `tiktok|instagram|facebook|pinterest|linkedin|youtube` — no `reddit`.

**Recommendation: widen the CHECK.** Store Reddit threads in the existing shape (`idea` = thread title, `notes` = subreddit, `body` = why it's relevant). The Reddit tab is `WHERE platform = 'reddit'`. Do **not** touch `content_queue.platform` (that's `instagram|tiktok|pinterest` for the Friday KIE batch — a different feature).

Do not build a separate `reddit_threads` table unless Dom explicitly picks that.

### 4. Venue-partner / referral pillar is unapproved content

Ship the pillar **card** (reference text + a "New" pill). Do **not** wire any automation prompt or content-bank seed to auto-generate from "give your couples a better planning experience" until Dom says yes. ADMIN-AUD-04 honors this; ADMIN-AUD-08 must not add a generator for that pillar.

### 5. Content queue is missing from the spec's nav *(found in the repo scan — not in the original four)*

Live `AdminShell` NAV_ITEMS currently:

1. Overview `/admin`
2. Schedule `/admin/schedule`
3. Content bank `/admin/bank`
4. **Content queue `/admin/content-queue`** ← Friday KIE review board (CONTENT-QUEUE-00/02). The mockup and the spec omit this entirely.
5. Automations `/admin/automations`
6. Performance `/admin/performance`
7. Media library `/admin/media`
8. Ideation `/admin/ideation`

The spec says "Nothing about Schedule, Performance, or the Friday Cowork task changed." Dropping Content queue from the nav would change the Friday task's home.

**Recommendation:** keep **Content queue** top-level/shared, after Media library (with Overview / Schedule / Performance / Media library / Content queue, then the two audience groups). Do not put it inside Couples even though the queue is IG/TikTok/Pinterest — it's an ops board, not a couples-content authoring surface.

If Dom wants it under Couples or hidden, say so before ADMIN-AUD-01. Cursor must STOP if it cannot find `/admin/content-queue` and was about to delete the route.

---

## Authoring-scan facts (Global Step 0 — 2026-09-04)

Implementing Cursor **still re-runs** these greps. These are expected answers, not permission to skip.

| Check | Finding |
|---|---|
| Next-free migration | Highest file is `0107_content_queue_assets_bucket.sql`. **Next-free is 0108** unless a later file landed after this scan. |
| `content_bank_items` columns (0103, not `information_schema` — Supabase MCP was unauthenticated at authoring) | `id, platform, idea, type, format, title, body, notes, created_by, created_at, updated_at`. **`idea` is `NOT NULL`.** The spec's "title/body/notes" list omitted `idea`. There is no `audience` column. |
| Platform CHECK name | `content_bank_items_platform_check` on `content_bank_items`. Value list does **not** include `reddit`. |
| `content_queue.platform` | Separate CHECK: `instagram\|tiktok\|pinterest` in `0106_content_queue.sql`. **Do not widen it.** |
| Schedule vs bank keys | **Two vocabularies.** `SCHEDULE_PLATFORM_COLS` in `lib/admin/platforms.ts` already tags `group: "c" \| "p"`: couples = `tiktok, ig, fbPage, fbGroups, pinterest`; planner = `linkedin, reddit, youtube, outreach`. Bank `CONTENT_PLATFORMS` uses `instagram` / `facebook` (not `ig` / `fbPage` / `fbGroups`) and has **no reddit**. Overview's today-list iterates `SCHEDULE_PLATFORM_COLS`, not bank keys. |
| Sidebar file | `components/admin/admin-shell.tsx`. Collapse-to-icon-rail + mobile drawer + `acquireScrollLock` live in **this same file**. **No hover tooltips today** (mockup has `.nav-tooltip`; live code does not). Eyebrow currently says "Social media". |
| Overview today-list | `app/(admin)/admin/page.tsx` — one card, filters `SCHEDULE_PLATFORM_COLS` where status ≠ `off`. Data: `schedule_days.platforms` jsonb via `getScheduleWeeks` / `pickCurrentWeek` / `adminToday()` (America/Phoenix). |
| Bank page | `app/(admin)/admin/bank/page.tsx` + `components/admin/content-bank-board.tsx`. Tabs = all `CONTENT_PLATFORMS` plus an "All" chip. |
| Automations | `app/(admin)/admin/automations/page.tsx` + `components/admin/automations-board.tsx`. Table `admin_automation_prompts` columns: `id, name, description, prompt_template, is_manual_trigger, created_at, updated_at`. **No audience/platform column.** Seeded names in `0105`: New content-day batch; Turn a TikTok script into IG/FB; Pinterest pin variations; LinkedIn post draft; Fill next month's Schedule tab; Monthly performance read. **Reddit comment draft and YouTube video idea batch do not exist.** |
| Live vs mock Run | `POST /api/admin/automations/run` already calls Anthropic (`MODEL_API_KEY`) for **every** prompt. There is no mock-only mode in the app. The mockup's disabled "Mockup only" buttons are HTML-only. LinkedIn post draft is already a real Anthropic call. |
| Anthropic helpers | Automations run route: **local `callClaudeText`** (raw Messages API, free text). Ideation generate + content-queue plan: **`callClaudeJson`** in `lib/inquiry/llm-json.ts` (parse fenced JSON — **does not** currently send `output_config.json_schema`). ONB-07 structured schema lives in `lib/generate-wedding-plan.ts` (`output_config.format.type = "json_schema"`). |
| Admin API concealment | 404 `{ error: "Not found" }` for non-admins. Layout gate is not enough — every action re-checks `checkIsAdmin()`. |
| Design | Admin is Tier 1. No Cormorant. Three radii only. No raised-inside-raised. |

---

## Suggested run order

Default: **00 → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08**.

- **04** is gated on Open decision #2.
- **05** is a no-op given the scan; still paste it so Cursor confirms `/admin/media` live and moves on.
- **06 / 07** only need **01** (nav + stub routes). Faster path for the two new pages: `00 → 01 → 06 → 07`, then `02 / 03 / 04 / 05 / 08`.
- **00** assumes Open decision #3 = widen the CHECK.
- **01** assumes Open decision #5 = Content queue stays top-level, and #2 = (a) Content pillars + keep `/admin/ideation`.

---

## Global Step 0

Paste this block at the top of the first implementing chat (ADMIN-AUD-00 is fine).

```
Global Step 0 — recon only, write nothing.

You are implementing the First Look Admin audience-split (ADMIN-AUD) against
wedding-app/. Read ADMIN_AUD_SLICES.md (this file) and PROJECT_BIBLE_v43.md §11.
If any finding contradicts ADMIN_AUD_SLICES.md, STOP and report before writing
code or SQL.

Report, with file paths and exact strings:

1. Grep supabase/migrations/ for the true next-free number. Do not trust 0108
   without listing the highest NNNN_*.sql on disk.
2. content_bank_items: quote the CREATE TABLE + CHECKs from 0103 (or live
   information_schema.columns / pg_get_constraintdef if you have a DB URL).
   Confirm the constraint name is content_bank_items_platform_check and that
   reddit is absent.
3. Confirm no other table/view CHECK or TS union copies that exact six-value
   platform list. Grep for CONTENT_PLATFORMS, ContentPlatform, and the six
   platform names together. content_queue.platform is a different CHECK —
   list it and leave it alone.
4. Open lib/admin/platforms.ts. Quote SCHEDULE_PLATFORM_COLS in full (keys +
   group tags) and CONTENT_PLATFORMS. Note the two vocabularies.
5. Open components/admin/admin-shell.tsx. List NAV_ITEMS href+label in order.
   Confirm collapse + mobile drawer live in this file. Confirm whether hover
   tooltips exist. Confirm /admin/content-queue and /admin/ideation are present.
6. Open /admin/media in the running app if you can authenticate; otherwise
   read app/(admin)/admin/media/page.tsx + media-library.tsx and say whether
   it is live or a Soon placeholder.
7. admin_automation_prompts: quote columns from 0103. List seeded prompt
   names from 0105. Confirm whether a live/mock flag exists (it should not).
8. Confirm callClaudeJson (lib/inquiry/llm-json.ts) vs the local callClaudeText
   in app/api/admin/automations/run/route.ts vs generate-wedding-plan.ts
   json_schema. Do not invent a fourth Anthropic client later.

Return the findings list. Do not write files yet.
```

---

## ADMIN-AUD-00 — Schema: Reddit platform + platform→audience mapping

**Context.** Backs the couples/planner split (spec §3: filtering is a WHERE clause, not two hardcoded tables). Resolves Open decision #3 (widen CHECK, no new table).

**Builds on:** ADMIN-00 / `0103_admin_foundation.sql` (`content_bank_items`).

**Prerequisites:** Open decision #3 = widen the CHECK. If Dom picked a separate Reddit table, STOP.

**0. Verify before changing anything (report findings):**

- Re-grep next-free. Authoring scan: **0108**. If 0108 exists, use the new next-free and say so.
- Quote `content_bank_items_platform_check` via the 0103 file (and `pg_get_constraintdef` if a DB URL is available).
- Grep for every consumer of the six-value platform list: `lib/admin/platforms.ts` (`ContentPlatform` + `CONTENT_PLATFORMS`), `components/admin/content-bank-board.tsx`, `app/(admin)/admin/bank/actions.ts`, `lib/admin/types.ts`. No materialized view in migrations.
- Confirm `0106_content_queue.sql` CHECK is `instagram|tiktok|pinterest` — **do not touch it**.
- Quote `SCHEDULE_PLATFORM_COLS` — it already has `group: "c" | "p"` and already includes `reddit` as a **schedule** key. Bank and schedule are different key sets.

If any of that contradicts this prompt, STOP.

**1. Schema:** `supabase/migrations/0108_content_bank_reddit.sql` (or NONE if the CHECK already includes `reddit` — check first; authoring scan says it does not).

Re-runnable (Bible rule: drop-if-exists before add):

```sql
alter table content_bank_items drop constraint if exists content_bank_items_platform_check;
alter table content_bank_items add constraint content_bank_items_platform_check
  check (platform in ('tiktok','instagram','facebook','pinterest','linkedin','youtube','reddit'));
```

Do **not** add an `audience` column. Audience is a pure function of platform. Do **not** touch `content_queue`. Do **not** backfill — Reddit/YouTube bank rows are added going forward.

Hand-paste. After paste, confirm with a direct SQL insert of `platform = 'reddit'` (needs `idea` + `body` because both are NOT NULL):

```sql
insert into content_bank_items (platform, idea, body, notes)
values ('reddit', 'Step 0 check — delete me', 'why relevant', 'r/test');
```

That insert must succeed. Delete the row after. A `platform = 'made_up'` insert must fail the CHECK.

**2. Data access — `lib/admin/platform-audience.ts` (new, no schema, pure code):**

Do **not** copy the spec's hardcoded `COUPLES_PLATFORMS = ['tiktok','instagram',…]` as a second vocabulary that can drift from `SCHEDULE_PLATFORM_COLS`.

- Import `SCHEDULE_PLATFORM_COLS` and `CONTENT_PLATFORMS` from `lib/admin/platforms.ts`.
- `audienceForPlatform(platform: string): 'couples' | 'planner' | null`:
  - If `platform` matches a `SCHEDULE_PLATFORM_COLS[].key`, return `'couples'` for `group === 'c'`, `'planner'` for `group === 'p'`.
  - Also accept bank keys that are not schedule keys: `instagram` → couples, `facebook` → couples. (`tiktok` / `pinterest` / `linkedin` / `reddit` / `youtube` already exist on the schedule list.)
  - Unknown string → `null`.
- Export bank-platform lists **derived** from `CONTENT_PLATFORMS` + `audienceForPlatform`, not retyped:
  - Couples bank: tiktok, instagram, facebook, pinterest
  - Planner bank: linkedin, reddit, youtube
- `outreach` is schedule-only, planner group — `audienceForPlatform('outreach') === 'planner'`. It has no bank tab.

Every later couples/planner filter (AUD-02/03/08) imports from this file. Never re-derive the split inline.

**Also in this slice (required for the CHECK to be usable from the bank UI later):** add `'reddit'` to the `ContentPlatform` union and to `CONTENT_PLATFORMS` in `lib/admin/platforms.ts`:

```
{ key: "reddit", label: "Reddit", usesType: false, usesFormat: false, usesTitle: false, bodyLabel: "Why it's relevant" }
```

Reddit rows use the existing columns: `idea` = thread title/topic, `notes` = subreddit (e.g. `r/weddingplanning`), `body` = why it's relevant. Do not add columns.

**3. UI:** none in this slice.

**Behavior.** Existing bank rows unaffected (widening a CHECK is additive).

**Constraints.** Don't touch `content_queue`. Don't add a stored audience copy. Don't invent schedule keys. Don't use Cormorant.

**Checkpoint (live, not a typecheck).**

- SQL insert `platform = 'reddit'` succeeds; `platform = 'made_up'` fails.
- `audienceForPlatform('reddit')` → `'planner'`; `audienceForPlatform('tiktok')` → `'couples'`; `audienceForPlatform('ig')` → `'couples'`; `audienceForPlatform('instagram')` → `'couples'`; `audienceForPlatform('fbPage')` → `'couples'`; `audienceForPlatform('outreach')` → `'planner'`; `audienceForPlatform('made_up')` → `null`.
- `content_queue` CHECK unchanged.

---

## ADMIN-AUD-01 — Sidebar IA restructure

**Context.** Nav reorganization. Everything downstream depends on these routes existing. No schema.

**Builds on:** ADMIN-TYPE-01 (`AdminShell`).

**Prerequisites:** Open decision #2 default **(a)** (Content pillars + keep `/admin/ideation`). Open decision #5 default (Content queue stays top-level). If Dom picked otherwise, STOP and adjust labels/routes before writing.

**0. Verify:**

- Confirm you are editing `components/admin/admin-shell.tsx` — collapse-to-icon-rail (`md:w-[68px]`), mobile drawer (`-translate-x-full` / `acquireScrollLock`), and nav list all live here. Do not fork a second shell.
- List current `NAV_ITEMS`. Authoring scan order is Overview, Schedule, Content bank, Content queue, Automations, Performance, Media library, Ideation.
- Confirm existing routes under `app/(admin)/admin/`: `page.tsx`, `schedule`, `bank`, `content-queue`, `automations`, `performance`, `media`, `ideation`. Follow that pattern — **do not** introduce a mockup-style single-page `data-section` toggle.
- Confirm live code has **no** collapsed-rail tooltips. This slice must add them (checkpoint requires hover tooltips).

If the sidebar file is different, STOP and edit the real file.

**3. UI only — restructure the sidebar to:**

```
Overview
Schedule
Performance
Media library
Content queue          ← keep; not in the mockup; Open decision #5
Ideation               ← generate+rate, Open decision #2 (a); omit this row if Dom picked (b)
─────────────
Couples
  Content pillars      ← was "Ideation" in the mockup; (a) rename
  Content bank
  Image generator
  Automations
─────────────
Venues & planners
  Content pillars
  Content bank
  Venue outreach
  Automations
```

Routes (Next.js, under `app/(admin)/admin/...`):

| Nav | href |
|---|---|
| Overview | `/admin` |
| Schedule | `/admin/schedule` |
| Performance | `/admin/performance` |
| Media library | `/admin/media` |
| Content queue | `/admin/content-queue` |
| Ideation (generate+rate) | `/admin/ideation` |
| Couples · Content pillars | `/admin/couples/pillars` |
| Couples · Content bank | `/admin/couples/bank` |
| Couples · Image generator | `/admin/couples/image` |
| Couples · Automations | `/admin/couples/automations` |
| Planner · Content pillars | `/admin/planner/pillars` |
| Planner · Content bank | `/admin/planner/bank` |
| Planner · Venue outreach | `/admin/planner/outreach` |
| Planner · Automations | `/admin/planner/automations` |

Match mockup section ids to routes as above (`couples-ideation` → `/admin/couples/pillars` under option (a); `medialibrary` → `/admin/media`; `planner-outreach` → `/admin/planner/outreach`; etc.).

**Stubs:** for every new route that is not built until a later slice, add a `page.tsx` that uses existing `PageHeader` + a short muted sentence ("Coming in a later slice") so the nav never 404s. Reuse `Card` / Soft stack tokens. No fake data.

**Redirects** so old bookmarks don't 404 (Next.js `redirect` in the old page files, or a thin `page.tsx` that `redirect()`s):

- `/admin/bank` → `/admin/couples/bank`
- `/admin/automations` → `/admin/couples/automations`

Keep `/admin/ideation`, `/admin/media`, `/admin/content-queue`, `/admin/schedule`, `/admin/performance` where they are.

**Nav chrome:**

- Replace the "Social media" eyebrow with section labels: none on the top shared block; **Couples**; **Venues & planners**. Use the mockup's `nav-section-label` treatment (uppercase, ~10.5–12px, 600, letter-spacing, `#948B90`) — those are Soft stack-adjacent, not new tokens. Hairline dividers between the three blocks (`rgba(243,238,240,.1)` on the ink rail, as the mockup does).
- Preserve collapse-to-icon-rail + mobile drawer exactly. When collapsed, **show a tooltip on hover** (live code is missing this; add it). Tooltip copy = the full label, with group prefix where two items share a name ("Couples content bank", "Venues & planners automations", etc.) — same as the mockup's `nav-tooltip` strings, adjusted for "Content pillars".
- Active state: `bg-white/12`, accent icon, as today.
- Do **not** add the mockup's "New content" CTA button — it is not in the spec nav list.
- Do **not** add Soon tags.
- `isActive` for `/admin` must stay exact-match so `/admin/schedule` does not highlight Overview. Nested `/admin/couples/*` items should not all highlight each other — match on the item href, not the `/admin/couples` prefix as a group.

**Behavior.** Same tokens as today (`bg-ink`, `text-canvas`, `--accent`, `--radius-inner`). No new CSS variables.

**Constraints.** Don't edit Schedule, Performance, Content queue, or Media page **content** — only nav position. Don't fork the shell. Don't use serif. Don't put Media library or Content queue inside an audience group.

**Checkpoint.**

- Desktop sidebar order matches the list above.
- Collapsing to the icon rail still works; hover shows tooltips.
- Mobile drawer opens/closes; scroll lock still acquired.
- Every nav item lands on a 200 (stub is fine); none 404.
- `/admin/bank` and `/admin/automations` redirect rather than 404.
- `/admin/content-queue` and `/admin/ideation` still reachable.

---

## ADMIN-AUD-02 — Overview: split "today" checklist by audience

**Context.** Spec §2: Overview shows two checklist cards (Couples channels / Venues & Planners channels) instead of one flat list.

**Builds on:** ADMIN-AUD-00 (`audienceForPlatform`), `app/(admin)/admin/page.tsx`.

**0. Verify:**

- Today-list data source is `schedule_days.platforms` via `getScheduleWeeks` + `pickCurrentWeek` + `adminToday()`, iterating **`SCHEDULE_PLATFORM_COLS`** (not bank platforms). Row shape: `{ key, label, group }` + status `pending|done|off`.
- Current UI: one `Card` + `Eyebrow` `Today — {date}`, rows for status ≠ `off`.
- Do not change `adminToday()` timezone (America/Phoenix).

If the today-list is no longer that file, STOP.

**2. Data access.** No new query. Split `SCHEDULE_PLATFORM_COLS` (filtered to status ≠ `off`, same as today) into two arrays with `audienceForPlatform(c.key)` from AUD-00. Couples card = `'couples'`; planner card = `'planner'` (includes LinkedIn, Reddit, YouTube, **Outreach**).

**3. UI.** Two eyebrow cards stacked in the left column, matching the mockup:

- `Today — Couples channels`
- `Today — Venues & Planners channels`

Each reuses the same row markup already in `page.tsx` (label + Posted/Pending). Stat grid, latest performance, automations card: **unchanged** except the automations button href should now point at `/admin/couples/automations` (or stay `/admin/automations` which redirects). Optional: Eyebrow on each card can still include the date once in the page header, not duplicated — match the mockup ("Today — Couples channels") rather than the live "Today — {date}".

**Constraints.** Don't change what counts as done vs pending vs off — only grouping. Don't drop `outreach` (it belongs on the planner card). Don't re-query.

**Checkpoint.** Rows across the two cards sum to the same count as the old single list (9 platforms if none are `off`; fewer if some are `off`). No row lost, none duplicated. A platform with status `off` still does not appear, same as today.

---

## ADMIN-AUD-03 — Content bank split

**Context.** Spec §2: couples bank (TikTok/IG/FB/Pinterest) vs planner bank (LinkedIn real data / Reddit maintained list / YouTube maintained list).

**Builds on:** ADMIN-AUD-00, ADMIN-AUD-01 stubs at `/admin/couples/bank` and `/admin/planner/bank`.

**0. Verify:**

- Existing board: `components/admin/content-bank-board.tsx`. It currently maps **all** `CONTENT_PLATFORMS` plus an "All" chip. There is no `platforms` prop — you will add one rather than cloning the board.
- Query: `getContentBank` in `lib/admin/queries.ts` (select includes `idea`).
- Actions: `app/(admin)/admin/bank/actions.ts` — `revalidatePath("/admin/bank")`. After the split, also revalidate the new routes.
- `CONTENT_PLATFORMS` must already include `reddit` from AUD-00. If it doesn't, STOP — AUD-00 didn't land.
- Confirm you will **not** call a Reddit or YouTube API.

**3. UI.**

- Replace the AUD-01 stubs with real pages that reuse `ContentBankBoard`.
- Add a required `platforms: ContentPlatform[]` prop (and default the active tab to `platforms[0]`, **no "All" chip** on these split views — checkpoint is "exactly 4 tabs" / "exactly 3 sub-tabs").
- Couples page: `platforms` = couples bank list from `platform-audience.ts` (tiktok, instagram, facebook, pinterest). No LinkedIn, no Reddit, no YouTube.
- Planner page: linkedin, reddit, youtube.
- Server pages may still `getContentBank()` once and pass the full array; the board filters by `platforms` (and the form's `<select>` must only offer those platforms, not the full enum).
- Drop LinkedIn from the couples view entirely.
- Reddit tab: same create/edit/delete as any bank row. Form labels follow `CONTENT_PLATFORMS` meta (`bodyLabel` "Why it's relevant"; no Type A–D). Render `notes` as the subreddit badge if present (mockup shows `r/…` next to the title).
- YouTube tab: same board, maintained list, empty is fine (channel not live).
- Old `/admin/bank` remains a redirect to couples bank (from AUD-01).

**Constraints.** No live Reddit/YouTube API. Don't rewrite the board from scratch. Don't seed venue-partner-angle posts. Don't touch `content_queue`.

**Checkpoint.**

- Couples bank: exactly 4 tabs, no LinkedIn.
- Planner bank: exactly 3 tabs (LinkedIn / Reddit / YouTube).
- Inserting a Reddit row (via the planner Reddit tab) succeeds and appears only there, never on the couples page.
- Existing LinkedIn rows appear only on the planner page.
- Existing TikTok/IG/FB/Pin rows appear only on the couples page.

---

## ADMIN-AUD-04 — Content pillar pages *(gated on Open decision #2)*

**Do not start until Dom has picked (a), (b), or (c).** This slice is written for **(a)**. If (b): do not create `/admin/couples/pillars` or `/admin/planner/pillars`; add a collapsible static panel to the top of `/admin/ideation` instead, split by audience (two sub-views or two stacked sections), same copy as below.

**Context.** Spec §2 couples pillars (Budgeting / Timeline / Guests / Vendors / Real-wedding walkthroughs) and planner pillars (Inquiry response time / Lead follow-up cadence / Avoiding double-bookings / Venue-partner angle — flagged new, Open decision #4).

**Builds on:** ADMIN-AUD-01 stub routes.

**0. Verify:** Confirm the nav label Dom picked. Authoring default: **"Content pillars"**, routes `/admin/couples/pillars` and `/admin/planner/pillars`. Confirm `/admin/ideation` still exists and is the generate+rate page — do not rename or replace it. Confirm `components/ui/pill.tsx` exists for the "New" pill (`variant="sage"` is fine; mockup uses sage-wash).

**3. UI only, no schema.** Two static pages. Pillar name + bullet list, two-column grid (`repeat(2, 1fr)`, one column below 900px), last couples card (Real-wedding walkthroughs) spanning full width as in the mockup.

Copy **verbatim**:

**Couples** (`/admin/couples/pillars`):

- Page title: `Content pillars — Couples` (or "Ideation — Couples" only if Dom kept that word).
- Seasonal overlay **banner at the top**, schedule-chip style (mockup: sage dot + muted text, not a new banner component): `Seasonal overlay: Nov–Feb leans timeline/checklist (just-engaged); spring–summer leans mistakes & vendor-coordination`
- Budgeting: Hidden costs (cake-cutting fee, vendor meals, gratuities); Negotiating with vendors; Tracking actual vs. estimate
- Timeline: What to book when; Common last-minute scrambles; Least-flexible-vendor-first rule
- Guests: RSVP chasing scripts; Seating conflicts; Plus-one etiquette
- Vendors: Contract red flags; Communication cadence; Confirming details pre-wedding
- Real-wedding walkthroughs: Budget breakdown, category by category; Seating chart build; Day-of timeline

**Venues & planners** (`/admin/planner/pillars`):

- Page subtitle: `Pillar bank for LinkedIn, Reddit, and YouTube`
- Inquiry response time: Response-time vs. booking-rate benchmark; What to fix first if you're over 4 hours
- Lead follow-up cadence: Same-day acknowledgment; 48-hour follow-up; 2-week check-in
- Avoiding double-bookings: Shared vendor timelines; Catching conflicts before the client does
- Venue-partner angle: "Give your couples a better planning experience"; Venues inviting their own couples into the app — **plus a "New" `Pill` next to the name** (Open decision #4)

Cards: raised `--surface`, `--radius-card`, `--shadow-raised`. Type: Figtree. **No `font-serif`.** No generate button, no `<form>`, no `'use server'` writes, no fetch.

Hardcode the lists in a small `lib/admin/content-pillars.ts` (or colocated constants) so copy isn't duplicated across JSX. Do not read `CONTENT_PILLARS` from `lib/admin/content-queue/plan.ts` — that list includes "Planner/venue ops" and is the Friday queue allocator, a different feature. Do not wire the venue-partner bullets into that allocator.

**Constraints.** Static reference only. Don't seed bank rows from these pillars. Don't add an automation that generates from Venue-partner angle.

**Checkpoint.** Both pages render the lists verbatim. Venue-partner card is visually flagged New. No write path (no actions file, no API route, no insert). `/admin/ideation` still generates and rates `ideation_items`.

---

## ADMIN-AUD-05 — Media library *(gated on Open decision #1)*

**Do not write a new media UI until Step 0 against the running app.** Authoring scan: **this slice is a no-op** besides nav position, which ADMIN-AUD-01 already handled (top-level, not inside an audience group).

**0. Verify:**

- Open `/admin/media` logged in as admin. If it lists `media_assets` rows (or a real empty state with an upload control) and the nav item is not "Soon": **stop implementing. Report "no-op, already live."** Do not rebuild the page from the mockup's four hardcoded rows.
- If it is genuinely a disabled placeholder: then check `to_regclass('public.media_assets')` and `storage.buckets` for `admin-media`. If either is missing, STOP — that is bigger than a UI wiring gap (0104 on disk but not applied). If both exist, build the card list (name, subtitle/notes, upload date, thumbnail via signed URL) and reuse `createMediaUploadToken` / TUS in `components/admin/media-library.tsx` rather than re-implementing upload.

**Checkpoint.** `/admin/media` renders real `media_assets` rows (or a real empty+upload), not a Soon tag. Nav position is top-level/shared.

---

## ADMIN-AUD-06 — Image generator (couples-only, new)

**Context.** Spec §4. Same Content Engine principle as CONTENT-QUEUE-02: generate a **prompt packet**, never call an image API. Net-new page, net-new Anthropic call, no schema.

**Builds on:** ADMIN-AUD-01 stub `/admin/couples/image`. Anthropic posture of `/api/admin/automations/run` and ONB-07.

**0. Verify:**

- Automations "Run now" hits `POST /api/admin/automations/run`, which uses a **local** `callClaudeText` (raw Messages API), not `callClaudeJson`.
- Structured JSON: ONB-07 in `lib/generate-wedding-plan.ts` uses `output_config.format.type = "json_schema"`. `callClaudeJson` currently does **not** — it parses fenced JSON. For this packet, **use the ONB-07 `output_config.json_schema` pattern** (copy that request shape, or add an optional schema argument to `callClaudeJson` without breaking existing callers). Do not add `@anthropic-ai/sdk`. Key is `MODEL_API_KEY`, model is `ANTHROPIC_MODEL`.
- Gating: copy `checkIsAdmin()` + 404 `{ error: "Not found" }` from `app/api/admin/automations/run/route.ts` and `app/api/admin/ideation/generate/route.ts`. Layout gate is not enough.
- Couples-only. No planner equivalent.

**2. Data access / API:** `POST /api/admin/image-generator/run`

- Body: `{ concept: string, style: string }`.
- Returns JSON with exactly six string fields: `concept`, `styleReference`, `composition`, `colorsAndLighting`, `aspectRatio`, `negativePrompt`.
- Never calls KIE, Seedream, or any image-generation host. Only `api.anthropic.com`.
- 404 for non-admins. 400 if concept is empty.

**3. UI** (`app/(admin)/admin/couples/image/page.tsx` + a small client form):

- Title: `Image generator — Couples`
- Sub: mockup copy: `Builds a KIE / Seedream 5 Pro prompt packet — you still run it manually, this just writes the prompt`
- Concept textarea. Placeholder: `e.g. budget tracker screen, estimated vs. actual side by side, soft pink accent`
- Style `<select>` — **exact mockup option strings**:
  - `App UI screenshot / feature graphic`
  - `Lifestyle / editorial (couples)`
  - `Icon or simple graphic`
  - `Carousel background`
- Primary button: `Generate KIE prompt packet`
- Output box with the six labeled fields + a Copy button that copies the full packet as plain text (labeled lines, not raw JSON).
- Footer note (mockup): this only builds the prompt; it does not call the image API; credit spend stays visible.

**Behavior.** Anthropic returns structured JSON via json_schema, not free-text parsing. Prompt must forbid the word "AI" in the packet (mockup: say "automatically" if needed).

**Constraints.** Couples-only. Never wire a direct image-gen API from this route, now or later, without a separate decision. Don't reuse content-queue KIE code. Don't store packets in the DB in this slice.

**Checkpoint.** Submitting a concept fills six fields. Copy copies plain text. Network tab: Anthropic Messages API only — no KIE / image host. Non-admin POST → 404.

---

## ADMIN-AUD-07 — Venue outreach, Phase 1 (planner-only, static)

**Context.** Spec §5, Phase 1 only. Surfaces the Arizona venue-outreach pipeline as a static summary. No live Resend, no Google Sheet.

**Builds on:** ADMIN-AUD-01 stub `/admin/planner/outreach`.

**0. Verify:** Nothing in the DB. Confirm with Dom if the hardcoded numbers have moved off **596 targets / ~149 each of 4 variants**. If Dom gives new numbers, use those; if not, use 596 / ~149.

**3. UI** (`app/(admin)/admin/planner/outreach/page.tsx`), static:

- Title: `Venue outreach`
- Sub: `Arizona pilot — cold email via Resend, four variants assigned by row number`
- Four stat cards (raised `Card`, same vocabulary as Overview stats — Figtree, not a third display size):
  - Targets loaded → `596` / `Arizona pilot`
  - Emails sent → `—` / `wires to Resend`
  - Follow-ups due → `—` / `wires to Resend`
  - Replies → `—` / `Reply-To → Dom's Gmail`
- Variant table (V1 Pain-point / V2 Peer-credibility / V3 Ultra-short / V4 Curiosity, ~149 each).
- Footer note, mockup text: sent from Jordyn `<jordyn@inquiries.usefirstlook.app>`, Reply-To → Dom's personal Gmail; dedupe via Resend sent-history not sheet writes; **explicit "these stat cards are placeholders"** / real build will read live from Resend.
- **DMARC reminder** (spec §5; not in the mockup HTML — add it): a small muted line that `_dmarc.inquiries.usefirstlook.app` must be confirmed before outreach volume scales past the pilot. Text only, no DNS lookup.

**Constraints.** No Phase 2. No Resend API. No Google Sheet. No `useEffect` fetch on load. No `'use server'` actions.

**Checkpoint.** Page renders the four cards, variant table, sender/Reply-To note, and DMARC line. No network call on load beyond the document itself.

---

## ADMIN-AUD-08 — Automations split

**Context.** Spec §2: filter automations by audience; LinkedIn post draft should be a real Anthropic call (it already is in the live app). Add the two planner prompts the mockup shows that were never seeded.

**Builds on:** `admin_automation_prompts` / `admin_automation_runs` (0103), `platform-audience.ts`, ADMIN-AUD-01 routes `/admin/couples/automations` and `/admin/planner/automations`.

**0. Verify — STOP if this contradicts:**

- Table columns: **no audience/platform tag**. Filtering by `name` is fragile because `AutomationsBoard` lets you rename prompts. Add a nullable `audience_group` column rather than matching strings.
- Seeded prompts (0105): six names listed in the authoring-scan table. **Reddit comment draft** and **YouTube video idea batch` do not exist** — insert them here.
- Live vs mock: `POST /api/admin/automations/run` already calls Anthropic for every prompt. There is **no** mock-only flag. Do **not** invent a "Mockup only" disabled button unless Dom asks. LinkedIn is already live — do not "turn it on" by rewriting the run route.
- `is_manual_trigger` is not a live/mock bit (defaults true; unused as a mock switch).
- Do not touch `GET /api/cron/content-queue-generate` or CONTENT-QUEUE-02.

If prompts are somehow already tagged, filter on that column instead of adding a second one.

**1. Schema:** next-free after AUD-00. Authoring scan: **0109** (`0109_automation_audience_group.sql`) if 0108 was the Reddit CHECK. Re-grep.

```sql
alter table admin_automation_prompts
  add column if not exists audience_group text;
alter table admin_automation_prompts drop constraint if exists admin_automation_prompts_audience_group_check;
alter table admin_automation_prompts add constraint admin_automation_prompts_audience_group_check
  check (audience_group is null or audience_group in ('couples', 'planner'));
```

Backfill by **current seed names** (one-time UPDATE, not a name-matching filter in the UI going forward):

- couples: `New content-day batch`, `Turn a TikTok script into IG/FB`, `Pinterest pin variations`, `Fill next month's Schedule tab`
- planner: `LinkedIn post draft`, `Monthly performance read`

Insert the two missing planner prompts (ON CONFLICT do nothing if you add a unique name — there is **no** unique on `name` today, so insert only if not exists via `WHERE NOT EXISTS`):

- `Reddit comment draft` — template: genuine, advice-first reply to a specific thread in Jordyn's voice; 1-in-10 mention rule; no Type D / no hard promo; input will be the thread title + subreddit + what was asked. Audience: wedding-planning Reddit, not a couple-facing ad.
- `YouTube video idea batch` — 3–5 long-form + Shorts ideas, split across couples and planner audiences, for when the channel goes live. Never use the word "AI".

Set `audience_group = 'planner'` on both inserts.

**2. Data access.** `getAutomationPrompts` should select `audience_group`. Couples page passes `audience_group === 'couples'`; planner page `=== 'planner'`. Null-group prompts: show on neither split page (or report at Step 0 if any exist after backfill — leftover custom prompts Dom added by hand should be flagged, not silently dropped).

Revalidate both new paths from `app/(admin)/admin/automations/actions.ts`.

**3. UI.**

- Reuse `AutomationsBoard`; add an optional filter or pass pre-filtered `prompts`.
- Couples page: the 4 couples prompts. Keep a schedule-chip (mockup: sage dot + `Weekly batch normally runs Fridays, 9:00 AM`) — reuse the same chip treatment as AUD-04's seasonal banner, not a new component. This is the testing UI cadence note; it does **not** change the Friday cron.
- Planner page: the 4 planner prompts (2 existing + 2 new). LinkedIn "Run now" already hits Anthropic — leave the run route alone except that it must keep working from the new pages (`fetch("/api/admin/automations/run")` is path-absolute, so it should).
- Old `/admin/automations` remains a redirect to couples (AUD-01).

**Constraints.** Don't touch the Friday Cowork / CONTENT-QUEUE-02 cron. Don't add a Venue-partner-angle generator (Open decision #4). Don't widen `content_queue.platform`. Don't disable Run now to mimic the mockup.

**Checkpoint.**

- Couples page shows exactly the 4 couples prompts.
- Planner page shows exactly the 4 planner prompts (including the two new ones).
- Run now on LinkedIn post draft returns a real draft (Anthropic). Same for the pre-existing couples batch — status unchanged.
- Network: Anthropic only, still via `/api/admin/automations/run`.
- Cron route and `/admin/content-queue` untouched.

---

## Acceptance checklist

- Sidebar: Overview, Schedule, Performance, Media library, **Content queue**, **Ideation (generate+rate)** at top; then Couples (Content pillars, Content bank, Image generator, Automations); then Venues & Planners (Content pillars, Content bank, Venue outreach, Automations). Labels follow Open decision #2 if Dom picked something other than (a).
- Overview's today checklist is two cards; rows sum to the same platforms as before.
- Couples Content bank: exactly TikTok / Instagram / Facebook / Pinterest.
- Planner Content bank: LinkedIn / Reddit / YouTube — LinkedIn real data, Reddit/YouTube maintained lists, no live API.
- Image generator: copyable six-field packet via Anthropic; no image-gen host.
- Venue outreach: Phase 1 static Arizona summary only; placeholders labeled as such; DMARC line present.
- Automations split 4 + 4; LinkedIn Run now is a real Anthropic call (already was); no mock-only mode invented; Friday cron untouched.
- Schedule, Performance, Content queue **pages** unchanged except nav position / old-URL redirects.
- Open decisions #1–#5 were each resolved explicitly before their slice shipped — not defaulted to silently.
- No Cormorant on admin chrome. No `content_queue.platform` change. No stored `audience` column on `content_bank_items`.

---

## Out of scope (do not sneak into a slice)

- Mockup "New content" sidebar CTA
- Phase 2 Resend-backed outreach counts
- Google Sheet writes
- Live Reddit or YouTube APIs
- Auto-posting, KIE calls from the image generator
- Venue-partner-angle automation
- Changing CONTENT-QUEUE-02 cron, KIE webhook, or `/admin/content-queue` board
- Combining slices in one chat
