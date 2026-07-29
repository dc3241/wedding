"use client";

import { useState } from "react";
import type { SectionVariant } from "./section-meta";
import { cn } from "@/lib/cn";

type PhotoTileProps = {
  variant: SectionVariant;
  url?: string;
  caption?: string;
  alt?: string;
  className?: string;
  shape?: "rect" | "square" | "circle" | "arch";
  /** Fill parent grid cell height (masonry). */
  fill?: boolean;
};

export function PhotoTile({
  variant,
  url,
  caption,
  alt = "",
  className,
  shape,
  fill,
}: PhotoTileProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(url) && !failed;

  const resolvedShape =
    shape ??
    (variant === "minimalist"
      ? "square"
      : variant === "romance"
        ? "arch"
        : "rect");

  const frameClass = fill
    ? "size-full"
    : resolvedShape === "circle"
      ? "aspect-square rounded-full"
      : resolvedShape === "square"
        ? variant === "garden"
          ? "aspect-square rounded-lg"
          : "aspect-square rounded-none"
        : resolvedShape === "arch"
          ? "aspect-[3/4] rounded-t-[999px] rounded-b-[10px]"
          : variant === "garden"
            ? "aspect-square rounded-lg"
            : "aspect-[4/5] rounded";

  return (
    <figure className={cn("min-w-0", fill && "h-full", className)}>
      <div
        className={cn("relative overflow-hidden", frameClass)}
        style={{ background: "var(--ws-tint)" }}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- public website-media URLs
          <img
            src={url}
            alt={alt}
            className="size-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--ws-tint) 40%, #ece8e2) 0%, color-mix(in srgb, var(--ws-border) 50%, #cabfb2) 100%)",
            }}
          />
        )}
      </div>
      {caption ? (
        <figcaption
          className={cn(
            "mt-2 text-[13px]",
            variant === "editorial" || variant === "minimalist"
              ? "text-left"
              : "text-center",
          )}
          style={{ color: "var(--ws-muted)" }}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
