function encodeMimeHeader(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  const encoded = Buffer.from(value, "utf8").toString("base64");
  return `=?UTF-8?B?${encoded}?=`;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildRfc2822Message(
  fromEmail: string,
  toEmail: string,
  subject: string,
  body: string
): string {
  const normalizedBody = body.replace(/\r?\n/g, "\r\n");

  return [
    `From: ${fromEmail}`,
    `To: ${toEmail}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    normalizedBody,
  ].join("\r\n");
}

export async function sendGmailMessage(
  accessToken: string,
  fromEmail: string,
  toEmail: string,
  subject: string,
  body: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const raw = buildRfc2822Message(fromEmail, toEmail, subject, body);
  const encoded = base64UrlEncode(raw);

  try {
    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encoded }),
      }
    );

    if (response.ok) {
      return { ok: true };
    }

    let message = `Gmail API error (${response.status}).`;
    try {
      const data = (await response.json()) as {
        error?: { message?: string };
      };
      if (data.error?.message) message = data.error.message;
    } catch {
      // use default message
    }

    return { ok: false, error: message };
  } catch {
    return { ok: false, error: "Could not reach Gmail to send the message." };
  }
}
