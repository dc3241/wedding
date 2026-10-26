/**
 * Standing vendor-share URL (VND-SHARE-01).
 * Same confirm_token as AUTO-02 /vendor-confirm — read page, not a write.
 */
import { appOrigin } from "@/lib/url";

export function vendorShareUrl(token: string): string {
  return `${appOrigin()}/vendor/${encodeURIComponent(token)}`;
}
