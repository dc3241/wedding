import { appOrigin } from "@/lib/url";

export function proposalPublicUrl(token: string): string {
  return `${appOrigin()}/proposal/${encodeURIComponent(token)}`;
}
