/** RSVP-CHASE-01 — fixed template around the couple-approved message. */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildRsvpReminderEmail(input: {
  firstName: string | null;
  message: string;
  coupleNames: string;
  rsvpUrl: string;
}): { subject: string; text: string; html: string } {
  const greeting = input.firstName ? `Hi ${input.firstName},` : "Hi there,";
  const subject = `A quick RSVP reminder from ${input.coupleNames}`;
  const footer = `Sent through First Look on behalf of ${input.coupleNames}. Reply to this email to reach them.`;

  const text = [
    greeting,
    "",
    input.message,
    "",
    `RSVP here: ${input.rsvpUrl}`,
    "",
    `Thank you,`,
    input.coupleNames,
    "",
    footer,
  ].join("\n");

  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:16px;line-height:1.5;color:#2a2230;max-width:520px">
<p>${escapeHtml(greeting)}</p>
<p>${escapeHtml(input.message)}</p>
<p><a href="${escapeHtml(input.rsvpUrl)}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#7a3b5b;color:#fff;text-decoration:none;font-weight:600">RSVP now</a></p>
<p>Thank you,<br>${escapeHtml(input.coupleNames)}</p>
<p style="font-size:13px;color:#756b7d">${escapeHtml(footer)}</p>
</div>`;

  return { subject, text, html };
}
