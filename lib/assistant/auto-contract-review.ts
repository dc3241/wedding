import "server-only";

import { getAccountContext } from "@/lib/account-context";
import { runAssistantWithTools } from "@/lib/assistant/call-assistant";
import {
  getAccountAssistantAccess,
  recordAssistantUsage,
} from "@/lib/billing/assistant-access";
import { parseEventType, parseHiddenTools } from "@/lib/event-type";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

/**
 * CONTRACT-AUTO-01 — right after a contract upload, run the ordinary
 * assistant loop with ONE allowed write: propose_contract_terms. It reads the
 * file, and if the contract states payments, deadlines, or an arrival time it
 * queues a contract_terms proposal in Pending (AGENTIC-08 verifies every term
 * against a verbatim quote). Nothing is applied until the user approves.
 *
 * Runs inside after() from the upload action, with the uploader's session.
 * Silent on every failure: the upload itself already succeeded.
 */
export async function autoProposeContractTerms(
  projectId: string,
  file: { id: string; name: string },
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, wedding_date, event_type, hidden_tools, account_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return;

  // One proposal per file: skip if this contract already has one pending.
  const { data: existing } = await supabase
    .from("assistant_proposals")
    .select("id")
    .eq("project_id", projectId)
    .eq("kind", "contract_terms")
    .eq("status", "pending")
    .filter("payload->>fileId", "eq", file.id)
    .limit(1);
  if (existing && existing.length > 0) return;

  // Billed to the owning account; never starts a trial on its own.
  const access = await getAccountAssistantAccess(
    createServiceRoleClient(),
    project.account_id as string,
  );
  if (!access.allowed) return;

  const account = await getAccountContext(supabase);
  const name = file.name.replace(/["\n\r]/g, "").trim() || "the contract";

  const result = await runAssistantWithTools(
    supabase,
    projectId,
    [],
    `A contract was just uploaded: "${name}" (file id ${file.id}). Read it with get_file. ` +
      `If it states payment amounts with due dates, deadlines, or a vendor arrival time, ` +
      `call propose_contract_terms once with exactly those terms, each with its verbatim quote. ` +
      `If it states none of these, call nothing and reply "nothing to propose".`,
    {
      projectName: project.name as string,
      weddingDate: project.wedding_date as string | null,
      accountKind: account?.kind ?? "personal",
      eventType: parseEventType(project.event_type),
      hiddenTools: parseHiddenTools(project.hidden_tools),
    },
    {
      allowedWriteTools: ["propose_contract_terms"],
      includeFileReads: true,
    },
  );

  await recordAssistantUsage({
    accountId: access.accountId,
    projectId,
    source: "chat",
    usage: result.usage,
  });
}
