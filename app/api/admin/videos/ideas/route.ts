import { NextResponse } from "next/server";
import { adminOr404 } from "@/lib/admin/slideshows/auth";
import { generateIdeas } from "@/lib/admin/videos/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  const auth = await adminOr404();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json(await generateIdeas(10));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not generate ideas." }, { status: 500 });
  }
}
