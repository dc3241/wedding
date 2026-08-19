"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";

const INQUIRE_ORIGIN = "https://www.usefirstlook.app";

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13px] text-muted">{label}</p>
        <p className="mt-0.5 break-all text-[15px] font-medium text-ink">
          {value}
        </p>
      </div>
      <Button
        type="button"
        variant="default"
        onClick={copy}
        className="shrink-0 px-3 py-1.5 text-[13px]"
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

export function InquiryIntakeCard({ slug }: { slug: string }) {
  const [origin, setOrigin] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const formUrl = origin ? `${origin}/inquire/${slug}` : `/inquire/${slug}`;
  const embedSnippet = `<iframe src="${INQUIRE_ORIGIN}/inquire/${slug}" width="100%" height="720" style="border:0;" title="Inquiry form"></iframe>`;

  return (
    <Card className="mb-6 p-5">
      <Eyebrow>Inquiry intake</Eyebrow>
      <p className="mt-2 text-[15px] font-medium text-muted">
        Share the form link, or embed the form on your site. Both land here as
        a new inquiry — nothing sends until you approve a reply.
      </p>
      <div className="mt-4 space-y-4">
        <CopyRow label="Form link" value={formUrl} />
        <CopyRow label="Embed on your site" value={embedSnippet} />
      </div>
    </Card>
  );
}
