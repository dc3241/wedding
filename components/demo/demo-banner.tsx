/**
 * Tier 1 demo indicator — one mount site in app layout (not forked per shell).
 * Neutral well strip — not berry. Not dismissible.
 */
export function DemoBanner() {
  return (
    <div
      role="status"
      className="border-b border-hairline bg-well px-6 py-2.5 text-center md:px-8"
    >
      <p className="text-[13px] font-medium text-ink">
        You&apos;re exploring a demo.
      </p>
    </div>
  );
}
