import { ProductShotLibrary } from "@/components/admin/product-shot-library";
import { PageHeader } from "@/components/ui/page-header";
import { CONTENT_QUEUE_BUCKET } from "@/lib/admin/content-queue";
import { PRODUCT_SHOTS } from "@/lib/admin/content-queue/product-shots";
import { createClient } from "@/utils/supabase/server";

const PREVIEW_TTL_SECONDS = 60 * 60;

export default async function AdminProductShotsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_shot_uploads")
    .select("surface, filename, file_size, storage_path");
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const previews = new Map<string, string>();
  await Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await supabase.storage
        .from(CONTENT_QUEUE_BUCKET)
        .createSignedUrl(row.storage_path, PREVIEW_TTL_SECONDS);
      if (signed?.signedUrl) previews.set(row.surface, signed.signedUrl);
    }),
  );

  const bySurface = new Map(rows.map((row) => [row.surface, row]));
  const shots = PRODUCT_SHOTS.map((shot) => {
    const row = bySurface.get(shot.slug);
    return {
      slug: shot.slug,
      description: shot.description,
      upload: row
        ? {
            filename: row.filename,
            fileSize: row.file_size == null ? null : Number(row.file_size),
            previewUrl: previews.get(shot.slug) ?? null,
          }
        : null,
    };
  });

  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Product screens"
        description="Upload a screenshot for an angle the generator already uses. The next slide for that angle shows it inside the phone. Crop to the part of the screen you want visible — a wide full-app shot is letterboxed. Posts already in the queue keep their current picture until you shuffle them or produce the idea again."
      />
      <ProductShotLibrary shots={shots} />
    </div>
  );
}
