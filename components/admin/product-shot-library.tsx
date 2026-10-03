"use client";

import {
  clearProductShotUpload,
  recordProductShotUpload,
} from "@/app/(admin)/admin/product-shots/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  buildProductShotStoragePath,
  CONTENT_QUEUE_BUCKET,
  PRODUCT_SHOT_INPUT_ACCEPT,
  productShotMime,
  validateProductShotFile,
} from "@/lib/admin/content-queue/product-shot-library";
import { formatMediaFileSize } from "@/lib/admin/media";
import { createClient } from "@/utils/supabase/client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type ProductShotCard = {
  slug: string;
  description: string;
  upload: { filename: string; fileSize: number | null; previewUrl: string | null } | null;
};

function ShotCard({ shot }: { shot: ProductShotCard }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    const validationError = validateProductShotFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const mime = productShotMime(file.name, file.type);
      if (!mime) throw new Error("Use a PNG, JPG, or WebP.");
      const path = buildProductShotStoragePath(shot.slug, file.name, mime);
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage.from(CONTENT_QUEUE_BUCKET).upload(path, file, {
        contentType: mime,
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);
      try {
        await recordProductShotUpload({
          surface: shot.slug,
          storagePath: path,
          filename: file.name,
          fileSize: file.size,
          contentType: mime,
        });
      } catch (err) {
        await supabase.storage.from(CONTENT_QUEUE_BUCKET).remove([path]);
        throw err;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleClear() {
    if (!window.confirm(`Remove the screenshot for ${shot.description}? New slides for this angle go back to the drawn screen.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await clearProductShotUpload(shot.slug);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not remove screenshot.");
      }
    });
  }

  const busy = uploading || isPending;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[var(--radius-inner)] bg-well">
        {shot.upload?.previewUrl ? (
          // Signed storage URL, not a configured image host.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shot.upload.previewUrl}
            alt=""
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="px-4 text-center text-[13px] text-muted">Drawn screen</span>
        )}
      </div>
      <div>
        <div className="text-[15px] font-medium text-ink">{shot.description}</div>
        {shot.upload ? (
          <div className="mt-1 truncate text-[13px] text-muted">
            {shot.upload.filename}
            {shot.upload.fileSize != null ? ` · ${formatMediaFileSize(shot.upload.fileSize)}` : ""}
          </div>
        ) : (
          <div className="mt-1 text-[13px] text-muted">No screenshot yet</div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={shot.upload ? "default" : "primary"}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : shot.upload ? "Replace" : "Upload"}
        </Button>
        {shot.upload ? (
          <Button type="button" variant="ghost" disabled={busy} onClick={handleClear}>
            Remove
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={PRODUCT_SHOT_INPUT_ACCEPT}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />
      {error ? <p className="text-[13px] text-rosewood">{error}</p> : null}
    </Card>
  );
}

export function ProductShotLibrary({ shots }: { shots: ProductShotCard[] }) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
      {shots.map((shot) => (
        <ShotCard key={shot.slug} shot={shot} />
      ))}
    </div>
  );
}
