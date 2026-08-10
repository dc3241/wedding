"use server";

import type { DemoAccountKind, StartDemoResult } from "@/lib/demo/types";
import { createClient } from "@/utils/supabase/server";

function isDemoThrottled(message: string | undefined): boolean {
  return Boolean(message && message.includes("demo_throttled"));
}

/**
 * Server-brokered demo entry (DEMO-04 / DEMO-04b):
 * anon mint → clone_demo_account. IP throttle lives only inside the RPC
 * (try_record_demo_start via PostgREST request.headers). Maps demo_throttled
 * from that exception — never surfaces raw Postgres errors.
 */
export async function startDemoAction(
  kind: DemoAccountKind,
): Promise<StartDemoResult> {
  if (kind !== "personal" && kind !== "business") {
    return { status: "error", message: "Something went wrong. Try again." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Real logged-in user: never mint anonymous, never call clone RPC.
    if (user && user.is_anonymous !== true) {
      return { status: "existing" };
    }

    // No session → anonymous auth. Mid-demo anonymous session → reuse it.
    if (!user) {
      const { error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) {
        return { status: "error", message: "Something went wrong. Try again." };
      }
    }

    const { data, error } = await supabase.rpc("clone_demo_account", {
      p_kind: kind,
    });

    if (error) {
      const message = error.message ?? "";
      if (isDemoThrottled(message)) {
        return { status: "throttled" };
      }
      if (message.includes("demo_template_missing")) {
        return { status: "unavailable" };
      }
      return { status: "error", message: "Something went wrong. Try again." };
    }

    if (typeof data !== "string" || !data) {
      return { status: "error", message: "Something went wrong. Try again." };
    }

    return { status: "ok", accountId: data };
  } catch {
    return { status: "error", message: "Something went wrong. Try again." };
  }
}
