"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import type { PublicRegistryItem } from "./types";
import { submitRegistryClaim } from "@/app/w/registry-claim-actions";
import { formatCurrency } from "@/lib/format-currency";
import { storeLabelFromUrl } from "@/lib/registry";

type InterstitialMode = "reserve" | "purchased" | null;

export function PublicRegistryCard({
  item,
  slug,
}: {
  item: PublicRegistryItem;
  slug: string;
}) {
  const router = useRouter();
  const formId = useId();
  const [imageFailed, setImageFailed] = useState(false);
  const [mode, setMode] = useState<InterstitialMode>(null);
  const [claimerName, setClaimerName] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const storeLabel = storeLabelFromUrl(item.buyUrl);
  const showImage = Boolean(item.imageUrl) && !imageFailed;
  const buyLabel = storeLabel ? `Buy at ${storeLabel}` : "Buy";
  const remaining = Math.max(0, item.quantityWanted - item.claimedQty);
  const fullyClaimed = remaining === 0;

  function openBuyUrl() {
    if (!item.buyUrl) return;
    window.open(item.buyUrl, "_blank", "noopener,noreferrer");
  }

  function handleReserveAndContinue() {
    setError(false);
    startTransition(async () => {
      const result = await submitRegistryClaim({
        slug,
        registryItemId: item.id,
        status: "reserved",
        claimerName: claimerName || undefined,
        honeypot,
      });
      if (!result.ok) {
        setError(true);
        return;
      }
      setMode(null);
      setClaimerName("");
      openBuyUrl();
      router.refresh();
    });
  }

  function handleJustBrowsing() {
    setMode(null);
    openBuyUrl();
  }

  function handleAlreadyBought() {
    setError(false);
    startTransition(async () => {
      const result = await submitRegistryClaim({
        slug,
        registryItemId: item.id,
        status: "purchased",
        claimerName: claimerName || undefined,
        honeypot,
      });
      if (!result.ok) {
        setError(true);
        return;
      }
      setMode(null);
      setClaimerName("");
      router.refresh();
    });
  }

  const statusLine =
    item.quantityWanted === 1
      ? item.claimedQty === 0
        ? "Asking for 1"
        : `Asking for 1 · ${item.claimedQty} reserved/purchased`
      : `Asking for ${item.quantityWanted} · ${item.claimedQty} reserved/purchased`;

  return (
    <article
      className="relative flex flex-col overflow-hidden rounded-[14px] border"
      style={{
        borderColor: "var(--ws-border)",
        background: "var(--ws-surface)",
      }}
    >
      <div
        className="relative aspect-[4/3] overflow-hidden"
        style={{ background: "var(--ws-tint)" }}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- hotlinked merchant images
          <img
            src={item.imageUrl!}
            alt=""
            className="size-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="text-[13px]" style={{ color: "var(--ws-muted)" }}>
              No image
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0 space-y-1.5">
          <h3
            className="line-clamp-2 text-[15px] font-medium leading-snug"
            style={{ color: "var(--ws-ink)" }}
          >
            {item.name}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {item.price != null ? (
              <p
                className="text-[15px] font-semibold tabular-nums"
                style={{ color: "var(--ws-ink)" }}
              >
                {formatCurrency(item.price)}
              </p>
            ) : null}
            {storeLabel ? (
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-[0.03em] uppercase"
                style={{
                  background: "var(--ws-tint)",
                  color: "var(--ws-muted)",
                }}
              >
                {storeLabel}
              </span>
            ) : null}
          </div>
          <p className="text-[13px]" style={{ color: "var(--ws-muted)" }}>
            {fullyClaimed ? "Fully reserved / purchased" : statusLine}
          </p>
        </div>

        {fullyClaimed ? (
          <p
            className="mt-auto rounded-full border px-4 py-2 text-center text-[13px] font-semibold"
            style={{
              borderColor: "var(--ws-border)",
              background: "var(--ws-tint)",
              color: "var(--ws-muted)",
            }}
          >
            Fully reserved / purchased
          </p>
        ) : (
          <div className="mt-auto space-y-2">
            {item.buyUrl ? (
              <button
                type="button"
                onClick={() => {
                  setError(false);
                  setMode("reserve");
                }}
                disabled={isPending}
                className="inline-flex w-full items-center justify-center rounded-full border px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{
                  borderColor: "var(--ws-accent)",
                  background: "var(--ws-accent)",
                  color: "var(--ws-surface)",
                }}
              >
                {buyLabel}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setError(false);
                setMode("purchased");
              }}
              disabled={isPending}
              className="inline-flex w-full items-center justify-center rounded-full border px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{
                borderColor: "var(--ws-border)",
                background: "var(--ws-surface)",
                color: "var(--ws-ink)",
              }}
            >
              I already bought this
            </button>
          </div>
        )}
      </div>

      {mode ? (
        <div
          className="absolute inset-0 z-10 flex items-end bg-black/35 p-3 sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${formId}-title`}
        >
          <div
            className="w-full rounded-[14px] border p-4 shadow-lg"
            style={{
              borderColor: "var(--ws-border)",
              background: "var(--ws-surface)",
              color: "var(--ws-ink)",
            }}
          >
            <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden>
              <label htmlFor={`${formId}-website`}>Website</label>
              <input
                id={`${formId}-website`}
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <h4
              id={`${formId}-title`}
              className="font-serif-display text-[20px] tracking-[0.005em]"
            >
              {mode === "reserve"
                ? storeLabel
                  ? `Opening ${storeLabel}`
                  : "Opening store"
                : "Mark as purchased"}
            </h4>
            <p className="mt-2 text-[14px]" style={{ color: "var(--ws-muted)" }}>
              {mode === "reserve"
                ? `Mark this reserved so no one else buys it?`
                : "Let the couple know you’ve already bought this gift."}
            </p>

            <label
              htmlFor={`${formId}-name`}
              className="mt-4 mb-1.5 block text-[13px] font-medium"
              style={{ color: "var(--ws-muted)" }}
            >
              Your name <span className="font-normal">(optional)</span>
            </label>
            <input
              id={`${formId}-name`}
              type="text"
              maxLength={120}
              value={claimerName}
              onChange={(e) => setClaimerName(e.target.value)}
              disabled={isPending}
              className="w-full rounded-lg border px-3 py-2 text-[15px] outline-none"
              style={{
                borderColor: "var(--ws-border)",
                background: "var(--ws-bg)",
                color: "var(--ws-ink)",
              }}
            />

            {error ? (
              <p
                className="mt-2 text-[13px]"
                style={{ color: "var(--ws-accent-deep)" }}
                role="alert"
              >
                Couldn’t save that — try again.
              </p>
            ) : null}

            <div className="mt-4 flex flex-col gap-2">
              {mode === "reserve" ? (
                <>
                  <button
                    type="button"
                    onClick={handleReserveAndContinue}
                    disabled={isPending}
                    className="rounded-full px-4 py-2.5 text-[13px] font-semibold disabled:opacity-50"
                    style={{
                      background: "var(--ws-accent)",
                      color: "var(--ws-surface)",
                    }}
                  >
                    {isPending ? "Saving…" : "Reserve & continue"}
                  </button>
                  <button
                    type="button"
                    onClick={handleJustBrowsing}
                    disabled={isPending}
                    className="rounded-full border px-4 py-2.5 text-[13px] font-semibold disabled:opacity-50"
                    style={{
                      borderColor: "var(--ws-border)",
                      color: "var(--ws-ink)",
                    }}
                  >
                    Just browsing
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleAlreadyBought}
                  disabled={isPending}
                  className="rounded-full px-4 py-2.5 text-[13px] font-semibold disabled:opacity-50"
                  style={{
                    background: "var(--ws-accent)",
                    color: "var(--ws-surface)",
                  }}
                >
                  {isPending ? "Saving…" : "Mark purchased"}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMode(null);
                  setError(false);
                }}
                disabled={isPending}
                className="text-[13px] font-medium disabled:opacity-50"
                style={{ color: "var(--ws-muted)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
