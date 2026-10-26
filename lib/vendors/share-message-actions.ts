"use server";

import { revalidatePath } from "next/cache";
import { notifyVendorShareMessage } from "@/lib/vendors/share-message-email";
import { VENDOR_SHARE_MESSAGE_MAX } from "@/lib/vendors/share-messages";
import { displayCoupleNames } from "@/lib/wedding-date";
import { createClient } from "@/utils/supabase/server";

export type SendVendorShareMessageResult =
  | { ok: true }
  | { ok: false; error: string };

function vendorsPath(projectId: string) {
  return `/projects/${projectId}/vendors`;
}

/** Owner / invited editor → vendor thread. RLS enforces can_edit_project. */
export async function sendOwnerVendorShareMessage(
  projectVendorId: string,
  body: string,
): Promise<SendVendorShareMessageResult> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Write a message first." };
  if (trimmed.length > VENDOR_SHARE_MESSAGE_MAX) {
    return {
      ok: false,
      error: `Keep the message under ${VENDOR_SHARE_MESSAGE_MAX} characters.`,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be logged in." };

  const { data: row, error: loadError } = await supabase
    .from("project_vendors")
    .select("id, project_id, vendor_id, confirm_token, vendors(name, contact_email)")
    .eq("id", projectVendorId)
    .maybeSingle();

  if (loadError || !row) {
    return { ok: false, error: "Vendor not found on this project." };
  }

  const { error: insertError } = await supabase.from("vendor_share_messages").insert({
    project_vendor_id: projectVendorId,
    project_id: row.project_id,
    author: "owner",
    body: trimmed,
    created_by: user.id,
  });

  if (insertError) {
    return { ok: false, error: "Could not send this message." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", row.project_id)
    .maybeSingle();

  const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
  const vendorEmail = vendor?.contact_email?.trim() || null;
  const weddingName = displayCoupleNames(project?.name ?? "a wedding");
  const fromName = user.email?.trim() || weddingName;

  if (vendorEmail) {
    await notifyVendorShareMessage({
      to: [vendorEmail],
      weddingName,
      fromName,
      body: trimmed,
      shareToken: row.confirm_token,
      replyTo: user.email,
      logLabel: "sendOwnerVendorShareMessage",
    });
  }

  revalidatePath(vendorsPath(row.project_id));
  if (row.vendor_id) {
    revalidatePath(`${vendorsPath(row.project_id)}/${row.vendor_id}`);
  }
  return { ok: true };
}

export async function markVendorShareOwnerRead(
  projectVendorId: string,
): Promise<void> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("project_vendors")
    .select("project_id")
    .eq("id", projectVendorId)
    .maybeSingle();
  if (!row) return;

  await supabase
    .from("project_vendors")
    .update({ share_owner_last_read_at: new Date().toISOString() })
    .eq("id", projectVendorId);

  revalidatePath(vendorsPath(row.project_id));
}
