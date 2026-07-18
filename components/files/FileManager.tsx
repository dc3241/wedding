"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { deleteFile, getDownloadUrl, recordFile } from "./actions";
import {
  buildStoragePath,
  FILE_INPUT_ACCEPT,
  formatFileSize,
  formatUploadedDate,
  PROJECT_FILES_BUCKET,
  resolveMimeType,
  validateFile,
  type FileKind,
  type ProjectFile,
} from "./types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/cn";

function FileRow({
  file,
  disabled,
  trailing,
}: {
  file: ProjectFile;
  disabled: boolean;
  trailing?: ReactNode;
}) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  function handleDownload() {
    setActionError(null);
    startTransition(async () => {
      const result = await getDownloadUrl(file.id);
      if ("error" in result) {
        setActionError(result.error);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${file.name}"? This cannot be undone.`)) return;
    setActionError(null);
    startTransition(async () => {
      try {
        await deleteFile(file.id);
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Could not delete file.",
        );
      }
    });
  }

  return (
    <li
      className={cn(
        "mb-2 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed last:mb-0",
        (disabled || isPending) && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium text-ink">
          {file.name}
        </div>
        <div className="mt-1 text-[13px] tabular-nums text-muted">
          {formatFileSize(file.size_bytes)}
          <span className="mx-1.5">·</span>
          {formatUploadedDate(file.created_at)}
        </div>
        {actionError ? (
          <p className="mt-1 text-[13px] text-rosewood">{actionError}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {trailing}
        <Button
          type="button"
          variant="default"
          onClick={handleDownload}
          disabled={disabled || isPending}
          className="px-3 py-1.5 text-[13px]"
        >
          Download
        </Button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={disabled || isPending}
          className="px-2 text-[13px] font-medium text-muted transition-colors hover:text-rosewood disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export function FileManager({
  projectId,
  kind = "file",
  files,
  label = "Files",
  emptyState = "No files yet. Upload a PDF, image, or document to get started.",
  trailingSlots = {},
}: {
  projectId: string;
  kind?: FileKind;
  files: ProjectFile[];
  label?: string;
  emptyState?: string;
  trailingSlots?: Record<string, ReactNode>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    const mimeType = resolveMimeType(file)!;
    const storagePath = buildStoragePath(projectId, file.name);

    setIsUploading(true);

    try {
      const supabase = createClient();

      const { error: uploadError } = await supabase.storage
        .from(PROJECT_FILES_BUCKET)
        .upload(storagePath, file, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        setUploadError(uploadError.message);
        return;
      }

      try {
        await recordFile(projectId, {
          name: file.name,
          storagePath,
          mimeType,
          sizeBytes: file.size,
          kind,
        });
      } catch (recordErr) {
        await supabase.storage.from(PROJECT_FILES_BUCKET).remove([storagePath]);
        throw recordErr;
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            {label}
          </p>
          <p className="mt-1 text-[13px] text-muted">
            PDFs, images, and documents up to 25 MB.
          </p>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={FILE_INPUT_ACCEPT}
            onChange={handleFileSelected}
            disabled={isUploading}
            className="sr-only"
            aria-label="Upload file"
          />
          <Button
            type="button"
            variant="primary"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? "Uploading…" : "Upload file"}
          </Button>
        </div>
      </div>

      {uploadError ? (
        <p className="text-[13px] text-rosewood">{uploadError}</p>
      ) : null}

      {files.length === 0 ? (
        <EmptyState>{emptyState}</EmptyState>
      ) : (
        <Card className="overflow-hidden px-3.5 py-3.5">
          <ul>
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                disabled={isUploading}
                trailing={trailingSlots[file.id]}
              />
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
