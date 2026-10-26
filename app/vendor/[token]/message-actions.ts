"use server";

import { revalidatePath } from "next/cache";
import { getPublicVendorShare } from "@/lib/vendors/public-share";
import { notifyVendorShareMessage } from "@/lib/vendors/share-message-email";
import { VENDOR_SHARE_MESSAGE_MAX } from "@/lib/vendors/share-messages";
import { displayCoupleNames } from "@/lib/wedding-date";
import { appOrigin } from "@/lib/url";
import { createAnonServerClient } from "@/utils/supabase/anon-server";

export type SendVendorTokenMessageResult =
  | { ok: true }
  | { ok: false; error: string };

function mapPostError(code: string | null): string {
  if (code === "empty") return "Write a message first.";
  if (code === "too_long") {
    return `Keep the message under ${VENDOR_SHARE_MESSAGE_MAX} characters.`;
  }
  if (code === "throttled") {
    return "Wait a moment before sending another message.";
  }
  return "Could not send. Ask for a new link.";
}

export async function sendVendorTokenMessage(
  token: string,
  body: string,
): Promise<SendVendorTokenMessageResult> {
  const trimmedToken = token.trim();
  const trimmed = body.trim();
  if (!trimmedToken) return { ok: false, error: "Could not send. Ask for a new link." };
  if (!trimmed) return { ok: false, error: "Write a message first." };

  const supabase = createAnonServerClient();
  const { data, error } = await supabase.rpc("post_vendor_share_message", {
    p_token: trimmedToken,
    p_body: trimmed,
  });

  if (error) {
    if (!/could not find the function/i.test(error.message)) {
      console.error("post_vendor_share_message:", error.message);
    }
    return { ok: false, error: "Could not send. Ask for a new link." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.posted !== true) {
    return { ok: false, error: mapPostError(typeof row?.error_code === "string" ? row.error_code : null) };
  }

  const share = await getPublicVendorShare(trimmedToken);
  if (share) {
    const to = share.contacts
      .map((contact) => contact.email?.trim() ?? "")
      .filter(Boolean);
    const projectId =
      typeof row.project_id === "string" ? row.project_id : null;
    const vendorId = typeof row.vendor_id === "string" ? row.vendor_id : null;
    const threadUrl =
      projectId && vendorId
        ? `${appOrigin()}/projects/${projectId}/vendors/${vendorId}#messages`
        : undefined;
    await notifyVendorShareMessage({
      to,
      weddingName: displayCoupleNames(share.wedding_name),
      fromName: share.vendor_name,
      body: trimmed,
      shareToken: trimmedToken,
      threadUrl,
      logLabel: "sendVendorTokenMessage",
    });
  }

  revalidatePath(`/vendor/${encodeURIComponent(trimmedToken)}`);
  return { ok: true };
}
