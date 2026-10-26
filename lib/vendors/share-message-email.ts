import "server-only";

import { sendEmailBestEffort } from "@/lib/email/send-best-effort";
import { vendorShareUrl } from "@/lib/vendors/share-url";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function snippet(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= 240) return trimmed;
  return `${trimmed.slice(0, 237)}...`;
}

export async function notifyVendorShareMessage(args: {
  to: string[];
  weddingName: string;
  fromName: string;
  body: string;
  shareToken: string;
  threadUrl?: string;
  replyTo?: string | null;
  logLabel: string;
}): Promise<boolean> {
  const unique = [...new Set(args.to.map((email) => email.trim()).filter(Boolean))];
  if (unique.length === 0) return false;

  const shareUrl = args.threadUrl ?? `${vendorShareUrl(args.shareToken)}#messages`;
  const preview = snippet(args.body);
  const subject = `New message about ${args.weddingName}`;
  const text = [
    `${args.fromName} wrote:`,
    "",
    preview,
    "",
    `Open the thread: ${shareUrl}`,
    "",
  ].join("\n");
  const html = [
    `<p>${escapeHtml(args.fromName)} wrote:</p>`,
    `<p>${escapeHtml(preview).replace(/\n/g, "<br />")}</p>`,
    `<p><a href="${escapeHtml(shareUrl)}">Open the thread</a></p>`,
  ].join("");

  return sendEmailBestEffort(
    {
      to: unique,
      subject,
      text,
      html,
      ...(args.replyTo ? { replyTo: args.replyTo } : {}),
    },
    args.logLabel,
  );
}
