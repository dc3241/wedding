"use server";

import type { DemoAccountKind, StartDemoResult } from "@/lib/demo/types";
import { performStartDemo } from "@/lib/demo/perform-start-demo";
import { createClient } from "@/utils/supabase/server";

/**
 * Server-brokered demo entry (DEMO-04 / DEMO-04b):
 * anon mint → clone_demo_account. See performStartDemo for the write path.
 */
export async function startDemoAction(
  kind: DemoAccountKind,
): Promise<StartDemoResult> {
  try {
    const supabase = await createClient();
    return await performStartDemo(supabase, kind);
  } catch {
    return { status: "error", message: "Something went wrong. Try again." };
  }
}
