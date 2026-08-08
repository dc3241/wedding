export type TourSpotRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

/** Shared target resolver for TourOverlay + TourProvider run filtering. */
export function measureTourTarget(target: string): TourSpotRect | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!(el instanceof HTMLElement)) return null;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
  };
}
