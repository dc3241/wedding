import "server-only";

import { usageCostMicros, type TokenUsage } from "@/lib/assistant/model-pricing";
import { ANTHROPIC_MODEL } from "@/lib/anthropic-model";
import {
  ASSISTANT_CAP_MICROS,
  ASSISTANT_TRIAL_DAYS,
  type AssistantAccessSummary,
  type AssistantLockReason,
  type AssistantPlan,
} from "@/lib/billing/assistant-budget";
import { getSubscriptionForAccount } from "@/lib/billing/get-subscription";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

/**
 * COUPLES-PIVOT part 3: who may use the assistant + agentic runs.
 *
 * - Couples (personal accounts) use every planning tool free. The assistant
 *   needs a 7-day trial (started by their first message) or a paid
 *   Monthly / Lifetime plan, and stays under a spend cap.
 * - Business accounts keep their existing rule: entitled planner/venue
 *   subscription = assistant on, uncapped (unchanged by the pivot).
 * - Demo accounts get the assistant with the trial-size cap.
 *
 * Access is billed to the account that OWNS the project, so an invited
 * member rides on the owner's plan. All reads use the service-role client:
 * an invited member cannot read the owner's subscriptions row under RLS,
 * and the account id is always derived server-side from the project.
 */

type Admin = ReturnType<typeof createServiceRoleClient>;

export type AssistantUsageSource =
  | "chat"
  | "synthesis"
  | "implication_scan"
  | "outreach_scan";

export type AccountAssistantAccess = {
  accountId: string;
  kind: "personal" | "business";
  allowed: boolean;
  plan: AssistantPlan | null;
  lockReason: AssistantLockReason | null;
  usedMicros: number | null;
  capMicros: number | null;
  trialEndsAt: string | null;
  resetsAt: string | null;
};

function startOfUtcMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function startOfNextUtcMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

const EPOCH = "1970-01-01T00:00:00Z";

/**
 * Sum of metered cost since `sinceIso`. Fails OPEN (returns 0) if the
 * ledger is unreachable — e.g. the migration is not pasted yet — so a
 * metering outage never takes the assistant down; it logs loudly instead.
 */
async function usageSince(
  admin: Admin,
  accountId: string,
  sinceIso: string,
): Promise<number> {
  const { data, error } = await admin.rpc("assistant_usage_total", {
    p_account_id: accountId,
    p_since: sinceIso,
  });
  if (error) {
    console.error("[assistant.usage] total failed (failing open)", error.message);
    return 0;
  }
  return Number(data ?? 0);
}

function locked(
  base: Pick<AccountAssistantAccess, "accountId" | "kind">,
  lockReason: AssistantLockReason,
  extra: Partial<AccountAssistantAccess> = {},
): AccountAssistantAccess {
  return {
    ...base,
    allowed: false,
    plan: null,
    lockReason,
    usedMicros: null,
    capMicros: null,
    trialEndsAt: null,
    resetsAt: null,
    ...extra,
  };
}

/** Access for one account. Never starts a trial (see ensureChatAccess). */
export async function getAccountAssistantAccess(
  admin: Admin,
  accountId: string,
): Promise<AccountAssistantAccess> {
  const now = new Date();
  const { data: account, error: accountError } = await admin
    .from("accounts")
    .select("id, kind, is_demo")
    .eq("id", accountId)
    .maybeSingle();

  if (accountError || !account) {
    throw new Error(accountError?.message ?? "Account not found.");
  }

  const kind: "personal" | "business" =
    account.kind === "business" ? "business" : "personal";
  const base = { accountId, kind };

  if (account.is_demo) {
    const used = await usageSince(admin, accountId, EPOCH);
    const cap = ASSISTANT_CAP_MICROS.trialTotal;
    return {
      ...base,
      allowed: used < cap,
      plan: "demo",
      lockReason: used < cap ? null : "limit_reached",
      usedMicros: used,
      capMicros: cap,
      trialEndsAt: null,
      resetsAt: null,
    };
  }

  if (kind === "business") {
    const subscription = await getSubscriptionForAccount(admin, accountId);
    return subscription.isActive
      ? {
          ...base,
          allowed: true,
          plan: "business",
          lockReason: null,
          usedMicros: null,
          capMicros: null,
          trialEndsAt: null,
          resetsAt: null,
        }
      : locked(base, "upgrade_required");
  }

  const { data: row, error } = await admin
    .from("subscriptions")
    .select("status, current_period_end, stripe_subscription_id")
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  // TRIAL-GUARD-01: a null-status row is Checkout debris, not a plan.
  if (!row || row.status === null) {
    return locked(base, "trial_available");
  }

  const periodEnd = row.current_period_end
    ? new Date(row.current_period_end)
    : null;

  if (row.status === "trialing") {
    if (!periodEnd || periodEnd <= now) {
      return locked(base, "upgrade_required");
    }
    const trialStart = new Date(periodEnd);
    trialStart.setUTCDate(trialStart.getUTCDate() - ASSISTANT_TRIAL_DAYS);
    const used = await usageSince(admin, accountId, trialStart.toISOString());
    const cap = ASSISTANT_CAP_MICROS.trialTotal;
    return {
      ...base,
      allowed: used < cap,
      plan: "trial",
      lockReason: used < cap ? null : "limit_reached",
      usedMicros: used,
      capMicros: cap,
      trialEndsAt: periodEnd.toISOString(),
      resetsAt: null,
    };
  }

  if (row.status !== "active") {
    return locked(base, "upgrade_required");
  }

  const monthStart = startOfUtcMonth(now).toISOString();
  const resetsAt = startOfNextUtcMonth(now).toISOString();

  // PRICE-08: Lifetime is an active row with no Stripe Subscription id.
  if (!row.stripe_subscription_id) {
    const [monthUsed, totalUsed] = await Promise.all([
      usageSince(admin, accountId, monthStart),
      usageSince(admin, accountId, EPOCH),
    ]);
    const monthCap = ASSISTANT_CAP_MICROS.lifetimeMonthly;
    const totalCap = ASSISTANT_CAP_MICROS.lifetimeTotal;
    const allowed = monthUsed < monthCap && totalUsed < totalCap;
    // Report whichever allowance is closer to running out.
    const monthRatio = monthUsed / monthCap;
    const totalRatio = totalUsed / totalCap;
    const byTotal = totalRatio > monthRatio;
    return {
      ...base,
      allowed,
      plan: "lifetime",
      lockReason: allowed ? null : "limit_reached",
      usedMicros: byTotal ? totalUsed : monthUsed,
      capMicros: byTotal ? totalCap : monthCap,
      trialEndsAt: null,
      resetsAt: byTotal ? null : resetsAt,
    };
  }

  const used = await usageSince(admin, accountId, monthStart);
  const cap = ASSISTANT_CAP_MICROS.monthly;
  return {
    ...base,
    allowed: used < cap,
    plan: "monthly",
    lockReason: used < cap ? null : "limit_reached",
    usedMicros: used,
    capMicros: cap,
    trialEndsAt: null,
    resetsAt,
  };
}

/**
 * PRICE-07 shape (local trial, no Stripe objects) without the redirect.
 * Only converts a missing row or a null-status Checkout stub — never
 * overwrites a real subscription row.
 */
async function startAssistantTrial(admin: Admin, accountId: string) {
  const periodEnd = new Date();
  periodEnd.setUTCDate(periodEnd.getUTCDate() + ASSISTANT_TRIAL_DAYS);
  const fields = {
    status: "trialing",
    current_period_end: periodEnd.toISOString(),
    stripe_subscription_id: null,
    price_id: null,
    quantity: 1,
    cancel_at_period_end: false,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await admin
    .from("subscriptions")
    .select("account_id, status")
    .eq("account_id", accountId)
    .maybeSingle();

  if (existing && existing.status !== null) return;

  if (existing) {
    await admin
      .from("subscriptions")
      .update(fields)
      .eq("account_id", accountId)
      .is("status", null);
    return;
  }

  // A concurrent first message may win the insert; either way one trial row
  // exists afterwards, so the error is safe to ignore.
  const { error } = await admin
    .from("subscriptions")
    .insert({ account_id: accountId, stripe_customer_id: null, ...fields });
  if (error) {
    console.info("[assistant.trial] insert skipped:", error.message);
  }
}

export async function resolveProjectAccountId(
  admin: Admin,
  projectId: string,
): Promise<string> {
  const { data, error } = await admin
    .from("projects")
    .select("account_id")
    .eq("id", projectId)
    .maybeSingle();
  if (error || !data) {
    throw new Error(error?.message ?? "Project not found.");
  }
  return data.account_id;
}

export function toAccessSummary(
  access: AccountAssistantAccess,
  canUpgrade: boolean,
): AssistantAccessSummary {
  const usedPercent =
    access.usedMicros !== null && access.capMicros
      ? Math.min(100, Math.round((access.usedMicros / access.capMicros) * 100))
      : null;
  return {
    allowed: access.allowed,
    plan: access.plan,
    lockReason: access.lockReason,
    usedPercent,
    trialEndsAt: access.trialEndsAt,
    resetsAt: access.resetsAt,
    canUpgrade,
  };
}

/**
 * Chat gate. The caller must already have verified the viewer can see the
 * project (RLS read). A couple's first message starts their 7-day trial.
 */
export async function ensureChatAccess(
  projectId: string,
  viewerAccountId: string | null,
): Promise<{ access: AccountAssistantAccess; summary: AssistantAccessSummary }> {
  const admin = createServiceRoleClient();
  const ownerAccountId = await resolveProjectAccountId(admin, projectId);
  let access = await getAccountAssistantAccess(admin, ownerAccountId);

  if (access.lockReason === "trial_available" && access.kind === "personal") {
    await startAssistantTrial(admin, ownerAccountId);
    access = await getAccountAssistantAccess(admin, ownerAccountId);
  }

  return {
    access,
    summary: toAccessSummary(access, viewerAccountId === ownerAccountId),
  };
}

/** Read-only status for the panel (does not start a trial). */
export async function getProjectAssistantSummary(
  projectId: string,
  viewerAccountId: string | null,
): Promise<AssistantAccessSummary | null> {
  try {
    const admin = createServiceRoleClient();
    const ownerAccountId = await resolveProjectAccountId(admin, projectId);
    const access = await getAccountAssistantAccess(admin, ownerAccountId);
    return toAccessSummary(access, viewerAccountId === ownerAccountId);
  } catch (error) {
    console.error("[assistant.access] summary failed", error);
    return null;
  }
}

/** Write one ledger row. Never throws — metering must not fail a reply. */
export async function recordAssistantUsage(input: {
  accountId: string;
  projectId: string | null;
  source: AssistantUsageSource;
  usage: TokenUsage;
}): Promise<void> {
  const { usage } = input;
  const total =
    usage.inputTokens +
    usage.outputTokens +
    usage.cacheCreationInputTokens +
    usage.cacheReadInputTokens;
  if (total === 0) return;

  try {
    const admin = createServiceRoleClient();
    const { error } = await admin.from("assistant_usage").insert({
      account_id: input.accountId,
      project_id: input.projectId,
      source: input.source,
      model: ANTHROPIC_MODEL,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cache_creation_input_tokens: usage.cacheCreationInputTokens,
      cache_read_input_tokens: usage.cacheReadInputTokens,
      cost_micros: usageCostMicros(ANTHROPIC_MODEL, usage),
    });
    if (error) {
      console.error("[assistant.usage] insert failed", error.message);
    }
  } catch (error) {
    console.error("[assistant.usage] insert failed", error);
  }
}

/**
 * Agent crons (AGENT-01/02/03): keep only projects whose owning account may
 * run agentic work right now. Never starts a trial — a couple who never
 * opened the assistant gets no automated runs.
 */
export async function filterProjectsWithAgentAccess<
  T extends { account_id: string },
>(admin: Admin, projects: T[]): Promise<T[]> {
  const allowedByAccount = new Map<string, boolean>();
  for (const accountId of new Set(projects.map((p) => p.account_id))) {
    try {
      const access = await getAccountAssistantAccess(admin, accountId);
      allowedByAccount.set(accountId, access.allowed);
    } catch (error) {
      console.error(`[assistant.access] ${accountId}`, error);
      allowedByAccount.set(accountId, false);
    }
  }
  return projects.filter((p) => allowedByAccount.get(p.account_id) === true);
}
