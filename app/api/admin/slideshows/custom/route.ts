import { NextResponse } from "next/server";
import { adminOr404 } from "@/lib/admin/slideshows/auth";
import { produceCustomPost } from "@/lib/admin/slideshows/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  const auth = await adminOr404();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as { brief?: unknown } | null;
  const brief = typeof body?.brief === "string" ? body.brief.trim() : "";
  if (brief.length < 10 || brief.length > 2000) {
    return NextResponse.json({ error: "Describe the post in 10–2000 characters." }, { status: 400 });
  }
  const out = await produceCustomPost(brief);
  if ("error" in out) return NextResponse.json(out, { status: 422 });
  return NextResponse.json(out);
}
