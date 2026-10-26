"use server";

import { revalidatePath } from "next/cache";
import { getAccountContext } from "@/lib/account-context";
import { sendEmailBestEffort } from "@/lib/email/send-best-effort";
import { canShareProjectVendors } from "@/lib/vendors/can-share";
import { vendorShareUrl } from "@/lib/vendors/share-url";
import { displayCoupleNames } from "@/lib/wedding-date";
import { createClient } from "@/utils/supabase/server";

export type ShareProjectVendorResult =
  | { ok: true; url: string; emailSent: boolean; emailedTo: string | null }
  | { ok: false; error: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildShareEmail(args: {
  shareUrl: string;
  weddingName: string;
  vendorName: string;
}): { subject: string; text: string; html: string } {
  const subject = `Details for ${args.weddingName}`;
  const text = [
    `Hi ${args.vendorName},`,
    "",
    `Here are the wedding details for ${args.weddingName} — the date, venues, day-of timeline, and your payment dates.`,
    "",
    args.shareUrl,
    "",
    "This link does not expire.",
    "",
  ].join("\n");
  const html = [
    `<p>Hi ${escapeHtml(args.vendorName)},</p>`,
    `<p>Here are the wedding details for ${escapeHtml(args.weddingName)} — the date, venues, day-of timeline, and your payment dates.</p>`,
    `<p><a href="${escapeHtml(args.shareUrl)}">Open the wedding details</a></p>`,
    `<p>This link does not expire.</p>`,
  ].join("");
  return { subject, text, html };
}

function vendorsPath(projectId: string) {
  return `/projects/${projectId}/vendors`;
}

/**
 * Email the standing share link to the vendor. Owner-account only.
 * Copy-link works without this; this is the send + stamp.
 */
export async function shareProjectVendorDetails(
  projectVendorId: string,
): Promise<ShareProjectVendorResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be logged in." };
  }

  const { data: row, error: loadError } = await supabase
    .from("project_vendors")
    .select("id, project_id, vendor_id, confirm_token, vendors(name, contact_email)")
    .eq("id", projectVendorId)
    .maybeSingle();

  if (loadError || !row) {
    return { ok: false, error: "Vendor not found on this project." };
  }

  const account = await getAccountContext(supabase);
  if (!canShareProjectVendors(account, row.project_id)) {
    return { ok: false, error: "You cannot share vendor details on this project." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", row.project_id)
    .maybeSingle();

  const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
  const vendorName = vendor?.name?.trim() || "there";
  const weddingName = displayCoupleNames(project?.name ?? "a wedding");
  const shareUrl = vendorShareUrl(row.confirm_token);
  const emailedTo = vendor?.contact_email?.trim() || null;

  let emailSent = false;
  if (emailedTo) {
    const body = buildShareEmail({ shareUrl, weddingName, vendorName });
    emailSent = await sendEmailBestEffort(
      {
        to: emailedTo,
        subject: body.subject,
        text: body.text,
        html: body.html,
        ...(user.email ? { replyTo: user.email } : {}),
      },
      "shareProjectVendorDetails",
    );

    if (emailSent) {
      const { error: stampError } = await supabase
        .from("project_vendors")
        .update({
          share_sent_at: new Date().toISOString(),
          share_sent_email: emailedTo,
        })
        .eq("id", projectVendorId);
      if (stampError) {
        console.error("shareProjectVendorDetails stamp:", stampError.message);
      }
    }
  }

  revalidatePath(vendorsPath(row.project_id));
  if (row.vendor_id) {
    revalidatePath(`${vendorsPath(row.project_id)}/${row.vendor_id}`);
  }

  return { ok: true, url: shareUrl, emailSent, emailedTo };
}
