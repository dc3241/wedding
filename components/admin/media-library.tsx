"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pill, type PillVariant } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import {
  ADMIN_MEDIA_BUCKET,
  buildMediaStoragePath,
  formatMediaFileSize,
  MEDIA_INPUT_ACCEPT,
  resumableUploadEndpoint,
  validateMediaFile,
} from "@/lib/admin/media";
import type { MediaAsset } from "@/lib/admin/types";
import { createClient } from "@/utils/supabase/client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload as TusUpload } from "tus-js-client";
import {
  createMediaUploadToken,
  deleteMediaAsset,
  getMediaDownloadUrl,
  recordMediaAsset,
  updateMediaAsset,
} from "@/app/(admin)/admin/media/actions";

const STATUS_META: Record<MediaAsset["status"], { label: string; pill: PillVariant }> = {
  new: { label: "New", pill: "default" },
  in_progress: { label: "In progress", pill: "clay" },
  ready: { label: "Ready", pill: "sage" },
  posted: { label: "Posted", pill: "accent" },
};

function isVideo(contentType: string | null) {
  return !!contentType && contentType.startsWith("video/");
}

type UploadJob = { name: string; progress: number; error: string | null };

function AssetRow({ asset }: { asset: MediaAsset }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleDownload() {
    setError(null);
    startTransition(async () => {
      try {
        const url = await getMediaDownloadUrl(asset.id);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create download link.");
      }
    });
  }

  function handleStatus(status: MediaAsset["status"]) {
    startTransition(async () => {
      await updateMediaAsset(asset.id, { status });
      router.refresh();
    });
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${asset.filename}"? This frees the storage immediately.`)) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteMediaAsset(asset.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete file.");
      }
    });
  }

  const meta = STATUS_META[asset.status];

  return (
    <Card className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-inner)] bg-well text-[11px] font-bold text-muted uppercase">
        {isVideo(asset.content_type) ? "VID" : "IMG"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-ink">{asset.filename}</div>
        <div className="text-[12px] text-muted">{formatMediaFileSize(asset.file_size)}</div>
      </div>
      <Select
        value={asset.status}
        onChange={(e) => handleStatus(e.target.value as MediaAsset["status"])}
        disabled={isPending}
        className="w-auto text-[12.5px]"
      >
        {(Object.keys(STATUS_META) as MediaAsset["status"][]).map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].label}
          </option>
        ))}
      </Select>
      <Pill variant={meta.pill}>{meta.label}</Pill>
      <div className="flex gap-3 text-[12px]">
        <button
          type="button"
          onClick={handleDownload}
          disabled={isPending}
          className="font-medium text-accent hover:underline"
        >
          Download
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="font-medium text-rosewood hover:underline"
        >
          Delete
        </button>
      </div>
      {error ? <p className="w-full text-[12px] text-rosewood">{error}</p> : null}
    </Card>
  );
}

export function MediaLibrary({ assets }: { assets: MediaAsset[] }) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function uploadOne(file: File) {
    const validationError = validateMediaFile(file);
    if (validationError) {
      setJobs((prev) => [...prev, { name: file.name, progress: 0, error: validationError }]);
      return;
    }

    setJobs((prev) => [...prev, { name: file.name, progress: 0, error: null }]);

    try {
      const path = buildMediaStoragePath(file.name);
      const { token } = await createMediaUploadToken(path);

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

      await new Promise<void>((resolve, reject) => {
        const upload = new TusUpload(file, {
          endpoint: resumableUploadEndpoint(supabaseUrl),
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            authorization: `Bearer ${session?.access_token ?? ""}`,
            "x-signature": token,
            "x-upsert": "false",
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: ADMIN_MEDIA_BUCKET,
            objectName: path,
            contentType: file.type || "application/octet-stream",
            cacheControl: "3600",
          },
          chunkSize: 6 * 1024 * 1024,
          onError: (err) => reject(err),
          onProgress: (bytesUploaded, bytesTotal) => {
            const pct = Math.round((bytesUploaded / bytesTotal) * 100);
            setJobs((prev) =>
              prev.map((j) => (j.name === file.name ? { ...j, progress: pct } : j)),
            );
          },
          onSuccess: () => resolve(),
        });

        upload.findPreviousUploads().then((previous) => {
          if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
          upload.start();
        });
      });

      await recordMediaAsset({
        filename: file.name,
        storagePath: path,
        fileSize: file.size,
        contentType: file.type || "application/octet-stream",
      });

      setJobs((prev) =>
        prev.map((j) => (j.name === file.name ? { ...j, progress: 100 } : j)),
      );
      router.refresh();
    } catch (err) {
      setJobs((prev) =>
        prev.map((j) =>
          j.name === file.name
            ? { ...j, error: err instanceof Error ? err.message : "Upload failed." }
            : j,
        ),
      );
    }
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    await Promise.all(Array.from(fileList).map(uploadOne));
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">Video and photo handoff — up to 2GB per file.</p>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={MEDIA_INPUT_ACCEPT}
            multiple
            className="hidden"
            id="admin-media-input"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="primary"
            className="text-[13px]"
            onClick={() => inputRef.current?.click()}
          >
            + Upload files
          </Button>
        </div>
      </div>

      {jobs.length > 0 ? (
        <div className="mb-5 space-y-2">
          {jobs.map((job, i) => (
            <Card key={`${job.name}-${i}`} className="px-4 py-3">
              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                <span className="truncate font-medium text-ink">{job.name}</span>
                <span className="text-muted">
                  {job.error ? "Failed" : job.progress === 100 ? "Done" : `${job.progress}%`}
                </span>
              </div>
              {job.error ? (
                <p className="text-[12px] text-rosewood">{job.error}</p>
              ) : (
                <div className="h-1.5 overflow-hidden rounded-full bg-well">
                  <div
                    className="h-full rounded-full bg-accent transition-[width]"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : null}

      {assets.length === 0 ? (
        <EmptyState>No media uploaded yet.</EmptyState>
      ) : (
        <div className="space-y-2">
          {assets.map((asset) => (
            <AssetRow key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
}
