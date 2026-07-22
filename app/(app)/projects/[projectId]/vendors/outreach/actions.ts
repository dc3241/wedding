"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  generateOutreachDraft,
  type OutreachBrief,
} from "@/lib/generate-outreach-draft";
import {
  sendAllOutreachDrafts as sendAllOutreachDraftsInternal,
  sendOutreachMessage,
} from "@/lib/send-outreach";
import { createClient } from "@/utils/supabase/server";

function vendorsPath(projectId: string) {
  return `/projects/${projectId}/vendors`;
}

function outreachPath(projectId: string) {
  return `/projects/${projectId}/vendors/outreach`;
}

export async function draftOutreach(
  projectId: string,
  projectVendorIds: string[],
  brief: OutreachBrief
): Promise<{ ok: false; error: string } | never> {
  const uniqueIds = [...new Set(projectVendorIds)].filter(Boolean);

  if (uniqueIds.length === 0) {
    return { ok: false, error: "Select at least one vendor to contact." };
  }

  if (!brief.askingFor.trim()) {
    return { ok: false, error: "Describe what you're asking the vendors for." };
  }

  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("name, wedding_date")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return { ok: false, error: "Project not found." };
  }

  const { data: rows, error: rowsError } = await supabase
    .from("project_vendors")
    .select("id, status, vendors(name, category, ai_overview)")
    .eq("project_id", projectId)
    .in("id", uniqueIds);

  if (rowsError) {
    return { ok: false, error: rowsError.message };
  }

  const eligible = (rows ?? []).filter((row) => row.status === "to_contact");

  if (eligible.length !== uniqueIds.length) {
    return {
      ok: false,
      error: "Only vendors with status “To contact” can be drafted.",
    };
  }

  const weddingDate = project.wedding_date
    ? new Date(project.wedding_date + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  let created = 0;

  for (const row of eligible) {
    const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
    if (!vendor) continue;

    const draft = await generateOutreachDraft(
      {
        name: vendor.name,
        category: vendor.category,
        aiOverview: vendor.ai_overview,
      },
      {
        projectName: project.name,
        weddingDate,
      },
      brief
    );

    if (!draft) {
      return {
        ok: false,
        error: `Could not generate a draft for ${vendor.name}. Try again.`,
      };
    }

    const { error: insertError } = await supabase.from("outreach_messages").insert({
      project_vendor_id: row.id,
      direction: "outbound",
      channel: "email",
      subject: draft.subject,
      body: draft.body,
      status: "draft",
    });

    if (insertError) {
      return { ok: false, error: insertError.message };
    }

    created += 1;
  }

  if (created === 0) {
    return { ok: false, error: "No drafts were created." };
  }

  revalidatePath(vendorsPath(projectId));
  revalidatePath(outreachPath(projectId));
  redirect(outreachPath(projectId));
}

export async function updateOutreachDraft(
  messageId: string,
  subject: string,
  body: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();

  if (!trimmedSubject) {
    return { ok: false, error: "Subject is required." };
  }

  if (!trimmedBody) {
    return { ok: false, error: "Body is required." };
  }

  const supabase = await createClient();

  const { data: existing, error: loadError } = await supabase
    .from("outreach_messages")
    .select("id, status, project_vendor_id")
    .eq("id", messageId)
    .maybeSingle();

  if (loadError || !existing) {
    return { ok: false, error: "Draft not found." };
  }

  if (existing.status !== "draft" && existing.status !== "failed") {
    return { ok: false, error: "Only draft or failed messages can be edited." };
  }

  const { data: link, error: linkError } = await supabase
    .from("project_vendors")
    .select("project_id")
    .eq("id", existing.project_vendor_id)
    .single();

  if (linkError || !link) {
    return { ok: false, error: "Draft not found." };
  }

  const { error: updateError } = await supabase
    .from("outreach_messages")
    .update({
      subject: trimmedSubject,
      body: trimmedBody,
      status: "draft",
      send_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .in("status", ["draft", "failed"]);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidatePath(outreachPath(link.project_id));
  revalidatePath(vendorsPath(link.project_id));

  return { ok: true };
}

async function revalidateOutreachForMessage(messageId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("outreach_messages")
    .select("project_vendor_id")
    .eq("id", messageId)
    .maybeSingle();

  if (!data) return;

  const { data: link } = await supabase
    .from("project_vendors")
    .select("project_id")
    .eq("id", data.project_vendor_id)
    .single();

  if (!link) return;

  revalidatePath(outreachPath(link.project_id));
  revalidatePath(vendorsPath(link.project_id));
}

export async function sendOutreach(
  messageId: string
): Promise<
  { ok: true } | { ok: false; error: string; needsConnect?: boolean }
> {
  const result = await sendOutreachMessage(messageId);
  await revalidateOutreachForMessage(messageId);
  return result;
}

export async function sendAllOutreachDrafts(
  projectId: string
): Promise<
  | { ok: true; sent: number; failures: { messageId: string; error: string }[] }
  | { ok: false; error: string; needsConnect?: boolean }
> {
  const result = await sendAllOutreachDraftsInternal(projectId);

  if (result.ok) {
    revalidatePath(outreachPath(projectId));
    revalidatePath(vendorsPath(projectId));
  }

  return result;
}
