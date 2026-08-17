import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

/** Cookie session unless a caller injected an unattended write client. */
export async function clientForWrite(
  injected?: SupabaseClient,
): Promise<SupabaseClient> {
  return injected ?? (await createClient());
}
