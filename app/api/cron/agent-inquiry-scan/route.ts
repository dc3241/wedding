/**
 * AUTO-03b — Inquiry extraction + reply composition.
 * Frequent scan. Propose-then-approve only — never sends from cron.
 * Direct LLM calls (CON-04 pattern), not the project tool loop.
 */
import { NextResponse } from "next/server";
import { createAgentDraft } from "@/lib/assistant/create-agent-draft";
import {
  mintUnattendedWriteSession,
  resolveUnattendedActorUserId,
} from "@/lib/assistant/unattended-write-session";
import { cronAuthorized, unauthorizedCronResponse } from "@/lib/cron/authorize";
import {
  loadDateConflictProjectName,
  loadEligibleInquiryLeads,
  type InquiryLeadRow,
} from "@/lib/cron/inquiry-leads";
import { composeInquiryReply } from "@/lib/inquiry/compose";
import { extractInquiryFacts } from "@/lib/inquiry/extract";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TRIGGER_KIND = "inquiry" as const;
const LEADS_PER_RUN = 8;

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function planFromAccount(plan: string | null | undefined): "planner" | "venue" {
  return plan === "venue" ? "venue" : "planner";
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  if (!process.env.MODEL_API_KEY) {
    return NextResponse.json(
      { error: "MODEL_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const filterLeadId = new URL(request.url).searchParams.get("leadId")?.trim();
  const supabase = createServiceRoleClient();

  try {
    const eligible = (await loadEligibleInquiryLeads(supabase, filterLeadId)).slice(
      0,
      filterLeadId ? 1 : LEADS_PER_RUN,
    );

    if (filterLeadId && eligible.length === 0) {
      return NextResponse.json(
        { error: "Lead not found or already has an open draft." },
        { status: 404 },
      );
    }

    const errors: string[] = [];
    let draftsCreated = 0;
    let nothingFound = 0;
    let extracted = 0;
    let errorCount = 0;

    for (const lead of eligible) {
      const account = asOne(lead.accounts);
      const startedAt = new Date().toISOString();
      let outcome: "ok" | "error" = "ok";
      let summary = "nothing found";
      let actedAsUserId: string | null = null;
      let working: InquiryLeadRow = lead;

      try {
        if (!account) {
          throw new Error("Account missing on lead.");
        }

        const userId = await resolveUnattendedActorUserId(
          lead.account_id,
          supabase,
        );

        if (lead.source === "email_inbound") {
          const facts = await extractInquiryFacts({
            coupleName: lead.couple_name,
            notes: lead.notes,
          });
          if (lead.notes?.trim() && facts === null) {
            throw new Error("Extraction returned nothing.");
          }
          if (facts && (facts.wedding_date || facts.guest_count != null)) {
            const fields: Record<string, string | number> = {
              updated_at: new Date().toISOString(),
            };
            if (facts.wedding_date) fields.wedding_date = facts.wedding_date;
            if (facts.guest_count != null) {
              fields.estimated_guest_count = facts.guest_count;
            }

            const session = await mintUnattendedWriteSession(userId);
            const { error: updateError } = await session.client
              .from("leads")
              .update(fields)
              .eq("id", lead.id);
            if (updateError) throw new Error(updateError.message);

            actedAsUserId = userId;
            extracted += 1;
            working = {
              ...lead,
              wedding_date: facts.wedding_date ?? lead.wedding_date,
              estimated_guest_count:
                facts.guest_count ?? lead.estimated_guest_count,
            };
          }
        }

        if (!working.contact_email?.trim()) {
          summary = "nothing found";
          nothingFound += 1;
        } else {
          const conflictName = await loadDateConflictProjectName(
            supabase,
            lead.account_id,
            working.wedding_date,
          );
          const composed = await composeInquiryReply({
            accountName: account.name,
            brandName: account.brand_name,
            accountKind: account.kind === "business" ? "business" : "personal",
            plan: planFromAccount(account.plan),
            coupleName: working.couple_name,
            contactEmail: working.contact_email,
            weddingDate: working.wedding_date,
            guestCount: working.estimated_guest_count,
            notes: working.notes,
            dateConflictProjectName: conflictName,
          });

          if (!composed) {
            throw new Error("Composition returned nothing.");
          }

          if (!composed.genuine) {
            summary = "nothing found";
            nothingFound += 1;
          } else {
            const session = await mintUnattendedWriteSession(userId);
            const written = await createAgentDraft(
              null,
              {
                kind: "inquiry_reply",
                targetId: lead.id,
                subject: composed.subject,
                body: composed.body,
              },
              session.client,
            );
            if (!written.ok) {
              throw new Error(written.error);
            }
            actedAsUserId = userId;
            draftsCreated += 1;
            summary = "drafted inquiry reply";
          }
        }
      } catch (err) {
        outcome = "error";
        summary = err instanceof Error ? err.message : "inquiry scan failed";
        errorCount += 1;
        errors.push(`lead ${lead.id}: ${summary}`);
      }

      const { error: logError } = await supabase.from("agent_run_log").insert({
        project_id: null,
        account_id: lead.account_id,
        lead_id: lead.id,
        trigger_kind: TRIGGER_KIND,
        outcome,
        summary,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        acted_as_user_id: actedAsUserId,
      });
      if (logError) {
        errors.push(`lead ${lead.id}: log insert ${logError.message}`);
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      leadsProcessed: eligible.length,
      draftsCreated,
      extracted,
      nothingFound,
      errorCount,
      errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed.";
    console.error("agent-inquiry-scan:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
