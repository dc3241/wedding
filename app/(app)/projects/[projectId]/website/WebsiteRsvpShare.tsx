"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";

type WebsiteRsvpShareProps = {
  published: boolean;
  savedSlug: string | null;
};

export function WebsiteRsvpShare({ published, savedSlug }: WebsiteRsvpShareProps) {
  const [origin, setOrigin] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const svgWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  if (!published || !savedSlug) {
    return (
      <p className="border-t border-hairline pt-4 text-[13px] text-muted">
        Publish your site to generate a QR code and share link.
      </p>
    );
  }

  if (!origin) {
    return null;
  }

  const shareUrl = `${origin}/w/${savedSlug}#rsvp`;

  function downloadSvg() {
    const svg = svgWrapRef.current?.querySelector("svg");
    if (!svg || !savedSlug) return;

    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${savedSlug}-rsvp-qr.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4 border-t border-hairline pt-4">
      <div>
        <p className="mb-1.5 text-[13px] text-muted">Share link</p>
        <p className="break-all text-[14px] font-medium text-ink">{shareUrl}</p>
      </div>

      <div
        ref={svgWrapRef}
        className="inline-block rounded-[var(--radius-inner)] bg-white p-3"
      >
        {/* QR matrix stays black on white for scanner contrast — do not tint with Soft stack tokens. */}
        <QRCodeSVG
          value={shareUrl}
          size={160}
          level="H"
          includeMargin
          bgColor="#FFFFFF"
          fgColor="#000000"
          title="RSVP page QR code"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="default" onClick={downloadSvg}>
          Download QR (SVG)
        </Button>
        <Button type="button" variant="default" onClick={copyLink}>
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}
