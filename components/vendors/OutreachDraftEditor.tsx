"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  sendOutreach,
  updateOutreachDraft,
} from "@/app/(app)/projects/[projectId]/vendors/outreach/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

export type OutreachDraft = {
  id: string;
  subject: string | null;
  body: string;
  updated_at: string;
  status: "draft" | "failed";
  sendError: string | null;
  vendorName: string;
  vendorCategory: string | null;
};

export function OutreachDraftEditor({
  draft,
  gmailConnected,
  connectHref,
}: {
  draft: OutreachDraft;
  gmailConnected: boolean;
  connectHref: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [body, setBody] = useState(draft.body);
  const [error, setError] = useState<string | null>(draft.sendError);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isDirty =
    subject !== (draft.subject ?? "") || body !== draft.body;

  function handleSave(thenSend = false) {
    startTransition(async () => {
      setError(null);
      setSaved(false);

      const result = await updateOutreachDraft(draft.id, subject, body);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSaved(true);

      if (thenSend) {
        const sendResult = await sendOutreach(draft.id);
        if (!sendResult.ok) {
          setError(sendResult.error);
        }
      }

      router.refresh();
    });
  }

  function handleSend() {
    if (!gmailConnected) {
      setError("Connect Gmail before sending.");
      return;
    }

    if (isDirty) {
      handleSave(true);
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await sendOutreach(draft.id);
      if (!result.ok) {
        setError(result.error);
      }
      router.refresh();
    });
  }

  return (
    <Card
      className={cn(
        "p-6",
        draft.status === "failed" && "border-rosewood/40",
      )}
    >
      <header className="mb-5">
        <h3 className="text-[15px] font-medium text-ink">{draft.vendorName}</h3>
        <p className="mt-px text-[13px] text-muted">
          {draft.vendorCategory ?? "Vendor"}
          {draft.status === "failed" ? (
            <span className="text-rosewood"> · Send failed</span>
          ) : null}
        </p>
      </header>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor={`subject-${draft.id}`}
            className="text-sm font-medium text-ink"
          >
            Subject
          </label>
          <Input
            id={`subject-${draft.id}`}
            type="text"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setSaved(false);
            }}
            disabled={isPending}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={`body-${draft.id}`}
            className="text-sm font-medium text-ink"
          >
            Body
          </label>
          <Textarea
            id={`body-${draft.id}`}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setSaved(false);
            }}
            rows={10}
            disabled={isPending}
            className="leading-relaxed"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-hairline pt-5">
        <Button
          type="button"
          variant="default"
          onClick={() => handleSave(false)}
          disabled={isPending || !isDirty}
        >
          {isPending ? "Saving…" : "Save draft"}
        </Button>

        {gmailConnected ? (
          <Button
            type="button"
            variant="primary"
            onClick={handleSend}
            disabled={isPending}
          >
            {isPending ? "Sending…" : "Send"}
          </Button>
        ) : (
          <ButtonLink href={connectHref} variant="primary">
            Connect Gmail to send
          </ButtonLink>
        )}

        {saved && !isDirty ? (
          <span className="text-[13px] text-sage">Saved</span>
        ) : null}
        {error ? (
          <span className="text-sm text-rosewood">{error}</span>
        ) : null}
      </div>
    </Card>
  );
}
