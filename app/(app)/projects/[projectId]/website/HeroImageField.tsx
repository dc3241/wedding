"use client";

import { useRef, useState, useTransition } from "react";
import { clearHeroImage, setHeroImage } from "./actions";
import {
  uploadWebsiteImage,
  WEBSITE_IMAGE_ACCEPT,
} from "./website-media";
import { Button } from "@/components/ui/button";

type HeroImageFieldProps = {
  projectId: string;
  imageUrl?: string;
  onImageUrlChange: (next: string | undefined) => void;
};

export function HeroImageField({
  projectId,
  imageUrl,
  onImageUrlChange,
}: HeroImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pickFile() {
    inputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);

    const uploaded = await uploadWebsiteImage(projectId, "hero", file);
    if ("error" in uploaded) {
      setError(uploaded.error);
      return;
    }

    startTransition(async () => {
      const result = await setHeroImage(projectId, uploaded.url);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onImageUrlChange(uploaded.url);
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await clearHeroImage(projectId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onImageUrlChange(undefined);
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted">Hero photo</p>
      <input
        ref={inputRef}
        type="file"
        accept={WEBSITE_IMAGE_ACCEPT}
        className="sr-only"
        onChange={handleFileSelected}
      />

      {imageUrl ? (
        <div className="flex flex-wrap items-end gap-4">
          <div className="size-28 overflow-hidden rounded-[var(--radius-inner)] bg-well shadow-recessed">
            {/* eslint-disable-next-line @next/next/no-img-element -- public storage URL preview */}
            <img
              src={imageUrl}
              alt=""
              className="size-full object-cover"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="default"
              onClick={pickFile}
              disabled={isPending}
            >
              Replace
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleRemove}
              disabled={isPending}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="default"
          onClick={pickFile}
          disabled={isPending}
        >
          Upload hero photo
        </Button>
      )}

      {error ? (
        <p className="text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
      {isPending ? (
        <p className="text-[13px] text-muted">Saving…</p>
      ) : null}
    </div>
  );
}
