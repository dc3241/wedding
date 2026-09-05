import "server-only";

import { CONTENT_QUEUE_BUCKET } from "@/lib/admin/content-queue";
import type { ContentQueuePlatform } from "@/lib/admin/content-queue";
import { appOrigin } from "@/lib/url";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import type { PlannedPost } from "@/lib/admin/content-queue/plan";

export const KIE_CREATE_TASK_URL = "https://api.kie.ai/api/v1/jobs/createTask";
export const KIE_RECORD_INFO_URL = "https://api.kie.ai/api/v1/jobs/recordInfo";
export const KIE_MODEL = "seedream/5-pro-image-to-image";

/** Seedream 5 Pro i2i: `basic` = 1K, `high` = 2K. 1K covers 1080 social. */
export const KIE_QUALITY = "basic" as const;

type KiePlatform = Exclude<ContentQueuePlatform, "linkedin">;

export const PLATFORM_ASPECT: Record<KiePlatform, string> = {
  // Slice sizing is IG 4:5. KIE's documented enum is
  // 1:1 | 4:3 | 3:4 | 16:9 | 9:16 | 2:3 | 3:2 | 21:9 — no 4:5.
  // Sending 4:5 as specified; if createTask rejects it, drop to 3:4.
  instagram: "4:5",
  tiktok: "9:16",
  pinterest: "2:3",
};

/**
 * Locked templates in content-queue-assets. The bucket holds the full
 * sets under references/lrvn-post/ and references/square/; these two
 * are the ones createTask actually sends (TikTok = 9:16 LRVN, IG/Pin = square).
 * Override with CONTENT_QUEUE_REF_LRVN_URL / CONTENT_QUEUE_REF_SQUARE_URL
 * if the files are hosted at a stable public URL instead.
 */
export const CONTENT_QUEUE_REFERENCE_PATHS = {
  lrvnPost: "references/lrvn-post/LRVN_POST_1.jpg",
  squareSet: "references/square/rsvp-chasing.png",
} as const;

const REFERENCE_SIGNED_TTL_SECONDS = 60 * 60;

function kieApiKey(): string {
  const key = process.env.KIE_API_KEY?.trim();
  if (!key) {
    throw new Error("KIE_API_KEY is not configured.");
  }
  return key;
}

function callbackOrigin(): string {
  return (process.env.APP_ORIGIN ?? appOrigin()).replace(/\/$/, "");
}

function envUrl(name: string): string | null {
  const value = process.env[name]?.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) {
    throw new Error(`${name} must be an http(s) URL.`);
  }
  return value;
}

async function signedReferenceUrl(path: string): Promise<string> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage
    .from(CONTENT_QUEUE_BUCKET)
    .createSignedUrl(path, REFERENCE_SIGNED_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    throw new Error(
      `Content-queue reference image missing from ${CONTENT_QUEUE_BUCKET}: ${path}. Upload the locked template (or set CONTENT_QUEUE_REF_LRVN_URL / CONTENT_QUEUE_REF_SQUARE_URL) before generating.`,
    );
  }
  return data.signedUrl;
}

export async function resolveReferenceUrls(): Promise<{
  lrvnPost: string;
  squareSet: string;
}> {
  const lrvnPost =
    envUrl("CONTENT_QUEUE_REF_LRVN_URL") ??
    (await signedReferenceUrl(CONTENT_QUEUE_REFERENCE_PATHS.lrvnPost));
  const squareSet =
    envUrl("CONTENT_QUEUE_REF_SQUARE_URL") ??
    (await signedReferenceUrl(CONTENT_QUEUE_REFERENCE_PATHS.squareSet));
  return { lrvnPost, squareSet };
}

export async function requestGeneration(
  post: Pick<PlannedPost, "platform" | "prompt">,
  references?: { lrvnPost: string; squareSet: string },
): Promise<string> {
  if (post.platform === "linkedin") {
    throw new Error("LinkedIn posts are text-only; skip image generation.");
  }
  const refs = references ?? (await resolveReferenceUrls());
  const byPlatform: Record<KiePlatform, string> = {
    tiktok: refs.lrvnPost,
    instagram: refs.squareSet,
    pinterest: refs.squareSet,
  };

  const res = await fetch(KIE_CREATE_TASK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${kieApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: KIE_MODEL,
      callBackUrl: `${callbackOrigin()}/api/webhooks/kie-content-queue`,
      input: {
        prompt: post.prompt,
        image_urls: [byPlatform[post.platform]],
        aspect_ratio: PLATFORM_ASPECT[post.platform],
        quality: KIE_QUALITY,
        output_format: "png",
      },
    }),
  });

  let json: { code?: number; msg?: string; data?: { taskId?: string } };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    throw new Error(`KIE createTask failed: ${res.status} ${res.statusText}`);
  }
  if (json.code !== 200 || !json.data?.taskId) {
    throw new Error(`KIE createTask failed: ${json.msg ?? res.statusText}`);
  }
  return json.data.taskId;
}

export async function getKieTaskDetails(taskId: string): Promise<unknown> {
  const url = new URL(KIE_RECORD_INFO_URL);
  url.searchParams.set("taskId", taskId);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${kieApiKey()}` },
  });
  return res.json();
}
