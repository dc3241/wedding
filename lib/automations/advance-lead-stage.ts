import "server-only";

import { LEAD_STAGES, type LeadStage } from "@/components/leads/types";
import { dispatchLeadAutomation } from "@/lib/automations/run";
import type { SupabaseClient } from "@supabase/supabase-js";

const TERMINAL_STAGES = new Set<LeadStage>(["booked", "lost"]);

function isLeadStage(value: string): value is LeadStage {
  return (LEAD_STAGES as readonly string[]).includes(value);
}

/**
 * Move a lead to toStage when eligible, then fire lead_stage_changed.
 * Never throws — used from proposal/invoice side-effects.
 */
export async function advanceLeadStageIfEligible(
  client: SupabaseClient,
  opts: {
    leadId: string;
    accountId: string;
    toStage: LeadStage;
    /** When set, only advance from these stages. */
    fromStages?: readonly LeadStage[];
  },
): Promise<boolean> {
  try {
    const { data: lead, error: loadError } = await client
      .from("leads")
      .select("id, stage, account_id")
      .eq("id", opts.leadId)
      .maybeSingle();

    if (loadError) {
      console.error("advanceLeadStageIfEligible:", loadError.message);
      return false;
    }
    if (!lead || lead.account_id !== opts.accountId) return false;
    if (!isLeadStage(lead.stage)) return false;
    if (lead.stage === opts.toStage) return false;
    if (TERMINAL_STAGES.has(lead.stage)) return false;
    if (opts.fromStages && !opts.fromStages.includes(lead.stage)) return false;

    const { error } = await client
      .from("leads")
      .update({
        stage: opts.toStage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", opts.leadId);

    if (error) {
      console.error("advanceLeadStageIfEligible:", error.message);
      return false;
    }

    await dispatchLeadAutomation({
      accountId: opts.accountId,
      leadId: opts.leadId,
      triggerKind: "lead_stage_changed",
      fromStage: lead.stage,
      toStage: opts.toStage,
    });
    return true;
  } catch (err) {
    console.error(
      "advanceLeadStageIfEligible:",
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}
