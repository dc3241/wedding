"use client";

import { useState, useTransition } from "react";
import {
  deleteClaim,
  deleteRegistryItem,
  updateClaimStatus,
} from "./actions";
import { RegistryItemForm } from "./RegistryItemForm";
import type { RegistryClaim, RegistryItem } from "./types";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format-currency";
import { storeLabelFromUrl } from "@/lib/registry";

export function RegistryItemCard({
  projectId,
  item,
  claims,
}: {
  projectId: string;
  item: RegistryItem;
  claims: RegistryClaim[];
}) {
  const [editing, setEditing] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const storeLabel = storeLabelFromUrl(item.buy_url);
  const showImage = Boolean(item.image_url) && !imageFailed;
  const claimedQty = claims.reduce((sum, c) => sum + c.quantity, 0);
  const remaining = Math.max(0, item.quantity_wanted - claimedQty);

  function handleDelete() {
    if (!window.confirm(`Remove “${item.name}” from your registry?`)) return;
    startTransition(async () => {
      await deleteRegistryItem(item.id);
    });
  }

  function handleFlipStatus(claim: RegistryClaim) {
    const next = claim.status === "reserved" ? "purchased" : "reserved";
    startTransition(async () => {
      await updateClaimStatus(claim.id, next);
    });
  }

  function handleRemoveClaim(claim: RegistryClaim) {
    if (!window.confirm("Remove this claim?")) return;
    startTransition(async () => {
      await deleteClaim(claim.id);
    });
  }

  if (editing) {
    return (
      <Card className={cn("p-5", isPending && "opacity-60")}>
        <h3 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          Edit item
        </h3>
        <div className="mt-4">
          <RegistryItemForm
            projectId={projectId}
            mode="edit"
            initial={item}
            onDone={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "flex flex-col overflow-hidden p-0",
        isPending && "opacity-60",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-well shadow-recessed">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- hotlinked merchant images; no upload CDN in v1
          <img
            src={item.image_url!}
            alt=""
            className="size-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="text-[13px] font-medium text-muted">No image</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0 space-y-1.5">
          <h3 className="line-clamp-2 text-[15px] font-medium leading-snug text-ink">
            {item.name}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {item.price != null ? (
              <p className="text-[15px] font-semibold tabular-nums text-ink">
                {formatCurrency(item.price)}
              </p>
            ) : null}
            {storeLabel ? <Pill variant="default">{storeLabel}</Pill> : null}
            <span className="text-[13px] text-muted">
              {remaining === 0
                ? "Fully claimed"
                : `Want ${item.quantity_wanted} · ${claimedQty} claimed`}
            </span>
          </div>
          {item.note ? (
            <p className="line-clamp-2 text-[13px] text-muted">{item.note}</p>
          ) : null}
        </div>

        {claims.length > 0 ? (
          <ul className="space-y-2 rounded-[var(--radius-inner)] bg-well p-3 shadow-recessed">
            {claims.map((claim) => (
              <li
                key={claim.id}
                className="flex flex-wrap items-center gap-2 border-b border-hairline pb-2 last:border-b-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">
                    {claim.claimer_name?.trim() || "Anonymous guest"}
                  </p>
                  <p className="text-[12px] text-muted">
                    Qty {claim.quantity} · {claim.status}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleFlipStatus(claim)}
                  disabled={isPending}
                  className="text-[12px] font-semibold text-accent hover:opacity-80 disabled:opacity-50"
                >
                  {claim.status === "reserved"
                    ? "Mark purchased"
                    : "Mark reserved"}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveClaim(claim)}
                  disabled={isPending}
                  className="text-[12px] font-medium text-muted transition-colors hover:text-rosewood disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-auto flex items-center gap-3 border-t border-hairline pt-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={isPending}
            className="text-[13px] font-medium text-muted transition-colors hover:text-ink focus-visible:text-ink disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-[13px] font-medium text-muted transition-colors hover:text-rosewood focus-visible:text-rosewood disabled:opacity-50"
          >
            Delete
          </button>
          {item.buy_url ? (
            <a
              href={item.buy_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-[13px] font-semibold text-accent hover:opacity-80"
            >
              View
            </a>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
