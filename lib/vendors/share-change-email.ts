import { vendorShareUrl } from "@/lib/vendors/share-url";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildVendorShareChangeEmail(args: {
  vendorName: string;
  weddingName: string;
  shareToken: string;
}): { subject: string; text: string; html: string } {
  const shareUrl = `${vendorShareUrl(args.shareToken)}`;
  const subject = `Updated details for ${args.weddingName}`;
  const text = [
    `Hi ${args.vendorName},`,
    "",
    `${args.weddingName} updated details you can see — date, venues, day-of timeline, or your payments.`,
    "",
    `Open the current details: ${shareUrl}`,
    "",
  ].join("\n");
  const html = [
    `<p>Hi ${escapeHtml(args.vendorName)},</p>`,
    `<p>${escapeHtml(args.weddingName)} updated details you can see — date, venues, day-of timeline, or your payments.</p>`,
    `<p><a href="${escapeHtml(shareUrl)}">Open the current details</a></p>`,
  ].join("");
  return { subject, text, html };
}
