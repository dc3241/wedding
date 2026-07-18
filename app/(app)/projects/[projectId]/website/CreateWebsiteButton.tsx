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
    <Card className="px-8 py-12 text-center">
      <Eyebrow className="mb-2 block">Website</Eyebrow>
      <h1 className="font-display text-[32px] font-extrabold tracking-[-0.03em] text-ink md:text-[42px]">
        Your wedding website
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-[15px] font-medium text-muted">
        Create a shareable site seeded from your project details. Customize every
        section, pick a layout and palette, and publish when you are ready.
      </p>
      <div className="mt-6">
        <Button type="button" onClick={handleCreate} disabled={isPending}>
          {isPending ? "Creating…" : "Create your wedding website"}
        </Button>
      </div>
      {error ? (
        <p className="mt-4 text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
