"use client";

import { useState } from "react";
import type { PhotoShape } from "../types";
import type { SectionVariant } from "./section-meta";
import { cn } from "@/lib/cn";

type PhotoTileProps = {
  variant: SectionVariant;
  url?: string;
  caption?: string;
  alt?: string;
  className?: string;
  shape?: PhotoShape;
  /** Fill parent grid cell height (masonry). */
  fill?: boolean;
};

function templateDefaultShape(variant: SectionVariant): PhotoShape {
  if (variant === "minimalist") return "square";
  if (variant === "romance") return "arch";
  return "rect";
}

function shapeFrameClass(
  shape: PhotoShape,
  variant: SectionVariant,
  fill: boolean | undefined,
): string {
  const radius =
    shape === "circle"
      ? "rounded-full"
      : shape === "arch"
        ? "rounded-t-[999px] rounded-b-[10px]"
        : shape === "square"
          ? variant === "garden"
            ? "rounded-lg"
            : "rounded-none"
          : variant === "garden"
            ? "rounded-lg"
            : "rounded";

  if (fill) {
    return cn("size-full", radius);
  }

  if (shape === "circle") return cn("aspect-square", radius);
  if (shape === "square") return cn("aspect-square", radius);
  if (shape === "arch") return cn("aspect-[3/4]", radius);
  return cn(
    variant === "garden" ? "aspect-square" : "aspect-[4/5]",
    radius,
  );
}

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

  const resolvedShape = shape ?? templateDefaultShape(variant);
  const frameClass = shapeFrameClass(resolvedShape, variant, fill);

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
