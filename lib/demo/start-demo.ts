import { startDemoAction } from "@/lib/demo/start-demo-action";
import type { DemoAccountKind, StartDemoResult } from "@/lib/demo/types";

export type { DemoAccountKind, StartDemoResult };

/** In-flight guard — one click ⇒ one server-brokered start. */
let pending: Promise<StartDemoResult> | null = null;

function goToProjects() {
  window.location.assign("/projects");
}

/**
 * Entry point for demo visitors (DEMO-02 / DEMO-04).
 * Server action handles IP throttle, anon mint, and clone.
 * Navigates to /projects on success or when a real session already exists.
 */
export function startDemo(kind: DemoAccountKind): Promise<StartDemoResult> {
  if (pending) return pending;
  pending = runStartDemo(kind).finally(() => {
    pending = null;
  });
  return pending;
}

async function runStartDemo(kind: DemoAccountKind): Promise<StartDemoResult> {
  if (kind !== "personal" && kind !== "business") {
    return { status: "error", message: "Something went wrong. Try again." };
  }

  const result = await startDemoAction(kind);

  if (result.status === "ok" || result.status === "existing") {
    goToProjects();
  }

  return result;
}
