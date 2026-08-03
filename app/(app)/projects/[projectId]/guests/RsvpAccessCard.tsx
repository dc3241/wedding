"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";

export function RsvpAccessCard({
  hasWebsite,
  websiteHref,
}: {
  hasWebsite: boolean;
  websiteHref: string;
}) {
  return (
    <Card className="px-6 py-5">
      <div>
        <Eyebrow>RSVP access</Eyebrow>
        <h2 className="mt-1.5 font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          Guest list only
        </h2>
        <p className="mt-1 text-[13px] text-muted">
          Guests RSVP with their invitation QR or by looking up their full name
          on your site. There is no open / anonymous RSVP.
        </p>
      </div>

      {!hasWebsite ? (
        <div className="mt-5 rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed">
          <p className="text-[14px] font-medium text-ink">
            Set up your wedding website first
          </p>
          <p className="mt-1 text-[13px] text-muted">
            RSVP links and QR codes live on your wedding website.
          </p>
          <Link
            href={websiteHref}
            className="mt-2 inline-block text-[14px] font-semibold text-accent hover:underline"
          >
            Open website settings
          </Link>
        </div>
      ) : (
        <p className="mt-5 text-[13px] text-muted">
          Download each guest’s QR from the guest list, or guests can search by
          full name on the site.
        </p>
      )}
    </Card>
  );
}
