import "server-only";

import { Resend } from "resend";

const FROM_ADDRESS = "First Look <hello@usefirstlook.app>";

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("Missing RESEND_API_KEY.");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/** Minimal Resend send. No templating — callers pass the finished body. */
export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const { data, error } = await getResend().emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data?.id) {
    return { ok: false, error: "Resend send returned no id." };
  }
  return { ok: true, id: data.id };
}
