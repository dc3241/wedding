/**
 * Standing vendor-confirm URL for AUTO-02 / VND-16.
 * Single source for the countdown cron and the booked-card copy control.
 */
import { appOrigin } from "@/lib/url";

export function vendorConfirmUrl(token: string): string {
  return `${appOrigin()}/vendor-confirm/${encodeURIComponent(token)}`;
}
