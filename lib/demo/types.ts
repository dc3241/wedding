export type DemoAccountKind = "personal" | "business";

export type StartDemoResult =
  | { status: "ok"; accountId: string }
  /** Real (non-anonymous) session — RPC skipped; redirected to /projects. */
  | { status: "existing" }
  /** No is_demo_template account for this kind yet. */
  | { status: "unavailable" }
  /** IP throttle — deliberate reject, not a broken write. */
  | { status: "throttled" }
  | { status: "error"; message: string };
