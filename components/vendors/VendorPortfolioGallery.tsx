"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeVendorPhoto } from "@/app/(app)/vendors/actions";
import {
  uploadVendorImage,
  VENDOR_IMAGE_ACCEPT,
} from "@/app/(app)/vendors/vendor-media";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export type PortfolioPhoto = {
  path: string;
  url: string;
};

export function VendorPortfolioGallery({
  accountId,
  vendorId,
  photos,
}: {
  accountId: string;
  vendorId: string;
  photos: PortfolioPhoto[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [removingPath, setRemovingPath] = useState<string | null>(null);

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setError(null);
    startTransition(async () => {
      for (const file of files) {
        const result = await uploadVendorImage(accountId, vendorId, file);
        if ("error" in result) {
          setError(result.error);
          return;
        }
      }
      router.refresh();
    });
  }

  function handleRemove(path: string) {
    setError(null);
    setRemovingPath(path);
    startTransition(async () => {
      const result = await removeVendorPhoto(accountId, vendorId, path);
      setRemovingPath(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-accent">
          Portfolio
        </p>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={VENDOR_IMAGE_ACCEPT}
            multiple
            className="sr-only"
            onChange={handleFilesSelected}
            disabled={isPending}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => inputRef.current?.click()}
          >
            {isPending && !removingPath ? "Uploading…" : "Upload photos"}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-[14px] font-medium text-rosewood">{error}</p>
      ) : null}

      {photos.length === 0 ? (
        <p className="mt-4 text-[14px] text-muted">
          No photos yet — add a few to build out this vendor&apos;s profile.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <li
              key={photo.path}
              className="group relative overflow-hidden rounded-[var(--radius-inner)] bg-well shadow-recessed"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
              <img
                src={photo.url}
                alt=""
                className="aspect-square w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(photo.path)}
                disabled={isPending}
                aria-label="Remove photo"
                className={cn(
                  "absolute right-2 top-2 rounded-[var(--radius-pill)] bg-surface/90 px-2.5 py-1 text-[12px] font-semibold text-muted opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rosewood hover:bg-rosewood-wash hover:text-rosewood disabled:opacity-50",
                  removingPath === photo.path ? "opacity-100" : null,
                )}
              >
                {removingPath === photo.path ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
