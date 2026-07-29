"use client";

import { weddingTemplateOptions } from "@/components/website/templates/registry";
import { weddingThemeOptions } from "@/components/website/themes";
import { cn } from "@/lib/cn";

type LookStepProps = {
  template: string;
  theme: string;
  onTemplateChange: (template: string) => void;
  onThemeChange: (theme: string) => void;
};

export function LookStep({
  template,
  theme,
  onTemplateChange,
  onThemeChange,
}: LookStepProps) {
  const templates = weddingTemplateOptions();
  const themes = weddingThemeOptions();

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <p className="mb-1.5 text-[13px] font-medium text-ink">Template</p>
        <p className="mb-3 text-[13px] text-muted">
          Personality and layout for your site.
        </p>
        <div className="flex flex-wrap gap-2">
          {templates.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onTemplateChange(option.key)}
              className={cn(
                "rounded-[var(--radius-pill)] px-3.5 py-2 text-[13px] font-semibold transition-colors",
                template === option.key
                  ? "bg-accent text-surface"
                  : "bg-well text-muted hover:text-ink",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[13px] font-medium text-ink">Palette</p>
        <p className="mb-3 text-[13px] text-muted">
          Colors that recolor every section on your site.
        </p>
        <div className="flex flex-wrap gap-3">
          {themes.map((option) => {
            const accent = String(option.cssVars["--ws-accent"] ?? "");
            const tint = String(option.cssVars["--ws-tint"] ?? "");
            const selected = theme === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onThemeChange(option.key)}
                className={cn(
                  "flex items-center gap-2.5 rounded-[var(--radius-inner)] px-3 py-2 text-left transition-shadow",
                  selected
                    ? "bg-accent-wash ring-2 ring-accent"
                    : "bg-well hover:ring-1 hover:ring-ring",
                )}
                aria-pressed={selected}
                aria-label={`${option.label} palette`}
              >
                <span
                  className="relative size-8 shrink-0 overflow-hidden rounded-full shadow-recessed"
                  style={{ background: tint }}
                  aria-hidden
                >
                  <span
                    className="absolute inset-1 rounded-full"
                    style={{ background: accent }}
                  />
                </span>
                <span
                  className={cn(
                    "text-[13px] font-semibold",
                    selected ? "text-ink" : "text-muted",
                  )}
                >
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
