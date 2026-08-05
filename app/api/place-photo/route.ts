import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/** Places photo resource names: places/{placeId}/photos/{photoRef} */
const PHOTO_NAME_RE = /^places\/[^/]+\/photos\/[^/]+$/;

const DEFAULT_MAX_WIDTH_PX = 420;
const MIN_PX = 1;
const MAX_PX = 4800;

function parseMaxWidthPx(raw: string | null): number {
  if (!raw) return DEFAULT_MAX_WIDTH_PX;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return DEFAULT_MAX_WIDTH_PX;
  return Math.min(MAX_PX, Math.max(MIN_PX, n));
}

/**
 * Auth-gated Place Photo (New) proxy. Validates photo `name` shape, appends
 * the server-held GOOGLE_MAPS_API_KEY, and streams image bytes — never exposes
 * the key to the client.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const name = url.searchParams.get("name")?.trim() ?? "";
  if (!PHOTO_NAME_RE.test(name)) {
    return NextResponse.json({ error: "Invalid photo name" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Places photos are not configured" },
      { status: 503 },
    );
  }

  const maxWidthPx = parseMaxWidthPx(url.searchParams.get("maxWidthPx"));
  const mediaUrl = new URL(
    `https://places.googleapis.com/v1/${name}/media`,
  );
  mediaUrl.searchParams.set("maxWidthPx", String(maxWidthPx));
  mediaUrl.searchParams.set("key", apiKey);

  let upstream: Response;
  try {
    upstream = await fetch(mediaUrl, {
      // Follow redirects so we get image bytes, not a photoUri JSON payload.
      redirect: "follow",
      next: { revalidate: 86_400 },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach Google Places Photos" },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Photo unavailable" },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json(
      { error: "Unexpected photo response" },
      { status: 502 },
    );
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
