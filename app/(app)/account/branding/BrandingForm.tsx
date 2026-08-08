"use client";

import { useRef, useState, useTransition } from "react";
import {
  updateAccountBranding,
  type UpdateAccountBrandingInput,
} from "@/app/(app)/account/branding/actions";
import {
  BRAND_LOGO_ACCEPT,
  uploadBrandLogo,
} from "@/app/(app)/account/branding/brand-media";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/ui/topbar";
import { BRAND_ACCENT_HEX, BRAND_NAME_MAX_LENGTH } from "@/lib/branding/types";
import { cn } from "@/lib/cn";

type BrandingFormProps = {
  accountId: string;
  initial: UpdateAccountBrandingInput;
};

const PRESET_SWATCHES = [
  "#C0396B",
  "#A13F5C",
  "#3D5A80",
  "#2F6B54",
  "#5C4B7A",
  "#1F3A4C",
] as const;

export function BrandingForm({ accountId, initial }: BrandingFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [brandName, setBrandName] = useState(initial.brandName ?? "");
  const [brandLogoUrl, setBrandLogoUrl] = useState(initial.brandLogoUrl);
  const [brandAccentColor, setBrandAccentColor] = useState(
    initial.brandAccentColor ?? "#C0396B",
  );
  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState(
    initial.whiteLabelEnabled,
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const accentValid = BRAND_ACCENT_HEX.test(brandAccentColor);
  const previewAccent = accentValid ? brandAccentColor : "#C0396B";
  const previewName = brandName.trim() || "Your business name";

  function pickFile() {
    inputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setSaved(false);

    const uploaded = await uploadBrandLogo(accountId, file);
    if ("error" in uploaded) {
      setError(uploaded.error);
      return;
    }
    setBrandLogoUrl(uploaded.url);
  }

  function handleSave() {
    setError(null);
    setSaved(false);

    if (brandAccentColor.trim() && !BRAND_ACCENT_HEX.test(brandAccentColor.trim())) {
      setError("Accent color must be a 6-digit hex value (e.g. #C0396B).");
      return;
    }

    startTransition(async () => {
      const result = await updateAccountBranding(accountId, {
        brandName: brandName.trim() || null,
        brandLogoUrl,
        brandAccentColor: brandAccentColor.trim() || null,
        whiteLabelEnabled,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="mt-6 space-y-6">
      <Card className="p-6">
        <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          Live preview
        </h2>
        <p className="mt-1 text-[13px] text-muted">
          How invited couples and collaborators see the nav when white-label is
          on.
        </p>
        <div
          className="mt-4 overflow-hidden rounded-[var(--radius-inner)] border border-hairline bg-canvas shadow-recessed"
          style={{ ["--accent" as string]: previewAccent }}
        >
          <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              {brandLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- public brand-media URL
                <img
                  src={brandLogoUrl}
                  alt=""
                  className="h-7 w-auto max-w-[160px] object-contain"
                />
              ) : (
                <Wordmark className="h-7" />
              )}
              {brandName.trim() ? (
                <span className="truncate text-[15px] font-semibold text-ink">
                  {previewName}
                </span>
              ) : null}
            </div>
            <span className="rounded-[var(--radius-pill)] bg-accent-wash px-3 py-1 text-[13px] font-medium text-accent">
              Billing
            </span>
          </div>
          <div className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-[var(--radius-pill)] bg-accent px-3 py-1.5 text-[13px] font-semibold text-surface">
                Accent button
              </span>
              <span className="rounded-[var(--radius-pill)] bg-well px-3 py-1.5 text-[13px] font-medium text-sage">
                Done
              </span>
              <span className="rounded-[var(--radius-pill)] bg-clay-wash px-3 py-1.5 text-[13px] font-medium text-clay">
                In progress
              </span>
              <span className="rounded-[var(--radius-pill)] bg-rosewood-wash px-3 py-1.5 text-[13px] font-medium text-rosewood">
                Overdue
              </span>
            </div>
            <p className="mt-3 text-[13px] text-muted">
              Status colors stay fixed — only accent changes with your brand.
            </p>
          </div>
        </div>
      </Card>

      <Card className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
              White-label
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              Opt in when logo, name, and color are ready. Fields save either
              way.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-3">
            <span className="text-[14px] font-medium text-ink">
              {whiteLabelEnabled ? "Enabled" : "Disabled"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={whiteLabelEnabled}
              onClick={() => {
                setWhiteLabelEnabled((v) => !v);
                setSaved(false);
              }}
              className={cn(
                "relative h-7 w-12 shrink-0 rounded-[var(--radius-pill)] transition-colors",
                whiteLabelEnabled ? "bg-accent" : "bg-ring",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 size-6 rounded-full bg-surface shadow-raised transition-transform",
                  whiteLabelEnabled && "translate-x-5",
                )}
              />
            </button>
          </label>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="brand-name"
            className="block text-[14px] font-medium text-ink"
          >
            Business name
          </label>
          <Input
            id="brand-name"
            value={brandName}
            maxLength={BRAND_NAME_MAX_LENGTH}
            placeholder="Events by Jordyn"
            onChange={(e) => {
              setBrandName(e.target.value);
              setSaved(false);
            }}
          />
          <p className="text-[13px] text-muted">
            Shown in the nav and page titles for invited members. Max{" "}
            {BRAND_NAME_MAX_LENGTH} characters.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-[14px] font-medium text-ink">Logo</p>
          <input
            ref={inputRef}
            type="file"
            accept={BRAND_LOGO_ACCEPT}
            className="sr-only"
            onChange={handleFileSelected}
          />
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex h-20 w-40 items-center justify-center overflow-hidden rounded-[var(--radius-inner)] bg-well shadow-recessed">
              {brandLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- public brand-media URL
                <img
                  src={brandLogoUrl}
                  alt=""
                  className="max-h-full max-w-full object-contain p-2"
                />
              ) : (
                <span className="px-3 text-center text-[13px] text-muted">
                  No logo yet
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="default"
                onClick={pickFile}
                disabled={isPending}
              >
                {brandLogoUrl ? "Replace" : "Upload"}
              </Button>
              {brandLogoUrl ? (
                <Button
                  type="button"
                  variant="default"
                  onClick={() => {
                    setBrandLogoUrl(null);
                    setSaved(false);
                  }}
                  disabled={isPending}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
          <p className="text-[13px] text-muted">
            PNG, JPG, or WebP. Max 5 MB. Falls back to the First Look mark if
            empty.
          </p>
        </div>

        <div className="space-y-3">
          <label
            htmlFor="brand-accent"
            className="block text-[14px] font-medium text-ink"
          >
            Accent color
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="size-9 shrink-0 rounded-[var(--radius-inner)] border border-ring shadow-recessed"
              style={{ backgroundColor: previewAccent }}
              aria-hidden
            />
            <Input
              id="brand-accent"
              value={brandAccentColor}
              placeholder="#C0396B"
              className="max-w-[10rem] font-mono text-[14px]"
              onChange={(e) => {
                setBrandAccentColor(e.target.value);
                setSaved(false);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                title={hex}
                aria-label={`Use ${hex}`}
                onClick={() => {
                  setBrandAccentColor(hex);
                  setSaved(false);
                }}
                className={cn(
                  "size-8 rounded-[var(--radius-inner)] border border-ring transition-transform hover:scale-105",
                  brandAccentColor.toLowerCase() === hex.toLowerCase() &&
                    "outline-2 outline-offset-2 outline-accent",
                )}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
          <p className="text-[13px] text-muted">
            Hex only (<code className="text-[12px]">#RRGGBB</code>). Overrides
            selection and primary buttons — not status colors.
          </p>
        </div>

        {error ? (
          <p className="text-[14px] font-medium text-rosewood" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="text-[14px] font-medium text-sage">Saved.</p>
        ) : null}

        <Button
          type="button"
          variant="primary"
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? "Saving…" : "Save branding"}
        </Button>
      </Card>
    </div>
  );
}
