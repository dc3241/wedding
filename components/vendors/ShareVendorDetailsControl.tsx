"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { shareProjectVendorDetails } from "@/lib/vendors/share-actions";
import { vendorShareUrl } from "@/lib/vendors/share-url";
import { formatEyebrowDate } from "@/lib/wedding-date";

export function ShareVendorDetailsControl({
  projectVendorId,
  confirmToken,
  vendorName,
  contactEmail,
  shareSentAt,
  canEmail,
}: {
  projectVendorId: string;
  confirmToken: string;
  vendorName: string;
  contactEmail: string | null;
  shareSentAt: string | null;
  canEmail: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [emailFailed, setEmailFailed] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const shareUrl = vendorShareUrl(confirmToken);
  const sentLabel = shareSentAt
    ? `Shared ${formatEyebrowDate(shareSentAt.slice(0, 10))}`
    : null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function handleEmail() {
    startTransition(async () => {
      setError(null);
      setEmailFailed(false);
      setSentTo(null);
      const result = await shareProjectVendorDetails(projectVendorId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.emailSent && result.emailedTo) {
        setSentTo(result.emailedTo);
        return;
      }
      setEmailFailed(true);
    });
  }

  return (
    <div className="space-y-3 rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed">
      <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Share details
      </p>
      <p className="text-[13px] text-muted">
        {vendorName} can open the date, venues, day-of timeline, and their
        payment dates — nothing else.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="default"
          onClick={handleCopy}
          className="px-3 py-1.5 text-[13px]"
        >
          {copied ? "Copied" : "Copy link"}
        </Button>
        {canEmail ? (
          <Button
            type="button"
            variant="primary"
            onClick={handleEmail}
            disabled={isPending}
            className="px-3 py-1.5 text-[13px]"
          >
            {isPending
              ? "Sending…"
              : shareSentAt || sentTo
                ? "Email again"
                : "Email details"}
          </Button>
        ) : null}
      </div>
      {sentTo ? (
        <p className="text-[13px] text-sage">Sent to {sentTo}</p>
      ) : sentLabel && !emailFailed ? (
        <p className="text-[13px] text-muted">{sentLabel}</p>
      ) : null}
      {emailFailed ? (
        <p className="text-[13px] text-muted">
          {contactEmail
            ? "Email didn't send — copy the link and share it."
            : "Add a contact email to send, or copy the link."}
        </p>
      ) : null}
      {error ? (
        <p className="text-[13px] font-medium text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
