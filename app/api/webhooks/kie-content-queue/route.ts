/**
 * CONTENT-QUEUE-02 — KIE completion callback.
 *
 * HMAC is optional (KIE only sends X-Webhook-Signature when webhookHmacKey
 * is enabled in their settings). The hard gate is always: the taskId must
 * already live on a content_queue row. Unknown ids are discarded.
 *
 * image_paths is written here and nowhere else. Bytes are re-uploaded to
 * content-queue-assets; KIE's short-lived URLs are never stored.
 */
import { NextResponse } from "next/server";
import { CONTENT_QUEUE_BUCKET } from "@/lib/admin/content-queue";
import {
  callbackSucceeded,
  extractResultUrls,
  parseKieCallback,
  verifyKieWebhookSignature,
} from "@/lib/admin/content-queue/callback";
import { KIE_MODEL } from "@/lib/admin/content-queue/generate";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

async function fetchImageBytes(url: string): Promise<{ bytes: Buffer; contentType: string }> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Failed to fetch generated image (${res.status})`);
  }
  const contentType = res.headers.get("content-type") ?? "image/png";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Generated URL was not an image (${contentType})`);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Generated image was empty or too large");
  }
  return { bytes, contentType: contentType.split(";")[0]!.trim() };
}

function extensionFor(contentType: string): string {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  return "png";
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseKieCallback(raw);
  if (!parsed.taskId) {
    return NextResponse.json({ received: true, ignored: "missing_task_id" });
  }

  const verified = verifyKieWebhookSignature({
    taskId: parsed.taskId,
    timestamp: request.headers.get("x-webhook-timestamp"),
    signature: request.headers.get("x-webhook-signature"),
  });
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const supabase = createServiceRoleClient();
  const { data: row, error: rowError } = await supabase
    .from("content_queue")
    .select("id, week_of, image_paths")
    .eq("kie_task_id", parsed.taskId)
    .maybeSingle();

  if (rowError) {
    console.error("kie-content-queue lookup:", rowError);
    return NextResponse.json({ error: rowError.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ received: true, ignored: "unknown_task" });
  }

  if (!callbackSucceeded(parsed)) {
    console.error(
      "kie-content-queue generation failed:",
      parsed.taskId,
      parsed.failMsg || parsed.msg,
    );
    return NextResponse.json({ received: true, failed: true });
  }

  const urls = extractResultUrls(parsed.resultJson);
  if (urls.length === 0) {
    console.error("kie-content-queue success with no resultUrls:", parsed.taskId);
    return NextResponse.json({ received: true, failed: true });
  }

  const paths: string[] = [];
  try {
    for (let i = 0; i < urls.length; i += 1) {
      const { bytes, contentType } = await fetchImageBytes(urls[i]!);
      const ext = extensionFor(contentType);
      const path = `generated/${row.week_of}/${row.id}/${i}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(CONTENT_QUEUE_BUCKET)
        .upload(path, bytes, {
          contentType,
          upsert: true,
        });
      if (uploadError) {
        throw new Error(uploadError.message);
      }
      paths.push(path);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "upload failed";
    console.error("kie-content-queue ingest:", parsed.taskId, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("content_queue")
    .update({
      image_paths: paths,
      generated_by: parsed.model ?? KIE_MODEL,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("kie_task_id", parsed.taskId);

  if (updateError) {
    console.error("kie-content-queue update:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ received: true, stored: paths.length });
}
