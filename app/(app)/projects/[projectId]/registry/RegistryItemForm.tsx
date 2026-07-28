"use client";

import { useId, useState, useTransition } from "react";
import { addRegistryItem, fetchRegistryItemPreview, updateRegistryItem } from "./actions";
import type { RegistryItem, RegistryItemFields } from "./types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type RegistryItemFormProps = {
  projectId: string;
  mode: "add" | "edit";
  initial?: RegistryItem;
  onDone?: () => void;
  onCancel?: () => void;
};

function fieldsFromState(input: {
  name: string;
  price: string;
  imageUrl: string;
  buyUrl: string;
  quantityWanted: string;
  note: string;
}): RegistryItemFields {
  const priceRaw = input.price.trim();
  return {
    name: input.name,
    price: priceRaw === "" ? null : Number(priceRaw),
    image_url: input.imageUrl,
    buy_url: input.buyUrl,
    quantity_wanted: Number(input.quantityWanted),
    note: input.note,
  };
}

export function RegistryItemForm({
  projectId,
  mode,
  initial,
  onDone,
  onCancel,
}: RegistryItemFormProps) {
  const formId = useId();
  const [isPending, startTransition] = useTransition();
  const [isFetching, startFetchTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [pasteUrl, setPasteUrl] = useState("");
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(
    initial?.price != null ? String(initial.price) : "",
  );
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [buyUrl, setBuyUrl] = useState(initial?.buy_url ?? "");
  const [quantityWanted, setQuantityWanted] = useState(
    String(initial?.quantity_wanted ?? 1),
  );
  const [note, setNote] = useState(initial?.note ?? "");

  function handleFetchDetails() {
    const url = pasteUrl.trim() || buyUrl.trim();
    if (!url) return;

    startFetchTransition(async () => {
      const preview = await fetchRegistryItemPreview(url);
      setBuyUrl((current) => current.trim() || url);
      if (preview.name) setName(preview.name);
      if (preview.imageUrl) setImageUrl(preview.imageUrl);
      if (preview.price != null) setPrice(String(preview.price));
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = fieldsFromState({
      name,
      price,
      imageUrl,
      buyUrl,
      quantityWanted,
      note,
    });

    if (!fields.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (
      fields.quantity_wanted !== undefined &&
      fields.quantity_wanted < 1
    ) {
      setError("Quantity wanted must be at least 1.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        if (mode === "add") {
          await addRegistryItem(projectId, fields);
          setPasteUrl("");
          setName("");
          setPrice("");
          setImageUrl("");
          setBuyUrl("");
          setQuantityWanted("1");
          setNote("");
        } else if (initial) {
          await updateRegistryItem(initial.id, fields);
        }
        onDone?.();
      } catch {
        setError("Could not save this gift. Try again.");
      }
    });
  }

  const busy = isPending || isFetching;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3 rounded-[var(--radius-inner)] bg-well px-3.5 py-3 shadow-recessed">
        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-paste`}
            className="text-[14px] font-medium text-ink"
          >
            Paste a product link
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id={`${formId}-paste`}
              type="url"
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              placeholder="https://"
              disabled={busy}
              className="bg-surface"
            />
            <Button
              type="button"
              variant="default"
              onClick={handleFetchDetails}
              disabled={busy || !(pasteUrl.trim() || buyUrl.trim())}
              className="shrink-0"
            >
              {isFetching ? "Fetching…" : "Fetch details"}
            </Button>
          </div>
        </div>
        <p className="text-[13px] text-muted">
          Works best for boutique/Shopify stores; big retailers may return
          partial data to fix by hand.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label
            htmlFor={`${formId}-name`}
            className="text-[14px] font-medium text-ink"
          >
            Name
          </label>
          <Input
            id={`${formId}-name`}
            name="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ceramic dinner plates"
            disabled={busy}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-price`}
            className="text-[14px] font-medium text-ink"
          >
            Price
          </label>
          <Input
            id={`${formId}-price`}
            name="price"
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Optional"
            disabled={busy}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-qty`}
            className="text-[14px] font-medium text-ink"
          >
            Quantity wanted
          </label>
          <Input
            id={`${formId}-qty`}
            name="quantity_wanted"
            type="number"
            min={1}
            step={1}
            value={quantityWanted}
            onChange={(e) => setQuantityWanted(e.target.value)}
            disabled={busy}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label
            htmlFor={`${formId}-image`}
            className="text-[14px] font-medium text-ink"
          >
            Image URL
          </label>
          <Input
            id={`${formId}-image`}
            name="image_url"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://"
            disabled={busy}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label
            htmlFor={`${formId}-buy`}
            className="text-[14px] font-medium text-ink"
          >
            Where to buy
          </label>
          <Input
            id={`${formId}-buy`}
            name="buy_url"
            type="url"
            value={buyUrl}
            onChange={(e) => setBuyUrl(e.target.value)}
            placeholder="https://"
            disabled={busy}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label
            htmlFor={`${formId}-note`}
            className="text-[14px] font-medium text-ink"
          >
            Note
          </label>
          <Textarea
            id={`${formId}-note`}
            name="note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Color, size, or preference"
            disabled={busy}
          />
        </div>
      </div>

      {error ? (
        <p className="text-[13px] font-medium text-rosewood">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={busy}>
          {isPending
            ? "Saving…"
            : mode === "add"
              ? "Add gift"
              : "Save changes"}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function AddRegistryItemPanel({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        Add item
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        Paste a link to prefill, then confirm before saving.
      </p>
      <div className="mt-4">
        <RegistryItemForm
          projectId={projectId}
          mode="add"
          onDone={onClose}
          onCancel={onClose}
        />
      </div>
    </Card>
  );
}
