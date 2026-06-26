"use client";

import { useRef, useState, useTransition } from "react";
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
import { Eyebrow } from "@/components/ui/eyebrow";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/cn";

function FileRow({
  file,
  disabled,
}: {
  file: ProjectFile;
  disabled: boolean;
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
        "flex flex-wrap items-center justify-between gap-3 py-3",
        (disabled || isPending) && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] text-ink">{file.name}</div>
        <div className="mt-0.5 text-[13px] tabular-nums text-ink-muted">
          {formatFileSize(file.size_bytes)}
          <span className="mx-1.5">·</span>
          {formatUploadedDate(file.created_at)}
        </div>
        {actionError ? (
          <p className="mt-1 text-[13px] text-rosewood">{actionError}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="default"
          onClick={handleDownload}
          disabled={disabled || isPending}
        >
          Download
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleDelete}
          disabled={disabled || isPending}
          className="text-ink-muted hover:text-rosewood"
        >
          Delete
        </Button>
      </div>
    </li>
  );
}

export function FileManager({
  projectId,
  kind = "file",
  files,
}: {
  projectId: string;
  kind?: FileKind;
  files: ProjectFile[];
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
    <section>
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Files</Eyebrow>
          <p className="mt-1 text-[13px] text-ink-muted">
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
        <p className="mb-4 text-[13px] text-rosewood">{uploadError}</p>
      ) : null}

      {files.length === 0 ? (
        <p className="px-1 text-[13px] text-ink-muted">
          No files yet. Upload a PDF, image, or document to get started.
        </p>
      ) : (
        <Card className="px-5 py-1">
          <ul className="divide-y divide-stone">
            {files.map((file) => (
              <FileRow key={file.id} file={file} disabled={isUploading} />
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
