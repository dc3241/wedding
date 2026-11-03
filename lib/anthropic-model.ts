/** Anthropic Messages API model — override via ANTHROPIC_MODEL in .env.local */
export const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

/**
 * Cheap tier for extraction / classification (quote parsing, etc.).
 * Haiku rates are already in lib/assistant/model-pricing.ts.
 */
export const ANTHROPIC_MODEL_FAST =
  process.env.ANTHROPIC_MODEL_FAST ?? "claude-haiku-4-5";
