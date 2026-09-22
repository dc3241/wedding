import "server-only";

import {
  dispatchLeadAutomation,
  type LeadAutomationEvent,
} from "@/lib/automations/run";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

type ProjectLeadTrigger = Extract<
  LeadAutomationEvent["triggerKind"],
  "invoice_sent" | "payment_link_set" | "invoice_marked_paid"
>;

/**
 * Resolve the CRM lead linked to a project (via leads.project_id) and fire
 * a lead automation. No-op when the project has no linked lead.
 */
export async function dispatchLeadAutomationForProject(opts: {
  projectId: string;
  triggerKind: ProjectLeadTrigger;
}): Promise<void> {
  try {
    const admin = createServiceRoleClient();
    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("account_id")
      .eq("id", opts.projectId)
      .maybeSingle();

    if (projectError) {
      throw new Error(projectError.message);
    }
    if (!project) return;

    const { data: lead, error: leadError } = await admin
      .from("leads")
      .select("id")
      .eq("project_id", opts.projectId)
      .eq("account_id", project.account_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (leadError) {
      throw new Error(leadError.message);
    }
    if (!lead) return;

    await dispatchLeadAutomation({
      accountId: project.account_id,
      leadId: lead.id,
      triggerKind: opts.triggerKind,
    });
  } catch (err) {
    console.error(
      "dispatchLeadAutomationForProject:",
      err instanceof Error ? err.message : err,
    );
  }
}
