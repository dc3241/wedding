"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  setRsvpAccessMode,
  type RsvpAccessMode,
} from "./rsvp-access-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/cn";

export function RsvpAccessCard({
  projectId,
  hasWebsite,
  rsvpAccessMode,
  websiteHref,
}: {
  projectId: string;
  hasWebsite: boolean;
  rsvpAccessMode: RsvpAccessMode;
  websiteHref: string;
}) {
  const [mode, setMode] = useState<RsvpAccessMode>(rsvpAccessMode);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(next: RsvpAccessMode) {
    if (!hasWebsite || next === mode) return;
    setMode(next);
    setMessage(null);
    startTransition(async () => {
      const result = await setRsvpAccessMode(projectId, next);
      if (result.ok) return;
      setMode(rsvpAccessMode);
      if (result.reason === "no_website") {
        setMessage("Create your wedding website first.");
        return;
      }
      if (result.reason === "forbidden") {
        setMessage("You don’t have permission to change this.");
        return;
      }
      setMessage("Could not save RSVP access.");
    });
  }

  return (
    <Card className="px-6 py-5">
      <div>
        <Eyebrow>RSVP access</Eyebrow>
        <h2 className="mt-1.5 font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          Who can RSVP
        </h2>
        <p className="mt-1 text-[13px] text-muted">
          Open lets anyone submit. Gated requires a guest QR or full-name match.
        </p>
      </div>

      {!hasWebsite ? (
        <div className="mt-5 rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed">
          <p className="text-[14px] font-medium text-ink">
            Set up your wedding website first
          </p>
          <p className="mt-1 text-[13px] text-muted">
            Access mode lives on your wedding website.
          </p>
          <Link
            href={websiteHref}
            className="mt-2 inline-block text-[14px] font-semibold text-accent hover:underline"
          >
            Open website settings
          </Link>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2">
          {(["open", "gated"] as const).map((value) => {
            const active = mode === value;
            return (
              <Button
                key={value}
                type="button"
                variant={active ? "primary" : "default"}
                disabled={isPending}
                onClick={() => handleSelect(value)}
                className={cn(
                  "rounded-[var(--radius-pill)] capitalize",
                  !active && "bg-well text-muted hover:text-ink",
                )}
                aria-pressed={active}
              >
                {value}
              </Button>
            );
          })}
        </div>
      )}

      {message ? (
        <p className="mt-3 text-[13px] text-rosewood" role="alert">
          {message}
        </p>
      ) : null}

      {hasWebsite && mode === "gated" ? (
        <p className="mt-3 text-[13px] text-muted">
          Download each guest’s QR from the guest list, or guests can search by
          full name on the site.
        </p>
      ) : null}
    </Card>
  );
}
