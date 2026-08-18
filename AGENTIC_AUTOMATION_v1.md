# Agentic Automation Subsystem — Architecture v1

Companion to `PROJECT_BIBLE_v39.md`. Same posture as the Launch Prep Runbook — a **separate
document**, not a fork of the bible. Read this before writing any slice prompt for AGENT-01,
AGENT-02, AGENT-03, or AUTO-03.

This is a **design pass, not a build order**. No schema in this document is final; every table
sketched below still needs its own Step 0 recon at slice time, same discipline as every other
migration in this codebase. Confirm next-free against `supabase/migrations/` at Step 0 — do not
take a number from this file.

The bible remains canonical for current product/schema state. This file is canonical for *how*
trigger-based assistant invocation should work. Do not restate this architecture in the bible.

---

## 1. What this is

**Trigger-based invocations of the existing assistant tool-use loop** (`lib/assistant/`), as
opposed to keystroke-triggered chat. This is not a new agent. It is the same reasoning engine,
the same tool definitions, the same RLS-protected write boundary — with a new entry point that
isn't a person typing.

**This is distinct from AUTO-01 (Payment Schedule Watch) and AUTO-02 (Countdown Confirmations).**
Those are fixed-cadence, rule-based, template-driven reminders — date math in, a fixed email out,
zero LLM reasoning involved. They stay exactly as designed. This document does not touch them.

**Four automations are in scope for v1:**

| ID | Name | One-line |
|---|---|---|
| AGENT-01 | Prioritized weekly synthesis | Assistant reads across a project, writes a short "here's what actually matters" email to the account owner |
| AGENT-02 | Downstream-implication noticing | Assistant catches patterns a rule never would (a decline orphaning a seated plus-one, a special-meal household regretting) and leaves an in-app note |
| AGENT-03 | Vendor-outreach gap drafting | Wedding inside N weeks, category still open → assistant drafts outreach, human approves and sends |
| AUTO-03 | Inquiry capture → extract → draft → approve | Inbound inquiry (Resend webhook or public form) → structured lead → drafted reply → human approves and sends |

AUTO-03 kept its name from the conversation that spec'd it, despite the prefix mismatch with
AGENT-01/02/03 — not worth renaming something already agreed. All four live under this one
architecture regardless of prefix.

**Shipped on disk:** AGENT-00, AGENT-01, AGENT-01a, AGENT-02, AGENT-03 (`create_agent_draft`, weekly
`outreach_scan`, Pending-panel approve/reject). AUTO-03a (capture: `submit_inquiry` + Resend inbound
webhook). AUTO-03b (extract / compose / approve — 10-minute `inquiry` cron, clay badge on the Leads
kanban). AUTO-03b is CON-04-style single-shot JSON generation, not the project tool loop — there is
no project to reason across yet. AUTO-03 is complete.

---

## 2. Core principle

**Rule-based automation answers "did X happen." Agentic automation answers "what does X mean."**
Everything in this doc exists because the second question is the thing an LLM can do that a
no-code trigger catalog (Brea, Zapier) structurally cannot — synthesis, prioritization, drafting
something specific to the actual situation instead of filling a template. If a feature could be
done correctly with an `if/then` and a mail-merge field, it belongs in the AUTO-01/02 pattern, not
here. Don't build agentic infrastructure for something a rule already solves.

---

## 3. Trigger mechanism (fiat decision)

**Scan-based (cron) for AGENT-01, AGENT-02, and AGENT-03.** A daily or weekly Vercel Cron →
Route Handler run per active project, same shape as AUTO-01/02's dispatcher, computing "what
changed / what's true as of today" and reasoning over it.

**Webhook-based for AUTO-03 only** — Resend Inbound's `email.received` event, plus a public form
POST. This is the one genuinely external arrival in the set; everything else is an internal state
scan.

**No new Postgres-level event mechanism in v1.** No `pg_net`, no Supabase Database Webhooks, no
real-time DB-change triggers. A daily scan is the right cadence for a wedding-planning tool —
nobody expects instant reaction to an RSVP decline — and real-time DB-event infrastructure is a
genuinely new architectural concept this codebase doesn't have anywhere today. Revisit only if a
scan-based lag becomes an actual complaint, not preemptively.

---

## 4. Autonomy tiers — the propose-vs-approve line

This is the single most important decision in this document. State it once, apply it uniformly,
don't relitigate it per-feature.

| Tier | Automations | Destination | Approval required? |
|---|---|---|---|
| **Autonomous, send-to-self** | AGENT-01 | The account owner's own inbox | No — same posture as AUTO-01/02. Reaching the user who owns the data isn't a third-party risk. |
| **Autonomous, in-app write** | AGENT-02 | A note, visible in-app, dismissible | No — reuses `add_note` (optional `action_status`; AGENT-02 always passes `needs_action`). Visible and reversible; never leaves the app. |
| **Propose-then-approve** | AGENT-03, AUTO-03 | A vendor / a prospective client — a real third party | **Yes, always.** A human clicks send. No exceptions in v1. |

The line is **"does this reach someone who isn't the account holder."** A bad synthesis email
only wastes the planner's own time. A bad autonomous send to a stranger is a lost booking and a
bad first impression, sent by a bot, with the planner's name on it. Those are not the same risk
tier and should never be treated as if they are.

---

## 5. Reuse discipline

- Same `READ_TOOL_DEFINITIONS`, same existing write-tool set, same `MAX_TOOL_ITERATIONS = 8` cap,
  same no-delete-tools rule, same RLS-protected action layer that governs chat today. **Do not
  fork a second tool-definition set for automated runs.** The only new things are the entry point
  (event vs. keystroke) and a system-prompt variant written for unattended review instead of
  conversational back-and-forth.
- **One genuinely new write tool: `create_agent_draft`.** This is the entire write-surface
  addition this subsystem needs. It populates the `agent_drafts` table (§7) — it never calls a
  Gmail-send path directly. The LLM composes; the human's approval click is the only path from a
  draft to an actual send. This mirrors the existing canonical-write-tool audit discipline
  (§9 of the bible) — when this ships, that audit needs a line added for it, same as any other new
  write tool.
- Cap-hit-with-writes / cap-hit-no-writes semantics carry over unchanged: a run that hits 8
  iterations with committed writes (drafts created, notes added) still reports what it did; a run
  that hits the cap with nothing committed persists nothing.

---

## 6. Dispatcher architecture

Separate Vercel Cron → Route Handler from AUTO-01/02's dispatcher — different cost and failure
profile (LLM calls with real latency and real token spend, vs. plain SQL). Do not fold agentic
runs into the AUTO-01/02 route.

**Reasoning runs per PROJECT, not per account.** This is a deliberate simplification, stated
explicitly rather than glossed over: the existing tool loop's read/write boundary is
project-scoped (`can_access_project` / `can_edit_project`), and extending it to reason across a
planner's entire book in one call would mean either a new cross-project tool surface or a second
loop architecture — real scope, not appropriate for the slice that's introducing scheduled
invocation for the first time. So: one loop invocation per active project, using the existing
tools exactly as they exist today, zero new read/write scope.

**Batching happens at the send layer, not the reasoning layer.** A planner with five active
projects gets five independent per-project reasoning passes, then one digest email per account
concatenating the five outputs (one short paragraph per wedding) — "your book" framing is
satisfied at send time, not by teaching the assistant to reason across projects. True
cross-project prioritization (the assistant deciding *which* wedding is the real fire this week,
not just reporting on each independently) is a real v2 idea, explicitly deferred — don't build it
into this slice.

---

## 7. New schema (sketch — confirm exact shape at Step 0, per usual discipline)

- **`agent_run_log`** — one row per triggered loop invocation: `id`, `project_id`, `trigger_kind`
  (CHECK: `synthesis` | `implication_scan` | `outreach_scan` | `inquiry`), `started_at`,
  `completed_at`, `outcome` (CHECK: `ok` | `capped` | `error`), `summary` text. Service-role
  written and read only — no user-facing RLS policy needed in v1, same posture as
  `demo_start_attempts`. **Every run writes a row, including failed and capped ones** — see §8.

- **`agent_drafts`** — the propose-then-approve queue: `id`, `account_id`, `project_id` nullable
  (null for AUTO-03 inquiry drafts, which predate any project existing), `kind` (CHECK:
  `vendor_outreach` | `inquiry_reply`), a target reference (vendor id or lead id, matching
  whichever this draft concerns), `subject`, `body`, `status` (CHECK: `pending` | `approved` |
  `rejected` | `sent`), `created_at`, `reviewed_at`, `reviewed_by`. RLS: authenticated,
  `is_account_member`-gated (project-scoped drafts may also need `can_access_project` — confirm at
  build time which is the right split, matching the existing split-policy pattern rather than
  inventing a third shape).

- **Partial unique index on `agent_drafts`: at most one `pending` draft per
  `(account_id, kind, target)`.** A scan re-running tomorrow must not create a second open draft
  for the same vendor gap or the same inquiry — it either finds the existing pending draft and
  leaves it, or (if the underlying facts materially changed) updates it in place. Same dedup
  discipline as AUTO-01/02's reminder logs — name it structurally where the index can express it,
  same as `payment_reminder_log`'s partial unique index.

- **A stable public identifier resolving an inbound address / form submission to an account** for
  AUTO-03 (e.g. `accounts.inquiry_slug`) — account-scoped, matching the existing rule that leads
  and other pre-project CRM entities are account-scoped, not project-scoped. **This is new
  anon-adjacent surface area** — confirm at build time whether it needs a formal bump to the
  bible's public-surfaces ledger (§4 of the bible), same discipline already applied when AUTO-02
  added its confirm-token surface.

---

## 8. Audit trail — non-negotiable

Every trigger fire, every tool call, every outcome gets logged to `agent_run_log`. This is not
decoration. **An agent acting without a human in the loop and no record of what it did is the
actual reputational risk in this whole subsystem — bigger than any single bad draft.** A failed or
capped run that writes nothing to the log is worse than a failed run in chat, because in chat a
person is watching and notices immediately; here, nobody is. If per-tool-call granularity turns
out to matter (which tool, which args, which result) beyond the run-level summary, that's a child
table (`agent_tool_call_log`) — Cursor's call at build time whether run-level summary is
sufficient for v1 or the finer grain is needed from day one.

---

## 9. Multi-tenant consistency

No forking by account kind — same rule that governs the rest of this codebase. AGENT-01/02/03 run
identically for personal and business accounts; the underlying conditions (an implication worth
flagging, a vendor gap worth drafting for) are simply absent for accounts where they don't apply,
not special-cased in code. AUTO-03 is planner/venue-only by nature of what an inquiry *is* —
couples don't receive inquiries — and that falls out from the data (no `inquiry_slug` traffic for
a personal account), not from an `account.kind` branch anywhere in this subsystem's logic.

---

## 10. Cost controls

- Reuse the chat assistant's existing discipline verbatim: static-prefix prompt caching, windowed
  history, compacted read-tool payloads, state from live reads.
- Cost scales with **active projects × automations enabled**, not accounts — see §6's per-project
  reasoning decision. Know this number before turning on more than one automation at once.
- **Turn AGENT-01 on alone first and get real token-cost numbers before committing to AGENT-02 and
  AGENT-03.** Don't size the eventual four-automation cost off estimates — size it off what
  AGENT-01 actually costs in production for a week, then decide.

---

## 11. Explicitly deferred (not in v1)

- Real-time DB-event triggers (`pg_net`, Database Webhooks) — scan-based cadence is enough here;
  revisit only on real evidence it isn't.
- Cross-project prioritization within a single reasoning pass (§6) — v2 idea, not v1.
- A pricing-guide artifact and booking-link/consultation scheduling for AUTO-03 — both are their
  own feature builds, not automation on top of existing data; don't let them gate shipping the
  capture→extract→draft→approve core.
- Full auto-send for anything reaching a third party — no exceptions, see §4.
- Per-user notification frequency/preferences.
- Budget-drift reasoning — declined this round, not pursuing.

---

## 12. Build order (recommendation)

1. **Foundation slice** — `agent_run_log` + `agent_drafts` schema, the dispatcher scaffold, and a
   review-inbox UI stub (even empty at first, so AGENT-03/AUTO-03 have somewhere to land drafts
   later). Nothing reasons yet; this just proves the plumbing.
2. **AGENT-01 (synthesis)** — lowest risk (send-to-self, no third party, no new write tool). Proves
   the "LLM inside a cron job" pattern end to end and produces the real cost numbers §10 depends
   on before committing further.
3. **AGENT-02 (implication-noticing)** — still in-app only, still no third-party exposure.
4. **AGENT-03 (vendor-outreach drafting)** — first propose-then-approve automation; exercises
   `agent_drafts` and the review-inbox UI for real.
5. **AUTO-03 (inquiry capture)** — depends on Resend Inbound infrastructure and the public form
   existing separately; different trigger mechanism from the other three; build last since it's
   the most product-surface-heavy of the four.

---

## 13. Drift watchlist (additions specific to this subsystem)

- Do not let an automated run call any write tool the chat assistant doesn't already have, except
  `create_agent_draft`.
- Do not let `create_agent_draft` call a send path directly — only the human's approve action may
  trigger an actual send.
- Do not fork a second tool-definition set for automated vs. chat entry points — one set, two
  entry points.
- Do not add a DB-level event/trigger mechanism in v1 (§3) — stay scan-based until there's a real
  reason not to.
- Do not run automated reasoning per-account — it runs per-project (§6); batching is a send-layer
  concern only.
- Do not skip the `agent_run_log` write on any run, including failed or capped ones (§8).
- Do not let a re-run create a second `pending` draft for the same target — the partial unique
  index (§7) is the backstop, but the scan logic should check first, not rely on the constraint to
  fail loudly.
- Do not treat AGENT-01/02's autonomy as precedent for AGENT-03/AUTO-03 — the send-to-self /
  in-app-only tier is not a stepping stone to auto-send; §4's line is permanent for v1, not a
  temporary caution.
