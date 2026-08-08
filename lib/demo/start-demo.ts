import { createClient } from "@/utils/supabase/client";

export type DemoAccountKind = "personal" | "business";

export type StartDemoResult =
  | { status: "ok"; accountId: string }
  /** Real (non-anonymous) session — RPC skipped; redirected to /projects. */
  | { status: "existing" }
  /** No is_demo_template account for this kind yet. */
  | { status: "unavailable" }
  | { status: "error"; message: string };

/** In-flight guard — one click ⇒ one anonymous mint / one RPC. */
let pending: Promise<StartDemoResult> | null = null;

function goToProjects() {
  window.location.assign("/projects");
}

/**
 * Entry point for demo visitors (DEMO-02). DEMO-03 wires UI to this.
 * Navigates to /projects on success or when a real session already exists.
 * Returns a typed result for unavailable / error (no throw).
 */
export function startDemo(kind: DemoAccountKind): Promise<StartDemoResult> {
  if (pending) return pending;
  pending = runStartDemo(kind).finally(() => {
    pending = null;
  });
  return pending;
}

async function runStartDemo(kind: DemoAccountKind): Promise<StartDemoResult> {
  try {
    if (kind !== "personal" && kind !== "business") {
      return { status: "error", message: "invalid_account_kind" };
    }

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Real logged-in user: never mint anonymous, never call clone RPC.
    if (session && session.user.is_anonymous !== true) {
      goToProjects();
      return { status: "existing" };
    }

    // No session → anonymous auth. Mid-demo anonymous session → reuse it.
    if (!session) {
      const { error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) {
        return { status: "error", message: anonError.message };
      }
    }

    const { data, error } = await supabase.rpc("clone_demo_account", {
      p_kind: kind,
    });

    if (error) {
      const message = error.message ?? "";
      if (message.includes("demo_template_missing")) {
        return { status: "unavailable" };
      }
      return { status: "error", message: message || "clone_failed" };
    }

    if (typeof data !== "string" || !data) {
      return { status: "error", message: "clone_returned_no_account_id" };
    }

    goToProjects();
    return { status: "ok", accountId: data };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "unknown_error",
    };
  }
}
