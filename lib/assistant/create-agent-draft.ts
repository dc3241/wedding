import "server-only";

import { clientForWrite } from "@/utils/supabase/for-write";
import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AgentDraftKind =
  | "vendor_outreach"
  | "inquiry_reply"
  | "workflow_email";

export type CreateAgentDraftResult =
  | { ok: true; draft_id: string }
  | { ok: false; error: string };

export type CreateAgentDraftInput = {
  targetId: string;
  subject: string;
  body: string;
  kind?: AgentDraftKind;
};

function isLeadDraftKind(
  kind: AgentDraftKind,
): kind is "inquiry_reply" | "workflow_email" {
  return kind === "inquiry_reply" || kind === "workflow_email";
}

/**
 * Insert an agent_drafts row. target_id has no FK — validation is the backstop.
 * vendor_outreach: target is vendors.id, must be tracked on projectId.
 * inquiry_reply / workflow_email: target is leads.id, project_id stays null.
 * Never sends.
 */
export async function createAgentDraft(
  projectId: string | null,
  input: CreateAgentDraftInput,
  client?: SupabaseClient,
): Promise<CreateAgentDraftResult> {
  const kind: AgentDraftKind = input.kind ?? "vendor_outreach";
  const targetId = input.targetId.trim();
  const subject = input.subject.trim();
  const body = input.body.trim();

  if (!UUID_RE.test(targetId)) {
    return {
      ok: false,
      error: isLeadDraftKind(kind)
        ? "target_id must be a lead UUID."
        : "target_id must be a vendor UUID.",
    };
  }
  if (!subject) {
    return { ok: false, error: "subject is required." };
  }
  if (!body) {
    return { ok: false, error: "body is required." };
  }

  if (isLeadDraftKind(kind)) {
    return insertLeadDraft(kind, targetId, subject, body, client);
  }

  if (!projectId) {
    return { ok: false, error: "Project is required for vendor outreach." };
  }
  return insertVendorOutreach(projectId, targetId, subject, body, client);
}

async function insertLeadDraft(
  kind: "inquiry_reply" | "workflow_email",
  leadId: string,
  subject: string,
  body: string,
  client?: SupabaseClient,
): Promise<CreateAgentDraftResult> {
  const supabase = await clientForWrite(client);

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, account_id")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) {
    return { ok: false, error: leadError.message };
  }
  if (!lead) {
    return { ok: false, error: "Lead not found on this account." };
  }

  return insertDraft(supabase, {
    accountId: lead.account_id,
    projectId: null,
    kind,
    targetId: leadId,
    subject,
    body,
    duplicateMessage:
      kind === "workflow_email"
        ? "A pending draft already exists for this lead."
        : "A draft already exists for this inquiry.",
  });
}

async function insertVendorOutreach(
  projectId: string,
  targetId: string,
  subject: string,
  body: string,
  client?: SupabaseClient,
): Promise<CreateAgentDraftResult> {
  const supabase = await clientForWrite(client);

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, account_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    return { ok: false, error: projectError.message };
  }
  if (!project) {
    return { ok: false, error: "Project not found." };
  }

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("id, account_id")
    .eq("id", targetId)
    .maybeSingle();

  if (vendorError) {
    return { ok: false, error: vendorError.message };
  }
  if (!vendor || vendor.account_id !== project.account_id) {
    return {
      ok: false,
      error: "Vendor not found on this account.",
    };
  }

  const { data: link, error: linkError } = await supabase
    .from("project_vendors")
    .select("id")
    .eq("project_id", projectId)
    .eq("vendor_id", targetId)
    .maybeSingle();

  if (linkError) {
    return { ok: false, error: linkError.message };
  }
  if (!link) {
    return {
      ok: false,
      error: "Vendor is not tracked on this wedding.",
    };
  }

  return insertDraft(supabase, {
    accountId: project.account_id,
    projectId,
    kind: "vendor_outreach",
    targetId,
    subject,
    body,
    duplicateMessage: "A pending draft already exists for this vendor.",
  });
}

async function insertDraft(
  supabase: SupabaseClient,
  args: {
    accountId: string;
    projectId: string | null;
    kind: AgentDraftKind;
    targetId: string;
    subject: string;
    body: string;
    duplicateMessage: string;
  },
): Promise<CreateAgentDraftResult> {
  const { data: existingOpen, error: openError } = await supabase
    .from("agent_drafts")
    .select("id, status")
    .eq("account_id", args.accountId)
    .eq("kind", args.kind)
    .eq("target_id", args.targetId)
    .in("status", ["pending", "approved"])
    .limit(1)
    .maybeSingle();

  if (openError) {
    return { ok: false, error: openError.message };
  }
  if (existingOpen) {
    return { ok: false, error: args.duplicateMessage };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("agent_drafts")
    .insert({
      account_id: args.accountId,
      project_id: args.projectId,
      kind: args.kind,
      target_id: args.targetId,
      subject: args.subject,
      body: args.body,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: false, error: args.duplicateMessage };
    }
    return { ok: false, error: insertError.message };
  }

  return { ok: true, draft_id: inserted.id };
}
