import { NextResponse } from "next/server";
import { adminOr404 } from "@/lib/admin/slideshows/auth";
import { startRender } from "@/lib/admin/videos/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await adminOr404();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!ID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    await startRender(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not start the render." }, { status: 422 });
  }
}
