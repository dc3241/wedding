/**
 * Anthropic list prices, in USD per million tokens == micro-dollars per token.
 * Source: platform.claude.com pricing (checked 2026-10-31). Update here if
 * ANTHROPIC_MODEL changes or Anthropic reprices; the usage ledger stores the
 * computed cost at write time, so old rows keep their historical cost.
 */
type ModelRates = {
  input: number;
  output: number;
  cacheWrite: number; // 5-minute ephemeral cache write
  cacheRead: number;
};

const SONNET: ModelRates = { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 };
const HAIKU: ModelRates = { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 };
const OPUS: ModelRates = { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 };

function ratesFor(model: string): ModelRates {
  const id = model.toLowerCase();
  if (id.includes("haiku")) return HAIKU;
  if (id.includes("opus")) return OPUS;
  // Sonnet is the default; unknown models bill at Sonnet rates rather than 0.
  return SONNET;
}

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
};

export function emptyTokenUsage(): TokenUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
  };
}

/** Cost in micro-dollars (USD x 1,000,000), rounded up. */
export function usageCostMicros(model: string, usage: TokenUsage): number {
  const r = ratesFor(model);
  const micros =
    usage.inputTokens * r.input +
    usage.outputTokens * r.output +
    usage.cacheCreationInputTokens * r.cacheWrite +
    usage.cacheReadInputTokens * r.cacheRead;
  return Math.ceil(micros);
}
