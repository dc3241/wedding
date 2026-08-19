"use server";

import { revalidatePath } from "next/cache";
import { isLeadEmailDraftKind } from "@/components/assistant/types";
import { sendOutreachMessage } from "@/lib/send-outreach";
import { createClient } from "@/utils/supabase/server";

export type DraftActionResult =
  | { ok: true }
  | { ok: false; error: string; needsConnect?: boolean };

type DraftRow = {
  id: string;
  account_id: string;
  project_id: string | null;
  kind: string;
  target_id: string;
  subject: string | null;
  body: string | null;
  status: string;
};

async function loadDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  draftId: string,
): Promise<{ ok: true; draft: DraftRow } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("agent_drafts")
    .select(
      "id, account_id, project_id, kind, target_id, subject, body, status",
    )
    .eq("id", draftId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Draft not found." };
  return { ok: true, draft: data as DraftRow };
}

function revalidateDraftSurfaces(draft: DraftRow) {
  if (isLeadEmailDraftKind(draft.kind)) {
    revalidatePath("/leads");
    revalidatePath(`/leads/${draft.target_id}`);
    return;
  }
  if (!draft.project_id) return;
  revalidatePath(`/projects/${draft.project_id}`, "layout");
  revalidatePath(`/projects/${draft.project_id}/vendors`);
  revalidatePath(`/projects/${draft.project_id}/vendors/outreach`);
}

export async function approveAgentDraft(
  draftId: string,
): Promise<DraftActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be logged in." };
  }

  const loaded = await loadDraft(supabase, draftId);
  if (!loaded.ok) return loaded;
  const draft = loaded.draft;

  if (draft.kind !== "vendor_outreach" && !isLeadEmailDraftKind(draft.kind)) {
    return { ok: false, error: "This draft cannot be sent from here yet." };
  }
  if (draft.status !== "pending" && draft.status !== "approved") {
    return { ok: false, error: "This draft is no longer waiting to send." };
  }

  const subject = draft.subject?.trim();
  const body = draft.body?.trim();
  if (!subject || !body) {
    return { ok: false, error: "Draft is missing a subject or body." };
  }

  if (draft.kind === "vendor_outreach" && !draft.project_id) {
    return { ok: false, error: "Draft is not linked to a wedding." };
  }

  if (draft.status === "pending") {
    const { error: approveError } = await supabase
      .from("agent_drafts")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", draft.id)
      .eq("status", "pending");

    if (approveError) {
      return { ok: false, error: approveError.message };
    }
  }

  let outreachInsert: {
    project_vendor_id: string | null;
    lead_id: string | null;
    direction: string;
    channel: string;
    subject: string;
    body: string;
    status: string;
  };

  if (isLeadEmailDraftKind(draft.kind)) {
    outreachInsert = {
      lead_id: draft.target_id,
      project_vendor_id: null,
      direction: "outbound",
      channel: "email",
      subject,
      body,
      status: "draft",
    };
  } else {
    const { data: link, error: linkError } = await supabase
      .from("project_vendors")
      .select("id")
      .eq("project_id", draft.project_id)
      .eq("vendor_id", draft.target_id)
      .maybeSingle();

    if (linkError) {
      return { ok: false, error: linkError.message };
    }
    if (!link) {
      return { ok: false, error: "Vendor is not tracked on this wedding." };
    }

    outreachInsert = {
      project_vendor_id: link.id,
      lead_id: null,
      direction: "outbound",
      channel: "email",
      subject,
      body,
      status: "draft",
    };
  }

  const { data: message, error: insertError } = await supabase
    .from("outreach_messages")
    .insert(outreachInsert)
    .select("id")
    .single();

  if (insertError || !message) {
    revalidateDraftSurfaces(draft);
    return {
      ok: false,
      error: insertError?.message ?? "Could not create the outreach message.",
    };
  }

  const sent = await sendOutreachMessage(message.id);
  if (!sent.ok) {
    revalidateDraftSurfaces(draft);
    return sent;
  }

  const { error: sentError } = await supabase
    .from("agent_drafts")
    .update({
      status: "sent",
      outreach_message_id: message.id,
    })
    .eq("id", draft.id);

  if (sentError) {
    revalidateDraftSurfaces(draft);
    return {
      ok: false,
      error:
        "Email was sent but the draft record could not be updated. Check Gmail Sent.",
    };
  }

  revalidateDraftSurfaces(draft);
  return { ok: true };
}

export async function rejectAgentDraft(
  draftId: string,
): Promise<DraftActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be logged in." };
  }

  const loaded = await loadDraft(supabase, draftId);
  if (!loaded.ok) return loaded;
  const draft = loaded.draft;

  if (draft.status !== "pending" && draft.status !== "approved") {
    return { ok: false, error: "This draft is no longer waiting for review." };
  }

  const { error } = await supabase
    .from("agent_drafts")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", draft.id)
    .in("status", ["pending", "approved"]);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateDraftSurfaces(draft);
  return { ok: true };
}
