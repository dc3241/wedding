import { appOrigin } from "@/lib/url";

export function invoicePublicUrl(token: string): string {
  return `${appOrigin()}/invoice/${encodeURIComponent(token)}`;
}
