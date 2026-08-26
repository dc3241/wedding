import type { ReactNode } from "react";

/**
 * Minimal **bold** → <strong> for assistant chat bubbles.
 * No other markdown. Safe for parents that use whitespace-pre-wrap.
 */
export function formatBoldText(text: string): ReactNode {
  if (!text.includes("**")) return text;

  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  if (segments.length === 1) return text;

  return segments.map((segment, i) => {
    if (
      segment.length > 4 &&
      segment.startsWith("**") &&
      segment.endsWith("**")
    ) {
      return (
        <strong key={i} className="font-semibold">
          {segment.slice(2, -2)}
        </strong>
      );
    }
    return segment;
  });
}
