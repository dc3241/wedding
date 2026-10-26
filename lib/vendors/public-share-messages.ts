import "server-only";

import {
  parseVendorShareMessages,
  type VendorShareMessage,
} from "@/lib/vendors/share-messages";
import { createAnonServerClient } from "@/utils/supabase/anon-server";

export async function listPublicVendorShareMessages(
  token: string,
): Promise<VendorShareMessage[] | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const supabase = createAnonServerClient();
  const { data, error } = await supabase.rpc("list_vendor_share_messages", {
    p_token: trimmed,
  });

  if (error) {
    if (!/could not find the function/i.test(error.message)) {
      console.error("list_vendor_share_messages:", error.message);
    }
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.thread_found !== true) return null;
  return parseVendorShareMessages(row.messages);
}
