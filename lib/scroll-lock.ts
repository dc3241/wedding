/**
 * Ref-counted document scroll lock. html is document.scrollingElement in
 * standards mode; body overflow alone does not stop viewport scroll.
 *
 * Callers: PlannerShell drawer, AssistantPanel. NoteModal and TourOverlay
 * still use their own behavior — future candidates, not this slice.
 */

let lockCount = 0;
let prevHtmlOverflow = "";
let prevBodyOverflow = "";

export function acquireScrollLock() {
  if (typeof document === "undefined") return;

  const html = document.documentElement;
  if (lockCount === 0) {
    prevHtmlOverflow = html.style.overflow;
    prevBodyOverflow = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

export function releaseScrollLock() {
  if (typeof document === "undefined") return;
  if (lockCount === 0) return;

  lockCount -= 1;
  if (lockCount === 0) {
    document.documentElement.style.overflow = prevHtmlOverflow;
    document.body.style.overflow = prevBodyOverflow;
  }
}
