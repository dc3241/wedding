import type { DemoAccountKind } from "@/lib/demo/types";

export function demoKindFromParam(value: string | null): DemoAccountKind {
  return value === "personal" ? "personal" : "business";
}

/** Public URL that starts a demo. This is the link to copy and send. */
export function demoEntryPath(kind: DemoAccountKind): string {
  return kind === "personal" ? "/demo?kind=personal" : "/demo";
}

/**
 * Workspace rendered for a demo session. The browser stays on demoEntryPath;
 * /dashboard itself requires a session and otherwise sends people to /login.
 */
export function demoWorkspacePath(
  kind: DemoAccountKind,
): "/projects" | "/dashboard" {
  return kind === "personal" ? "/projects" : "/dashboard";
}
