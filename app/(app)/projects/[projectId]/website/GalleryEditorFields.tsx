"use client";

import { useRef, useState } from "react";
import { moveArrayItem, ReorderButtons } from "./ReorderButtons";
import {
  uploadWebsiteImage,
  WEBSITE_IMAGE_ACCEPT,
} from "./website-media";
import type { GalleryImage, PhotoShape } from "@/components/website/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type GalleryEditorFieldsProps = {
  projectId: string;
  images: GalleryImage[];
  imageShape?: PhotoShape;
  onChange: (images: GalleryImage[]) => void;
  onImageShapeChange: (shape: PhotoShape | undefined) => void;
};

export function GalleryEditorFields({
  projectId,
  images,
  imageShape,
  onChange,
  onImageShapeChange,
}: GalleryEditorFieldsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setError(null);
    setUploading(true);
    const added: GalleryImage[] = [];

    try {
      for (const file of files) {
        const uploaded = await uploadWebsiteImage(projectId, "gallery", file);
        if ("error" in uploaded) {
          setError(uploaded.error);
          break;
        }
        added.push({ url: uploaded.url });
      }
      if (added.length > 0) {
        onChange([...images, ...added]);
      }
    } finally {
      setUploading(false);
    }
  }

  function updateCaption(index: number, caption: string) {
    onChange(
      images.map((image, i) =>
        i === index
          ? {
              url: image.url,
              ...(caption.trim() ? { caption: caption.trim() } : {}),
            }
          : image,
      ),
    );
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function move(from: number, to: number) {
    onChange(moveArrayItem(images, from, to));
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="gallery-image-shape"
          className="mb-1.5 block text-[13px] text-muted"
        >
          Photo shape
        </label>
        <Select
          id="gallery-image-shape"
          value={imageShape ?? "default"}
          onChange={(e) => {
            const value = e.target.value;
            onImageShapeChange(
              value === "default" ? undefined : (value as PhotoShape),
            );
          }}
        >
          <option value="default">Template default</option>
          <option value="rect">Rounded rectangle</option>
          <option value="square">Square</option>
          <option value="circle">Circle</option>
          <option value="arch">Arch</option>
        </Select>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={WEBSITE_IMAGE_ACCEPT}
        multiple
        className="sr-only"
        onChange={handleFilesSelected}
      />

      {images.length === 0 ? (
        <p className="text-[13px] text-muted">
          No photos yet. Upload images to show a gallery on your site.
        </p>
      ) : (
        <ul className="space-y-3">
          {images.map((image, index) => (
            <li
              key={`${image.url}-${index}`}
              className="flex flex-wrap gap-3 rounded-[var(--radius-inner)] bg-well p-3 shadow-recessed"
            >
              <div className="size-20 shrink-0 overflow-hidden rounded-[var(--radius-inner)] bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element -- public website-media URL */}
                <img
                  src={image.url}
                  alt=""
                  className="size-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] text-muted">Photo {index + 1}</span>
                  <div className="flex items-center gap-2">
                    <ReorderButtons
                      index={index}
                      total={images.length}
                      onMove={move}
                      disabled={uploading}
                      label={`photo ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeAt(index)}
                      disabled={uploading}
                      className="text-[13px] text-muted hover:text-rosewood"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <Input
                  value={image.caption ?? ""}
                  onChange={(e) => updateCaption(index, e.target.value)}
                  placeholder="Caption (optional)"
                  disabled={uploading}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="default"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "Uploading…" : "Upload photos"}
      </Button>
      {error ? (
        <p className="text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
