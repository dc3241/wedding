import type { SupabaseClient } from "@supabase/supabase-js";
import type { DemoAccountKind, StartDemoResult } from "@/lib/demo/types";

function isDemoThrottled(message: string | undefined): boolean {
  return Boolean(message && message.includes("demo_throttled"));
}

/**
 * Shared demo start (DEMO-04 / DEMO-04b / DEMO-LINK-01):
 * anon mint → clone_demo_account. IP throttle lives only inside the RPC
 * (try_record_demo_start via PostgREST request.headers). Maps demo_throttled
 * from that exception — never surfaces raw Postgres errors.
 *
 * Caller supplies the Supabase client so the /demo route can attach
 * session cookies to its redirect.
 */
export async function performStartDemo(
  supabase: SupabaseClient,
  kind: DemoAccountKind,
): Promise<StartDemoResult> {
  if (kind !== "personal" && kind !== "business") {
    return { status: "error", message: "Something went wrong. Try again." };
  }

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
}
