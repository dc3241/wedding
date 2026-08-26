import "server-only";

import { sendEmail, type SendEmailInput } from "@/lib/email/send";

/**
 * Best-effort Resend send for post-commit invitation delivery.
 * Never throws — callers treat DB write as source of truth.
 */
export async function sendEmailBestEffort(
  input: SendEmailInput,
  logLabel: string,
): Promise<boolean> {
  try {
    const sent = await sendEmail(input);
    if (sent.ok) return true;
    console.error(`${logLabel}: email send failed:`, sent.error);
    return false;
  } catch (err) {
    console.error(`${logLabel}: email send failed:`, err);
    return false;
  }
}
