export function formatPriceLevel(level?: string): string | null {
  if (!level || level === "PRICE_LEVEL_UNSPECIFIED") return null;

  const labels: Record<string, string> = {
    PRICE_LEVEL_FREE: "Free",
    PRICE_LEVEL_INEXPENSIVE: "$",
    PRICE_LEVEL_MODERATE: "$$",
    PRICE_LEVEL_EXPENSIVE: "$$$",
    PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
  };

  return labels[level] ?? null;
}
