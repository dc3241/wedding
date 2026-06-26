"use client";

import { useTransition } from "react";
import { addNote } from "./actions";
import { Button } from "@/components/ui/button";

export function AddNoteButton({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await addNote(projectId);
    });
  }

  return (
    <Button
      type="button"
      variant="primary"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? "Adding…" : "Add note"}
    </Button>
  );
}
