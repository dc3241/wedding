import type { AccountKind } from "@/lib/account-context";

export function isPlannerAccount(kind: AccountKind) {
  return kind === "business";
}

/** Couple surface width: working = workspace tabs; reading = billing / prose. */
export type CoupleSurface = "working" | "reading";

/** Outer page / project shell width and padding */
export function shellLayoutClass(
  kind: AccountKind,
  embedded: boolean,
  surface: CoupleSurface,
) {
  if (isPlannerAccount(kind)) {
    return embedded
      ? "w-full flex-1 pb-12"
      : "mx-auto w-full max-w-[1180px] flex-1 px-8 pt-7 pb-20";
  }
  if (surface === "working") {
    return "mx-auto w-full max-w-6xl flex-1 px-6 md:px-8 pt-8 pb-24";
  }
  return "mx-auto w-full max-w-[760px] flex-1 px-6 pt-8 pb-24";
}

/** Vertical rhythm between major sections */
export function sectionStackClass(kind: AccountKind) {
  return isPlannerAccount(kind) ? "space-y-5" : "space-y-8";
}

/** Timeline phase spacing */
export function phaseSectionClass(kind: AccountKind, isLast: boolean) {
  if (isLast) return "relative pl-6";
  return isPlannerAccount(kind) ? "relative pl-6 pb-5" : "relative pl-6 pb-8";
}

/** Task / vendor row vertical padding */
export function dataRowClass(kind: AccountKind) {
  return isPlannerAccount(kind) ? "py-1.5" : "py-2.5";
}

/** Projects index page shell */
export function projectsPageClass(kind: AccountKind) {
  return isPlannerAccount(kind)
    ? "mx-auto w-full max-w-[1180px] flex-1 px-8 py-7"
    : "mx-auto w-full max-w-[760px] flex-1 px-4 py-12";
}
