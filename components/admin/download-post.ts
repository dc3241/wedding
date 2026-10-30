import { filledImagePaths } from "@/lib/admin/content-formats";
import type { ContentQueueItem } from "@/lib/admin/types";

function filenameFrom(res: Response, fallback: string): string {
  const header = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(header);
  return match?.[1] ?? fallback;
}

async function save(id: string, part: "zip" | "image" | "caption", fallback: string) {
  const res = await fetch(`/api/admin/queue-download?id=${encodeURIComponent(id)}&part=${part}`);
  if (!res.ok) {
    let message = "Could not download this post.";
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* keep the default message */
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filenameFrom(res, fallback);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

/**
 * Carousel (more than one image): one zip with every slide and caption.txt.
 * One image: the image and caption.txt as two files. No images: caption.txt.
 * The browser may ask once to allow multiple downloads.
 */
export async function downloadPost(
  item: Pick<ContentQueueItem, "id" | "image_paths">,
): Promise<void> {
  const images = filledImagePaths(item.image_paths).length;
  if (images > 1) {
    await save(item.id, "zip", "post.zip");
    return;
  }
  if (images === 1) await save(item.id, "image", "post.png");
  await save(item.id, "caption", "caption.txt");
}
