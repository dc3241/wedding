"use client";

import {
  generateOutreachDraft,
  saveOutreachTarget,
  setOutreachSent,
} from "@/app/(admin)/admin/planner/outreach/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  AUDIENCE_LABEL,
  CHANNEL_LABEL,
  OUTREACH_AUDIENCES,
  OUTREACH_CHANNELS,
  outreachCopyText,
  outreachNamePlaceholder,
  type OutreachAudience,
  type OutreachChannel,
  type OutreachTarget,
} from "@/lib/admin/outreach";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Props = {
  rows: OutreachTarget[];
};

export function OutreachBoard({ rows }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {OUTREACH_AUDIENCES.map((audience) => {
        const group = rows
          .filter((row) => row.audience === audience)
          .sort((a, b) => a.position - b.position);
        const sent = group.filter((row) => row.sent_at).length;
        return (
          <Card key={audience} className="px-5 py-5">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                {AUDIENCE_LABEL[audience]}
              </h2>
              <p className="text-[13px] tabular-nums text-muted">
                {sent}/{group.length} sent
              </p>
            </div>
            <ul className="flex flex-col gap-3">
              {group.map((row) => (
                <li key={row.id}>
                  <OutreachRow row={row} />
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

function OutreachRow({ row }: { row: OutreachTarget }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"generate" | "save" | null>(null);
  const [name, setName] = useState(row.name);
  const [channel, setChannel] = useState<OutreachChannel>(row.channel);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(Boolean(row.sent_at));

  useEffect(() => {
    setName(row.name);
    setChannel(row.channel);
    setSent(Boolean(row.sent_at));
  }, [row.name, row.channel, row.sent_at, row.id]);

  const dirty = name.trim() !== row.name || channel !== row.channel;
  const copyText = dirty ? "" : outreachCopyText(row);

  function persist(nextName: string, nextChannel: OutreachChannel) {
    setError(null);
    setBusy("save");
    startTransition(async () => {
      const result = await saveOutreachTarget(row.id, {
        name: nextName,
        channel: nextChannel,
      });
      setBusy(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "rounded-[var(--radius-inner)] bg-well px-3.5 py-3 shadow-recessed",
        pending && "opacity-70",
      )}
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <label className="flex shrink-0 items-center gap-2 text-[13px] text-muted">
          <input
            type="checkbox"
            checked={sent}
            disabled={pending}
            onChange={(event) => {
              const next = event.target.checked;
              setSent(next);
              setError(null);
              setBusy("save");
              startTransition(async () => {
                const result = await setOutreachSent(row.id, next);
                setBusy(null);
                if (!result.ok) {
                  setSent(!next);
                  setError(result.error);
                  return;
                }
                router.refresh();
              });
            }}
            className="size-4 shrink-0 rounded border-ring accent-accent"
            aria-label={`Sent, ${AUDIENCE_LABEL[row.audience]} ${row.position}`}
          />
          <span className={sent ? "font-medium text-sage" : undefined}>Sent</span>
        </label>

        <div className="w-full sm:w-36">
          <Select
            aria-label={`Channel for ${AUDIENCE_LABEL[row.audience]} ${row.position}`}
            value={channel}
            disabled={pending}
            onChange={(event) => {
              const next = event.target.value;
              if (next !== "email" && next !== "tiktok") return;
              setChannel(next);
              persist(name, next);
            }}
          >
            {OUTREACH_CHANNELS.map((option) => (
              <option key={option} value={option}>
                {CHANNEL_LABEL[option]}
              </option>
            ))}
          </Select>
        </div>

        <input
          value={name}
          disabled={pending}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => {
            if (name.trim() === row.name) return;
            persist(name, channel);
          }}
          placeholder={outreachNamePlaceholder(row.audience, channel)}
          aria-label={`${AUDIENCE_LABEL[row.audience]} ${row.position}`}
          className="w-full min-w-0 flex-1 rounded-[var(--radius-inner)] border border-transparent bg-surface px-3 py-1.5 text-[15px] font-medium text-ink placeholder:text-muted"
        />

        <Button
          variant="primary"
          className="px-4 py-1.5 text-[14px]"
          disabled={pending || name.trim().length === 0}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setError(null);
            setCopied(false);
            setBusy("generate");
            startTransition(async () => {
              const result = await generateOutreachDraft(row.id, { name, channel });
              setBusy(null);
              if (!result.ok) {
                setError(result.error);
                router.refresh();
                return;
              }
              router.refresh();
            });
          }}
        >
          {busy === "generate" ? "Writing…" : row.body && !dirty ? "Regenerate" : "Generate"}
        </Button>
      </div>

      {dirty && row.body ? (
        <p className="mt-2.5 text-[13px] text-muted">
          Name or channel changed. Generate again before you copy.
        </p>
      ) : null}

      {copyText ? (
        <DraftBlock
          audience={row.audience}
          position={row.position}
          channel={row.channel}
          subject={row.subject}
          body={row.body ?? ""}
          copied={copied}
          disabled={pending}
          onCopy={() => {
            setError(null);
            void navigator.clipboard.writeText(copyText).then(
              () => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              },
              () => setError("Could not copy. Select the message and copy it yourself."),
            );
          }}
        />
      ) : null}

      {error ? <p className="mt-2.5 text-[13px] text-rosewood">{error}</p> : null}
    </div>
  );
}

function DraftBlock({
  audience,
  position,
  channel,
  subject,
  body,
  copied,
  disabled,
  onCopy,
}: {
  audience: OutreachAudience;
  position: number;
  channel: OutreachChannel;
  subject: string | null;
  body: string;
  copied: boolean;
  disabled: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="mt-3 border-t border-hairline pt-3">
      {channel === "email" && subject ? (
        <p className="mb-2 text-[15px] font-semibold text-ink">{subject}</p>
      ) : null}
      <p className="whitespace-pre-wrap text-[15px] font-medium text-ink">{body}</p>
      <div className="mt-3">
        <Button
          variant="default"
          className="px-4 py-1.5 text-[14px]"
          disabled={disabled}
          onClick={onCopy}
          aria-label={`Copy message for ${AUDIENCE_LABEL[audience]} ${position}`}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
