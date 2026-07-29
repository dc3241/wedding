import type { WeddingWebsiteContent } from "../types";
import { Band, Wrap } from "../layout";
import { PhotoTile } from "./PhotoTile";
import { SectionHead } from "./SectionHead";
import { showGallery, type SectionVariant } from "./section-meta";
import { cn } from "@/lib/cn";

type GallerySectionProps = {
  content: WeddingWebsiteContent;
  variant: SectionVariant;
  tint?: boolean;
};

export function GallerySection({ content, variant, tint }: GallerySectionProps) {
  if (!showGallery(content)) return null;

  const { images } = content.gallery;

  return (
    <Band id="gallery" tint={tint}>
      <Wrap>
        <SectionHead
          variant={variant}
          eyebrow={
            variant === "minimalist" || variant === "editorial"
              ? undefined
              : "Us, lately"
          }
          sub={
            variant === "editorial"
              ? "A year, more or less, in pictures."
              : variant === "classic"
                ? "A few favorites while you're here."
                : undefined
          }
        >
          Gallery
        </SectionHead>

        {variant === "editorial" ? (
          <div
            className="grid gap-3.5 md:grid-cols-[1.6fr_1fr] md:grid-rows-2"
            style={{ minHeight: 0 }}
          >
            <PhotoTile
              variant={variant}
              url={images[0]?.url}
              caption={images[0]?.caption}
              className="md:row-span-2 md:h-[520px]"
              fill
            />
            <div className="grid gap-3.5 md:h-[520px] md:grid-rows-2">
              {images.slice(1, 3).map((image, index) => (
                <PhotoTile
                  key={`${image.url}-${index}`}
                  variant={variant}
                  url={image.url}
                  caption={image.caption}
                  fill
                  className="h-full min-h-[200px]"
                />
              ))}
            </div>
          </div>
        ) : variant === "minimalist" ? (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {images.map((image, index) => (
              <PhotoTile
                key={`${image.url}-${index}`}
                variant={variant}
                url={image.url}
                caption={image.caption}
                shape="square"
              />
            ))}
          </div>
        ) : variant === "romance" ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
            {images.map((image, index) => (
              <PhotoTile
                key={`${image.url}-${index}`}
                variant={variant}
                url={image.url}
                caption={image.caption}
                shape="arch"
              />
            ))}
          </div>
        ) : variant === "garden" ? (
          <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-3">
            {images.map((image, index) => (
              <PhotoTile
                key={`${image.url}-${index}`}
                variant={variant}
                url={image.url}
                caption={image.caption}
                shape="square"
              />
            ))}
          </div>
        ) : (
          // classic — mixed masonry
          <div className="grid auto-rows-[150px] grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((image, index) => {
              const pattern = index % 7;
              const tallWide = pattern === 0;
              const wide = pattern === 4;
              return (
                <PhotoTile
                  key={`${image.url}-${index}`}
                  variant={variant}
                  url={image.url}
                  caption={image.caption}
                  fill
                  className={cn(
                    "h-full",
                    tallWide && "row-span-2 sm:col-span-2",
                    wide && "sm:col-span-2",
                  )}
                />
              );
            })}
          </div>
        )}
      </Wrap>
    </Band>
  );
}
