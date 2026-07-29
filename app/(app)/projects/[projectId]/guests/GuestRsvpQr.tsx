"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import { regenerateGuestRsvpToken } from "./rsvp-access-actions";
import { Button } from "@/components/ui/button";

export function GuestRsvpQr({
  guestId,
  guestName,
  rsvpToken,
  siteSlug,
}: {
  guestId: string;
  guestName: string;
  rsvpToken: string;
  siteSlug: string | null;
}) {
  const [token, setToken] = useState(rsvpToken);
  const [origin, setOrigin] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const svgWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    setToken(rsvpToken);
  }, [rsvpToken]);

  if (!siteSlug) {
    return (
      <p className="text-[13px] text-muted">
        Publish a website slug to generate guest QR codes.
      </p>
    );
  }

  if (!origin) return null;

  const shareUrl = `${origin}/w/${siteSlug}/rsvp?g=${encodeURIComponent(token)}`;

  function downloadSvg() {
    const svg = svgWrapRef.current?.querySelector("svg");
    if (!svg) return;

    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const safeName = guestName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    anchor.download = `${safeName || "guest"}-rsvp-qr.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleRegenerate() {
    setMessage(null);
    startTransition(async () => {
      const result = await regenerateGuestRsvpToken(guestId);
      if (!result.ok) {
        setMessage(
          result.reason === "forbidden"
            ? "You don’t have permission to regenerate."
            : "Could not regenerate QR.",
        );
        return;
      }
      setToken(result.token);
      setMessage("New QR code ready — old invites no longer work.");
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-[13px] font-semibold text-accent hover:underline"
      >
        {open ? "Hide RSVP QR" : "Show RSVP QR"}
      </button>

      {open ? (
        <div className="space-y-3 rounded-[var(--radius-inner)] bg-surface p-3">
          <p className="break-all text-[12px] text-muted">{shareUrl}</p>
          <div
            ref={svgWrapRef}
            className="inline-block rounded-[var(--radius-inner)] bg-white p-2"
          >
            {/* QR matrix stays black on white for scanner contrast. */}
            <QRCodeSVG
              value={shareUrl}
              size={128}
              level="H"
              includeMargin
              bgColor="#FFFFFF"
              fgColor="#000000"
              title={`RSVP QR for ${guestName}`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="default" onClick={downloadSvg}>
              Download QR
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={handleRegenerate}
              className="text-muted hover:text-ink"
            >
              {isPending ? "Regenerating…" : "Regenerate"}
            </Button>
          </div>
          {message ? (
            <p className="text-[12px] text-muted" role="status">
              {message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
