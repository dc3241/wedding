"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyInviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant="default"
      onClick={copy}
      className="shrink-0 px-3 py-1.5 text-[13px]"
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
