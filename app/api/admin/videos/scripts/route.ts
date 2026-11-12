import { NextResponse } from "next/server";
import { adminOr404 } from "@/lib/admin/slideshows/auth";
import { writeScripts } from "@/lib/admin/videos/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const auth = await adminOr404();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body.ids.filter((v): v is string => typeof v === "string" && ID_RE.test(v)) : [];
  if (ids.length === 0 || ids.length > 10) return NextResponse.json({ error: "Pick 1–10 ideas." }, { status: 400 });
  try {
    return NextResponse.json({ results: await writeScripts(ids) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not write the scripts." }, { status: 500 });
  }
}
