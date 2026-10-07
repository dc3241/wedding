"use server";

import { headers } from "next/headers";
import { startProposalCheckout } from "@/lib/connect/checkout";
import { stripeErrorMessage } from "@/lib/connect/accounts";

export async function startPublicProposalCheckout(
  token: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "http://localhost:3000";
  try {
    return await startProposalCheckout({ token, origin });
  } catch (err) {
    return { ok: false, error: stripeErrorMessage(err) };
  }
}
