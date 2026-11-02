/**
 * COUPLES-PIVOT pricing (Oct 2026) — display values only.
 *
 * Checkout charges whatever Stripe Price STRIPE_PRICE_COUPLE_MONTHLY /
 * STRIPE_PRICE_COUPLE_LIFETIME point at. Stripe Prices are immutable, so the
 * $19.99 monthly needs a NEW Price in the Stripe Dashboard and the env var
 * swapped to it — editing these constants alone does not change the charge.
 *
 * Client-safe (no server-only import) so marketing components can read it.
 */
export const COUPLE_FREE_PRICE = 0;
export const COUPLE_MONTHLY_PRICE = 19.99;
export const COUPLE_LIFETIME_PRICE = 99;

export const COUPLE_MONTHLY_LABEL = "$19.99/mo";
export const COUPLE_LIFETIME_LABEL = "$99";

/** "$19.99" / "$99" — no trailing ".00" on whole dollars. */
export function formatCouplePrice(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}
