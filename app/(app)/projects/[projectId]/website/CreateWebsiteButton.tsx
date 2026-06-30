"use client";

import { useState, useTransition } from "react";
import { createWeddingWebsite } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";

export function CreateWebsiteButton({ projectId }: { projectId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createWeddingWebsite(projectId);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <Card className="px-6 py-12 text-center">
      <Eyebrow className="mb-2 block">Website</Eyebrow>
      <p className="mb-6 text-[15px] text-ink-muted">
        Create a shareable wedding website seeded from your project details. You can
        customize every section, pick a layout and palette, and publish when you are ready.
      </p>
      <Button type="button" onClick={handleCreate} disabled={isPending}>
        {isPending ? "Creating…" : "Create your wedding website"}
      </Button>
      {error ? (
        <p className="mt-4 text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
