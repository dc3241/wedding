import { NextResponse } from "next/server";
import { adminOr404 } from "@/lib/admin/slideshows/auth";
import { generateBatch } from "@/lib/admin/slideshows/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  const auth = await adminOr404();
  if (!auth.ok) return auth.response;
  const result = await generateBatch("manual");
  return NextResponse.json(result);
}
