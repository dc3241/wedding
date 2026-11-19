import { createAnonServerClient } from "@/utils/supabase/anon-server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * MEDIA-07: outbound partner redirect. partner_click() counts the click
 * (one row per link per day, no visitor data) and returns the url.
 * Unknown or expired links fall back to the planning tools hub.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fallback = new URL("/plan", request.url);
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return NextResponse.redirect(fallback, 302);

  const { data, error } = await createAnonServerClient().rpc("partner_click", { p_slug: slug });
  if (error || typeof data !== "string" || !data.startsWith("https://")) {
    if (error) console.error("partner_click:", error.message);
    return NextResponse.redirect(fallback, 302);
  }
  const res = NextResponse.redirect(data, 302);
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
